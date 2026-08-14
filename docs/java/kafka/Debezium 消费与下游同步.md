把 Debezium 产出的变更可靠同步到下游的工程实践。文中以同步 Elasticsearch 为例展开，顺序、合并、容错这套机制同样适用于其他下游（关系库、缓存、搜索索引等）。CDC 数据消费有三个绕不开的问题：

1. 同一行高频变更
2. 消费端乱序
3. 外部系统写入失败

接下来将围绕顺序、降频、容错三件事做说明，给出可落地的实现与避坑点。阅读前假设你已按 [PostgreSQL 连接器](./PostgreSQL%20连接器.md) 跑通了变更投递，拿到了形如 `pgdb.public.products` 的数据 topic。

## 顺序与幂等：两个前提

### 顺序靠分区与位移

Debezium 默认用主键做消息 key，Kafka 按 key 哈希分区，同一主键的所有变更落同一分区，分区内按位移（offset）单调递增保序。消费端按位移顺序读，拿到的就是变更发生的真实先后。

不要用消息里的时间戳排序：

- `source.ts_ns` 精度只到微秒，同一事务或同一微秒内多条变更时间戳相同，无法区分。
- 跨分区、跨实例时钟不同步，时间戳不可比。
- 位移是分区内唯一、单调、确定的权威顺序。

`source.lsn`（PostgreSQL 的 WAL 日志序列号）单调递增，可用于离线对账，但在线消费仍以位移为准。顺序的完整机制（同 key 同分区、无主键表的坑、`message.key.columns`）见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#消费端顺序保证与下游同步)。

### 下游写入必须幂等

无论怎么设计，崩溃、重平衡、重放都会导致同一条变更被消费多次。下游写入必须幂等：Elasticsearch 用主键当 `_id`，`op=c/u` 用 `after` 整行覆盖，`op=d` 删文档。重复消费靠主键覆盖兜底，最终一致。这是后面所有容错设计的安全网。

## 降频：窗口合并

### 为什么需要

同一行一秒内可能改几十次，Kafka 里就有几十条消息。全量写 Elasticsearch 是写放大，且大多数中间状态下游根本不关心，只要最终值。窗口合并把同一 key 在短窗口内的多条变更压成最后一条，窗口结束只写一次。

### 合并的本质

per-key 缓冲最新值，窗口到期批量写出：

1. 消费到一条变更，按 key 更新缓冲区里该 key 的最新值（旧值被覆盖）。
2. 窗口到期，把缓冲区所有 key 的最新值批量写下游。
3. 写成功后提交位移，清空缓冲区。

合并的前提是同一 key 同一分区（顺序保证已解决），否则窗口内的先后无法确定。

### 位移提交的安全模型（关键坑）

这是最容易做错、会丢数据的地方。Kafka 的位移是**分区级连续**的，不是 per-key。一个分区内往往混着多个 key，比如位移序列 `k1@5, k2@6, k1@7, k2@8`。提交位移 N 的语义是"分区里 ≤ N 的消息全部处理完了"，**不能跳**。

所以不能因为 k1 最新是 @7 就把位移提到 7，因为 k2@6 可能还没写。正确的安全模型只有两条路：

- **幂等写入加写成功才提交**：一批最新值全写完下游，全部成功后再提交本批消费到的分区最大位移。崩溃在中间未提交的部分会重放，靠下游幂等兜底，不丢不重。这是 at-least-once。
- **用 Kafka Streams 或 Flink**：内置状态存储、位移管理、exactly-once，把这套全包了。

## 手写消费者实现

单分区、消费量不大的场景，手写即可。关闭自动提交，攒一批写完再手动提交：

```java
// 窗口长度
Duration window = Duration.ofMillis(500);
// 键为业务主键，值为该行最新数据；同一行的多次变更互相覆盖
Map<String, JsonNode> latest = new HashMap<>();
// 本分区已读到的最新位移
long maxOffset = -1;
long lastFlush = System.currentTimeMillis();

while (running) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> r : records) {
        latest.put(r.key(), parseAfter(r.value()));
        maxOffset = r.offset();
    }
    boolean windowUp = System.currentTimeMillis() - lastFlush >= window.toMillis();
    if (!latest.isEmpty() && windowUp) {
        bulkUpsertToEs(latest);      // 批量写入下游，按主键幂等覆盖
        consumer.commitSync();       // 全部写成功后再提交位移，保证不丢
        latest.clear();
        lastFlush = System.currentTimeMillis();
    }
}
```

