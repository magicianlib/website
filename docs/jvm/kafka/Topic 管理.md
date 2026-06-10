## 主要配置说明

### --bootstrap-server

```bash
kafka-topics.sh --bootstrap-server [<broker:port>...]
```

指定 broker 服务地址。如果当前使用的是集群环境，只需要配置集群中任意一个可达的节点即可。不过为了防止意外情况，还是推荐指定多个。

示例：

```bash
bin/kafka-topics.sh \
    --bootstrap-server 172.21.11.1:19092,172.21.11.1:29092
```

### --topic \<topic_name>

```bash
kafka-topics.sh --topic <topic_name>
```

指定具体 topic 名称，用于配合 `--list`、`--create`、`--delete` 等参数使用。

### --partitions \<num>

```bash
kafka-topics.sh \
    --create \
    --topic <topic_name> \
    --partitions <num>
```

创建 topic 时指定分区数。在同一个消费者组内，一个分区同一时刻只能被一个消费者消费，分区数越多，同一时刻能并发消费的能力就越强。换句话说，分区数就是消费者（组内）的并发上限。

当生产者将消息投递到 topic 时，消息会被写入其中一个分区。至于写入哪个分区，则是根据消息 key 的 hash 值进行取模计算。也就是说当 key 设计得越合理，消息在分区中越呈现平均分布，消息越平均分布那并发能力就越强。

当然，分区数虽然能增加并发能力，但也不是越多越好。具体可以参考：[分区数（partitions）不要乱加，提前规划](Topic%20最佳实践.md)。

### --replication-factor \<num>

```bash
kafka-topics.sh \
    --create \
    --topic <topic_name> \
    --replication-factor <num>
```

replication-factor 用于指定分区的副本（备份）数。每个分区都有一个 Leader 副本负责接收读写请求，其余副本为 Follower 副本。该配置用于指定每个分区的总副本数，除了 Leader 副本，其他都是 Follower 副本。生产者将消息投递到 topic 时，会先将消息写入对应分区的 Leader 副本，之后再由 Leader 同步到各个 Follower 副本。

这样能保证消息的高可用，即使 Leader 副本所在节点宕机，也能由其他 Follower 副本顶上代替。

**生产环境中建议至少设置 3 个副本。**

### --config min.insync.replicas=\<num>

```bash
kafka-topics.sh \
    --create \
    --topic <topic_name> \
    --config min.insync.replicas=<num>
```

min.insync.replicas 指的是最少同步副本数。默认情况下，生产者将消息投递到 topic，写入 Leader 副本后就认为消息投递成功了，至于 Follower 副本有没有同步成功并不关心。该配置用于指定当消息写入分区后，最少同步指定个副本（含 Leader 副本），才认为消息投递 topic 成功，依此来达到真正的高可用。

需要注意的是，min.insync.replicas 设置的最少同步副本数不能大于 replication-factor。

### --config retention.ms=\<ms>

```bash
kafka-topics.sh \
    --create \
    --topic <topic_name> \
    --config retention.ms=604800000
```

Kafka 的日志由许多 segment 文件组成，生产者将消息写入 topic 后，消息不会立马删除，而是依据提供的保留策略根据条件慢慢清理。

retention.ms 是最直接的保留时间。意思是：一条消息从写入开始，到达到 `retention.ms` 后，就允许 Kafka 将其删除。

注意是“允许”，不是“立刻删除”，只是被标记为可删除。真正的清理会在 log cleaner 或 log retention 线程运行时执行。

例如：

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config retention.ms=7天
```

那么消息大致会在 7 天后被标记为可清除。

:::tip[Note]
`retention.ms` 的单位是 毫秒，这里设置 7天 只是便于理解。另外，-1 表示永久保存。
:::

### --config retention.bytes=\<bytes>

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config retention.bytes=1073741824
```

控制 topic 日志的总大小上限。如果某个分区所有 segment 的累计大小超过 `retention.bytes`，Kafka 会从最老的 segment 开始往前删。

例如：

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config retention.bytes=1GB
```

当前 topic 日志有 1.2GB，旧的 segment 会被删除直到重新低于 1GB。

`retention.bytes` 和 `retention.ms` 谁先触发，就按谁来删除。

:::tip[Note]
`retention.bytes` 的单位是 byte，这里设置 1GB 只是便于理解。
:::

### --config cleanup.policy=\<delete,compact>

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config cleanup.policy=delete,compact
```

控制日志如何“老去”。

* delete：按时间/大小进行删除
* compact：按 key 去重，只保留每个 key 的最后一条消息

简单地说就是：

```properties
cleanup.policy=delete  ## 按时间/空间删
cleanup.policy=compact ## 按 key 保留最新版本
```

另外，也可以设置成 `delete,compact` 的组合：

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config cleanup.policy=delete,compact
```


**另外，如果不理解 compact 真正的含义，建议无脑用 delete 准没错。**

### --config delete.retention.ms=\<ms>

```bash
kafka-topics.sh --create \
    --topic <topic_name> \
    --config cleanup.policy=compact
    --config delete.retention.ms=604800000
```

该参数是对 `cleanup.policy=compact` 的扩充，在 `cleanup.policy=delete` 模式下不起作用。

compact 模式运行一个特殊线程叫 Log Cleaner，它的任务是扫描日志，把所有旧的 key 替换掉，只保留每个 key 的最新值。

比如生产者按照时间顺序依次向 topic 投递如下消息：

```plaintext
key=A, value=1
key=A, value=2
key=A, value=3
```

compact 模式下最终只会保留：

```plaintext
key=A, value=3
```

要删除一条 key，Kafka 写入的不是“删掉这条”，而是：

key=A, value=null → 这叫 tombstone

null 值 = 删除标记，Kafka 看到它就知道你想删除 key=A。

delete.retention.ms → 控制 tombstone 保留多久

Kafka 不会看到 tombstone 就立即删对应的旧数据。它会先把 tombstone 保留 一段时间，让 consumer 有机会看到 key 真的被删除过。

这段“墓碑停留时间”就是 delete.retention.ms，默认一般是 86400000ms（24 小时）。

:::danger[划重点]
重要的事情再说一遍，如果不能理解 `--config cleanup.policy=compact` 的含义，建议无脑用 `--config cleanup.policy=delete`
:::

## 创建 topic

了解过前面 topic 的主要配置之后，再去创建 topic 就得心应手了。通用的创建命令如下，可根据需要自行指定：

```bash
kafka-topics.sh \
--bootstrap-server [<broker:port>...] \
--create \
--topic <topic_name> \
--partitions <num>                  \  # 分区数, 根据吞吐量评估, 通常至少为 3
--replication-factor <num>          \  # 每个分区的副本数, 生产环境建议至少为 3 个
--config min.insync.replicas=<num>  \  # 消息最小同步副本数, 保证高可用; 至少同步指定个副本才认为投递成功, 建议至少 2 个
--config retention.ms=604800000     \  # 日志保留时长(7天), -1 表示永久保留
--config segment.bytes=1073741824   \  # 单个日志分段的最大大小(1GB)
--config cleanup.policy=delete         # 日志处理策略, 根据需求选择 delete 或 compact
```

示例：

```bash
bin/kafka-topics.sh \
--bootstrap-server 172.21.11.1:19092,172.21.11.1:29092 \
--create \
--topic order.paid \
--partitions 3 \
--replication-factor 3 \
--config min.insync.replicas=3 \
--config cleanup.policy=delete \
--config retention.ms=2592000000
```

输出结果：

```plaintext
WARNING: Due to limitations in metric names, topics with a period ('.') or underscore ('_') could collide. To avoid issues it is best to use either, but not both.
Created topic order.paid. <== topic 创建成功
```

前面的 WARNING 并不是错误，而是 Kafka 友善地提醒你：在创建 topic 时尽量不要混用 `.` 和 `_`。

这事源自 Kafka 的度量指标（metrics）名字会把 topic 名嵌进去，而早期某些系统会把 `.` 和 `_` 都当成同一个分隔符。

也就是说创建 topic 时 `order.paid` 和 `order_paid` 可能会生成相同的 metric 名，造成“撞名”。这并不是什么错误，仅仅只是友善地提示你不要同时混用 `.` 和 `_`，尽量保持统一的命名规范。

## 列出所有 topic

如果想要查看 kafka 中有多少 topic，可以使用 `--list` 查看：

```bash
$ bin/kafka-topics.sh \
--bootstrap-server 172.21.11.1:19092,172.21.11.1:29092 \
--list