关键配置与要点：

- `enable.auto.commit=false`，只在批量写下游成功后手动 `commitSync`。
- 上面是单分区写法。**多分区要按 `TopicPartition` 分别记最大位移**，提交时传 `Map<TopicPartition, OffsetAndMetadata>`，每个分区只提自己已写完的位移。
- 幂等 upsert 是安全网：崩溃重放未提交的部分只是重写一遍，不会错。
- 窗口越长、合并越多、写下游越少，但崩溃重放的范围也越大。一般在 200ms 到 1s 之间权衡。

## Kafka Streams 实现

规模上来或要求强一致，用 Kafka Streams 的窗口聚合，框架自动管位移、状态、容错：

```java
StreamsBuilder builder = new StreamsBuilder();
builder.stream("pgdb.public.products", Consumed.with(keySerde, valueSerde))
    .groupByKey()
    // 500ms 窗口，不等待迟到数据
    .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMillis(500), Duration.ZERO))
    // 窗口内同一行只保留最后一条
    .reduce((older, newer) -> newer)
    .toStream()
    .filter((windowedKey, latest) -> latest != null)
    .foreach((windowedKey, latest) -> upsertToEs(latest));   // 窗口关闭后按主键写入下游

Properties props = new Properties();
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);   // 精确一次
```

`TimeWindows.ofSizeAndGrace(..., Duration.ZERO)` 表示窗口到点立即关闭、不等待迟到数据。崩溃后从 RocksDB 状态加 checkpoint 恢复，不丢不重。但这里用 `foreach` 写 Elasticsearch 有个陷阱，下面专门讲。

## 容错：外部副作用是最大坑

### foreach 写外部系统不在事务里

EOS（`exactly_once_v2`）保证的是 Kafka 内部"读、算、写回 topic、状态变更"这一套原子化。`foreach` 写 Elasticsearch 是事务边界之外的副作用，不享受这个保证：

- 失败时 Kafka 这边事务 abort、状态回滚，但 **ES 可能已经写了**（或写了一半），两边不一致。
- 重放时重新写 ES，只有靠幂等 upsert 才能最终收敛。
- 所以开 EOS 不等于"写 ES 也精确一次"。

更糟的是，`foreach` 里抛异常**默认没有自动重试**。Kafka Streams 自带的两个异常处理器都救不了这种：

- `default.deserialization.exception.handler` 只管反序列化。
- `default.production.exception.handler` 只管往 Kafka 写记录的生产异常。

用户代码里写 ES 失败，异常冒泡到 Streams 线程，交给 `StreamsUncaughtExceptionHandler`，默认策略是 **SHUTDOWN_CLIENT**：直接关闭这个 Streams 客户端，应用挂掉。既不重试也不跳过。

**补单靠重放，不靠重试**。把 handler 换成换线程继续，新线程会从上次已提交位移恢复：

```java
kafkaStreams.setUncaughtExceptionHandler(e ->
    StreamsUncaughtExceptionHandler.StreamThreadExceptionResponse.REPLACE_THREAD);
```

但这是重放一整段，不是重试单条。重放范围取决于提交间隔：EOS 默认 `commit.interval.ms=100ms`，非 EOS 默认 30s。

### 解法一：foreach 内部兜住

在 `foreach` 里自己重试加死信，不让异常冒泡拖垮整个应用：

```java
.foreach((key, latest) -> {
    try {
        upsertWithRetry(latest);      // 指数退避重试写入下游
    } catch (Exception e) {
        toDeadLetter(key, latest, e); // 放弃本条，落死信，继续处理下一条
    }
});
```

### 解法二：解耦（推荐）

不要在 Streams 里直接写 ES。让 Kafka Streams 只做窗口聚合，结果写回一个中间 topic，享受完整 EOS 和状态可靠性；写 ES 这步单独用一个普通消费者（或 ES Sink Connector）消费中间 topic，自己控制重试、死信、位移提交：