order.paid
```

## 查看 topic 详细信息

如果想要查看 topic 的详细信息（如分区、副本数、最小同步策略）以及创建 topic 时指定的配置参数，可以使用 `--describe` 查看：

```bash
$ bin/kafka-topics.sh \
--bootstrap-server 172.21.11.1:19092,172.21.11.1:29092 \
--topic order.paid \
--describe

Topic: order.paid	TopicId: tVFQoD0UR4CvWrIgLU0bDA	PartitionCount: 3	ReplicationFactor: 3	Configs: min.insync.replicas=3,cleanup.policy=delete,segment.bytes=1073741824,retention.ms=2592000000,unclean.leader.election.enable=false
	Topic: order.paid	Partition: 0	Leader: 3	Replicas: 3,1,2	Isr: 3,1,2	Elr: 	LastKnownElr:
	Topic: order.paid	Partition: 1	Leader: 1	Replicas: 1,2,3	Isr: 1,2,3	Elr: 	LastKnownElr:
	Topic: order.paid	Partition: 2	Leader: 2	Replicas: 2,3,1	Isr: 2,3,1	Elr: 	LastKnownElr:
```

## 删除 topic

如果某个 topic 创建错了，可以使用 `--delete` 删除：

```bash
$ bin/kafka-topics.sh \
--bootstrap-server 172.21.11.1:19092,172.21.11.1:29092 \
--delete \
--topic order.paid
```

:::danger[NOTE]
如果是在生产环境中，千万不要轻易使用 `--delete`。因此，当业务需要使用一个新 topic 时，在创建之前一定要合理规划分区数、遵循命名规范，仔细斟酌一个有业务含义的 topic 名称后再创建。一旦创建，就不要轻易删除。
:::

## 关于 broker 配置说明

### 禁用自动创建 topic

如果当前运行的是 cluster 模式，在集群启动之前，需要将所有的选举节点都设置为禁止自动创建 topic。也就是在 `server.properties` 都做如下配置：

```properties
auto.create.topics.enable=false
```

所谓的选举节点，就是 `server.properties` 的指定 roles 为 controller 的节点（下面两种配置都表示 broker 是选举节点）：

```properties
process.roles=controller
process.roles=broker,controller
```

如果是 standalone 模式，只需要在 `server.properties` 中添加该配置即可。

### broker 设置副本默认策略

在创建 topic 时，为了保证高可用，通常会设置多个消息副本（`--replication-factor <num>`），也就是说消息写入 Leader 之后会继续将消息同步到其他副本。默认情况下，消息写入 Leader 副本成功之后就认为生产者将消息投递 topic 成功了。

而为了保证真正的高可用（防止消息丢失），在创建 topic 时通常还会指定最少同步副本数（`--config min.insync.replicas=<num>`）。该配置解决的问题是，当消息写入 Leader 副本之后，还要继续同步其他副本，只有当消息至少成功写入 `min.insync.replicas` 个副本（含 Leader）才认为消息写入 topic 成功。

为了防止创建 topic 时遗漏，我们可以直接在 broker 的配置文件 `server.properties` 中设置默认的最小同步副本数：

```properties
min.insync.replicas=<num>
```

当然，如果是 cluster 模式，需要在所有的 broker 节点都设置。在 broker 级别设置，主要是增加一层保险而已。