```java
.reduce((older, newer) -> newer)
.toStream()
.to("es-sync-products");   // 只写回 Kafka，下游单独消费再写外部系统
```

#### .to() 写回 Kafka 比 foreach 可靠在哪

`.to()` 写 Kafka 在 EOS 事务边界内，可靠性远高于 `foreach` 写 ES：

- 写 Kafka 的异常交给 `ProductionExceptionHandler`，默认返回 RETRY，让生产者按 `retries`（默认无限，受 `delivery.timeout.ms` 默认 120s 约束）反复重试。2 分钟内 broker 恢复则成功，对应用透明。
- 超时还没成功，整条事务 abort，状态回滚、位移不提交、写回的记录丢弃。重放从头再来，消息不丢。
- 不会像 `foreach` 那样留下 ES 写了一半的脏状态，因为根本还没碰 ES。

但 `.to()` 也有两个坑：

**坑一：topic 必须先建好。** Kafka Streams 只自动建它自己的内部 topic（repartition、changelog），`to()` 指定的 `es-sync-products` 不在内。如果 broker 关了自动创建（本仓库的部署就是 `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false`），写过去直接报 `UNKNOWN_TOPIC_OR_PARTITION`，重试也不会成功。需预先建：

```bash
$ ./kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic es-sync-products --partitions 1 --replication-factor 1
```

**坑二：broker 长期不可用。** 重试 2 分钟耗尽后，回到 uncaught handler：默认 SHUTDOWN_CLIENT（挂），或配的 REPLACE_THREAD（重放，broker 没恢复就一直失败）。

#### 关键认识：进 Kafka 不等于写成功 ES

`.to()` 成功只代表记录进了 `es-sync-products` 这个 Kafka topic，不代表 Elasticsearch 写成功。下游消费者从它读出来再写 ES，那一步照样可能失败，照样要重试、死信、幂等。

解耦并没有让"写 ES"变得一定成功，它的真正价值是：

- **计算与外部副作用隔离**：窗口聚合享受完整 EOS，写 ES 慢或失败不会阻塞、拖垮 Streams 的位移推进。
- **故障独立处理**：写 ES 的失败关在一个专门消费者里，可以单独重试、限流、落死信。
- **Kafka 当缓冲**：ES 抖动时变更先堆在 `es-sync-products`，ES 恢复后追上即可，不丢。

### 死信与重试的通用做法

无论手写消费者还是解耦后的下游消费者，写外部系统的循环都应遵循同一套：

1. 写入失败按指数退避重试若干次（如 3 次，间隔 100ms、400ms、1.6s）。
2. 仍失败，把原消息加异常信息写到一个死信 topic（如 `es-sync-products.DLQ`），正常提交位移继续往下消费，不让单条毒消息卡住整个分区。
3. 死信由人工或专门任务排查、修复后重放。
4. 下游写入全程幂等，保证重试和重放都安全。

## 方案选型

| 场景 | 推荐方案 |
| --- | --- |
| 单分区、消费量不大、想完全可控 | 手写消费者：缓冲最新加窗口 flush 加写成功才提交位移 |
| 规模大、要求强一致、不想自己管状态 | Kafka Streams 窗口聚合，输出中间 topic，下游消费者写 ES |
| 必须精确一次写外部系统 | Kafka 自身做不到，需外部系统支持事务或幂等键去重 |

无论哪种，底线一致：顺序靠分区加位移，写入靠幂等，失败靠重试加死信，外部副作用尽量挪出 Streams。

## 参考来源

- [Kafka Streams Developer Guide](https://docs.confluent.io/platform/current/streams/developer-guide/index.html)：窗口聚合、状态存储与 EOS。
- [Kafka Producer 配置：delivery.timeout.ms 与 retries](https://kafka.apache.org/documentation/#producerconfigs)：生产者重试与超时语义。
- [Debezium：PostgreSQL 连接器](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)：before/after/op 字段语义。
- [Elasticsearch Sink Connector](https://docs.confluent.io/kafka-connectors/elasticsearch/current/overview.html)：从 Kafka topic 写 ES，内置重试与死信。
