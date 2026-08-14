在已部署的 Kafka Connect 上注册并运维 Debezium PostgreSQL 连接器，把 PostgreSQL 的行级变更实时投递到 Kafka topic。涵盖连接器注册、配置项、修改、消息格式精简，以及部署过程中常见问题与最佳实践。

## 数据库前置条件

Debezium 通过 PostgreSQL 的逻辑解码读取变更日志，源库需满足以下条件。

服务器参数（在 `postgresql.conf` 或容器启动参数设置，改完需重启）：

| 参数 | 要求 | 说明 |
| --- | --- | --- |
| `wal_level` | `logical` | 开启逻辑解码 |
| `max_replication_slots` | ≥1 | 复制槽数量，按连接器数量调整 |
| `max_wal_senders` | ≥1 | WAL 发送进程数，按连接数调整 |

其他要点：

- **逻辑解码插件**：Debezium 2.x 默认用 PostgreSQL 内置的 `pgoutput`（PG10+ 自带，无需额外安装）。
- **复制槽与 publication**：由 Debezium 自动创建，无需手动建。
- **REPLICA IDENTITY**：默认 `DEFAULT`；要捕获 UPDATE/DELETE 的完整旧值或无主键表的删除，需在表级设为 `FULL`（`ALTER TABLE 表名 REPLICA IDENTITY FULL`）。
- **主键**：被捕获的表建议有主键。无主键时 DELETE 默认捕获不到旧值，且会刷大量告警。

账号权限：需 `REPLICATION` 角色 + `LOGIN` + 对库 `CONNECT` + 对 schema `USAGE` + 对表 `SELECT`。示例（需进入目标数据库执行，不能用 `库名.schema` 形式）：

```sql
BEGIN;

-- 创建用于 CDC 的登录账号，必须具备逻辑复制权限
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD '你的密码';

-- 允许连接到目标数据库
GRANT CONNECT ON DATABASE db TO debezium;

-- 授予 schema 使用权限与现有表读取权限（public 仅为示例，替换为实际 schema）
GRANT USAGE ON SCHEMA public TO debezium;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;

-- （可选）后续新建表自动获得读取权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium;

COMMIT;
```

本地调试也可直接用超管账号（具备隐式复制权限），生产环境务必用上述最小权限账号。

## 注册连接器

通过 Kafka Connect 的 REST API 注册，`POST /connectors`，请求体含连接器名与配置：

```bash
curl -i -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pg-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "topic.prefix": "pgdb",
      "database.hostname": "host.docker.internal",
      "database.port": "5432",
      "database.user": "admin",
      "database.password": "admin123",
      "database.dbname": "db",
      "plugin.name": "pgoutput",
      "slot.name": "debezium",
      "publication.name": "dbz_publication",
      "schema.include.list": "public",
      "table.include.list": "public.*",
      "decimal.handling.mode": "string",
      "topic.creation.default.replication.factor": "1",
      "topic.creation.default.partitions": "1"
    }
  }'
```

### 配置项说明

| 配置项 | 作用 |
| --- | --- |
| `name` | 连接器名称，集群内唯一；后续查看状态、修改配置、删除等管理操作都用它定位 |
| `connector.class` | 连接器实现类，PostgreSQL 用 `io.debezium.connector.postgresql.PostgresConnector`；可用 `GET /connector-plugins` 查询 Connect 已安装的全部连接器类 |
| `topic.prefix` | 数据 topic 前缀，最终 topic 名为 `<topic.prefix>.<schema>.<表>`；旧名 `database.server.name` 已废弃 |
| `database.hostname` | 数据库地址。数据库与 Connect 同一 Compose 时用容器名；跨 Compose/网络用 `host.docker.internal`（Mac/Win）或共享网络，详见 [端口与网络](#端口与网络) |
| `database.port` | 数据库端口，默认 5432 |
| `database.user/password` | 上述 CDC 账号 |
| `database.dbname` | 要捕获的数据库名 |
| `plugin.name` | 逻辑解码插件，2.x 默认 `pgoutput` |
| `slot.name` | 逻辑复制槽名，必须小写、符合槽命名规则，集群内唯一 |
| `publication.name` | publication 名，由连接器自动创建，默认 `dbz_publication` |
| `schema.include.list` | 允许捕获的 schema，逗号分隔的正则 |
| `table.include.list` | 允许捕获的 schema.表，逗号分隔的正则；一个表需同时满足 schema 白名单与表白名单才会被捕获 |
| `decimal.handling.mode` | DECIMAL/NUMERIC 字段编码方式：`precise`（默认，输出 `{scale,value}`）、`double`（数字）、`string`（字符串，金额类推荐），详见 [DECIMAL 字段编码](#DECIMAL-字段编码) |
| `topic.creation.default.replication.factor` | 自动创建数据 topic 的副本数，单节点集群填 `1` |
| `topic.creation.default.partitions` | 自动创建数据 topic 的分区数 |

`name` 命名：连接器名在 Connect 集群内必须唯一，重名注册返回 409；它出现在 REST 路径与内部配置 topic 的键里，建议只用字母、数字、`-`、`_`、`.`，避免空格与斜杠。取名要有意义且稳定（如 `postgres-orders-src`）。`name` 不在 `config` 内、无法用 PUT 改名，改名需删后重建，所以一次定好；它和数据 topic 前缀 `topic.prefix` 是两个独立概念，不要混用。

后两个 `topic.creation.*` 是关闭 broker 自动建 topic 后让 Debezium 自建数据 topic 的关键，详见 [数据 topic 不会自动创建](#数据-topic-不会自动创建)。

## 连接器管理

全部通过 Connect REST API 完成。

| 操作 | 方法与路径 | 说明 |
| --- | --- | --- |
| 列出全部连接器 | `GET /connectors` | 返回连接器名数组 |
| 查看连接器详情 | `GET /connectors/{name}` | 返回 name 与 config |
| 查看状态 | `GET /connectors/{name}/status` | `connector.state` 与 `tasks[].state`，失败时 `tasks[].trace` 是报错堆栈 |
| 查看配置 | `GET /connectors/{name}/config` | 返回当前 config |
| 新建 | `POST /connectors` | body 含 name + config |
| 修改配置 | `PUT /connectors/{name}/config` | body 为**完整** config，整体替换；改完自动重启任务 |
| 删除 | `DELETE /connectors/{name}` | 删除连接器，默认不删复制槽（除非 `slot.drop.on.stop=true`） |
| 重启连接器 | `POST /connectors/{name}/restart` | 整个连接器重启 |
| 重启任务 | `POST /connectors/{name}/tasks/0/restart` | 重启指定任务 |
| 暂停/恢复 | `PUT /connectors/{name}/pause`、`/resume` | 暂停后停止消费，恢复后继续 |

示例：

```bash
# 状态
$ curl -s http://localhost:8083/connectors/pg-connector/status

# 修改配置（PUT 必须传完整 config，不能只传改动字段）
$ curl -X PUT http://localhost:8083/connectors/pg-connector/config \
  -H "Content-Type: application/json" \
  -d '{ ...完整 config... }'

# 删除
$ curl -X DELETE http://localhost:8083/connectors/pg-connector
```

:::warning[部分配置不可热更]
`topic.prefix`、`slot.name` 等属性改了会导致位移语义错乱，不能通过 PUT 在线修改，需要先 DELETE 连接器、清理复制槽后再用新值重新注册。可热更的通常是与捕获范围、编码相关的项，如 `table.include.list`、`decimal.handling.mode`、`topic.creation.*`。
:::

## Topic 命名

每个被捕获的表对应一个数据 topic，命名规则 `<topic.prefix>.<schema>.<表>`。例如 `topic.prefix=pgdb`、表 `public.products`，topic 为 `pgdb.public.products`。

连接器首次启动会做**初始快照**（`snapshot.mode` 默认 `initial`），把当前已有数据以 `op=r`（read）事件发出；之后进入流式捕获，INSERT 为 `op=c`、UPDATE 为 `op=u`、DELETE 为 `op=d`。

连接器启动后新建的表，若 publication 为 `FOR ALL TABLES`（默认）且匹配 `table.include.list`，其后续变更会被流式捕获，但**不会**补做历史快照。

:::info[重点说明]
PostgreSQL 连接器只捕获行级数据变更（DML），不发送表结构消息：CREATE/ALTER/DROP 等表结构变更（DDL）不产生任何变更事件，只有 INSERT/UPDATE/DELETE 才会发出数据消息。所以新建或改完表结构后，必须对该表写入或修改数据才会有消息，空表既无消息也无 topic。
:::

## 监听多个 schema

把多个 schema 加进两个白名单即可，都是逗号分隔的正则：

```json
"schema.include.list": "public,inventory",
"table.include.list": "public.*,inventory.*"
```

topic 自动按 `<prefix>.<schema>.<表>` 区分，消费时按 schema 选 topic。注意：

- 不要用裸 `.*` 匹配 schema 或表，否则会把 `pg_catalog`、`information_schema` 等系统 schema 卷进来报错，显式列举目标 schema。
- 专用 CDC 账号要对每个目标 schema 分别 `GRANT USAGE` 并对表 `GRANT SELECT`。

## 消息格式与精简

### 消息结构

默认（`schemas.enable=false` 后）一条变更消息即 `payload`，结构为：

```json
{
  "before": null,
  "after": {"id": 2, "name": "orange", "price": {"scale": 1, "value": "ALk="}},
  "source": {"name": "pgdb", "ts_ms": 1786619026036, "snapshot": "false", "db": "db", "schema": "public", "table": "products", "txId": 776, "lsn": 29238568},
  "op": "u",
  "ts_ms": 1786619026457,
  "transaction": null
}
```

- `before`/`after`：变更前后的整行数据。INSERT 的 `before` 为 null，DELETE 的 `after` 为 null。UPDATE 的 `before` 取决于表的 REPLICA IDENTITY：默认 `DEFAULT` 只回传主键列，无主键表则 `before` 直接为 null；需要完整旧值镜像须把表设为 `REPLICA IDENTITY FULL`，详见 [数据库前置条件](#数据库前置条件)。
- `op`：操作类型，`r` 快照读、`c` 新增、`u` 更新、`d` 删除。
- `source`：变更来源元信息，含 topic 前缀（`name`）、数据库名（`db`）、schema 名（`schema`）、表名（`table`）、事务 ID、LSN 等。`"schema": "public"` 是 PostgreSQL 的 schema 名（业务数据，不是被去掉的结构描述块）。
- `ts_ms`/`ts_us`/`ts_ns`：**连接器处理该事件的时间戳**，毫秒/微秒/纳秒三档精度（`ts_us` = `ts_ms`×1000 + 余，`ts_ns` = `ts_us`×1000 + 余）。注意 `source` 内也有同名三个字段，那是数据库侧时间（PostgreSQL 为事务提交时间）；顶层与 `source` 的差值即端到端延迟。
- `transaction`：事务元数据，仅在连接器开启 `provide.transaction.metadata=true` 时非空，含事务 ID 与该事件在事务内的顺序号，并额外产生事务 topic；默认关闭，故为 null。

### 去掉每条消息的 schema 块

默认情况下每条消息还带一个 `schema` 字段，重复描述整张表的结构（字段名、类型、是否可空等），与业务无关却占消息体绝大部分，单条可从几百字节膨胀到 3KB 以上。

关闭方法是 worker 级的 `value.converter.schemas.enable=false`（key 侧同理）。该设置在 [Docker Compose 部署](./Docker%20Compose%20部署.md#消息转换器) 的 Compose 里配置，注意 `debezium/connect` 镜像只识别 `CONNECT_` 前缀的变量，必须写成 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE`。关闭后新消息只剩 `payload`，体积降到原来的数分之一。已落盘的旧消息仍是旧格式。

### DECIMAL 字段编码

`DECIMAL/NUMERIC` 字段默认按 `decimal.handling.mode=precise` 编码成 `VariableScaleDecimal`：

```json
"price": {"scale": 1, "value": "ALk="}
```

- `value`：把数值放大成整数后的**未缩放整数**，按大端、有符号存成字节再 base64。`"ALk="` 解码是字节 `00 b9`，即整数 `185`。
- `scale`：小数位数，这里是 `1`。
- 真实值 = `未缩放整数 / 10^scale` = `185 / 10` = `18.5`。

解码验证：

```bash
$ python3 -c "import base64; v=base64.b64decode('ALk='); n=int.from_bytes(v,'big',signed=True); print(n, '->', n/10)"
185 -> 18.5
```

想直接得到普通数字，改连接器配置 `decimal.handling.mode`：

| 模式 | price 的样子 | 说明 |
| --- | --- | --- |
| `precise`（默认） | `{"scale":1,"value":"ALk="}` | 无精度损失，但难读 |
| `double` | `18.5` | 直接是数字，最直观；超大或超高精度小数有浮点精度风险 |
| `string` | `"18.5"` | 字符串，可读且无精度损失，金额类字段推荐 |

### 进一步精简

- **SMT 解包**：加 `transforms=unwrap`（`ExtractNewRecordState`）把消息压平为最新一行加操作类型，去掉 `before`/`source`/`transaction`。适合下游只关心最新值的场景，但会丢失旧值镜像与来源元信息。
- **Avro + Schema Registry**：schema 只在注册表存一份，消息只带 id 与紧凑二进制，体积最小。`debezium/connect` 镜像自带 Apicurio 转换器，开 `ENABLE_APICURIO_CONVERTERS: 'true'` 并把 converter 换成 Apicurio Avro converter即可，高吞吐生产环境首选。

## 数据 topic 不会自动创建

[Docker Compose 部署](./Docker%20Compose%20部署.md) 关闭了 broker 自动建 topic。此时两类 topic 表现不同：

- **Connect 内部 topic**（`debezium_configs`/`debezium_offsets`/`debezium_statuses`）：由 Connect 通过管理接口显式创建，不受影响。
- **Debezium 数据 topic**（`pgdb.public.products` 等）：默认**不会**自动创建。broker 关闭自动建、连接器又没配 `topic.creation.*` 时，Debezium 往不存在的 topic 发数据会失败。

典型现象：连接器状态 `RUNNING`，但数据 topic 一直不出现，Debezium 日志反复报：

```
Error while fetching metadata ... {pgdb.public.products=UNKNOWN_TOPIC_OR_PARTITION}
```

变更事件发不出去只能缓冲在内存，Postgres 复制槽持续积压（`pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)` 不断增大），表现为连接器连着却收不到数据。

两种解决办法：

办法一（推荐）：在连接器配置里启用 Debezium 的 topic 自动创建，新建表时自动建好对应 topic：

```json
"topic.creation.default.replication.factor": "1",
"topic.creation.default.partitions": "1"
```

副本数需与集群规模匹配，单节点填 `1`。

办法二（手动）：按需逐个创建。

容器内执行用内部监听器 `19092`：

```bash
$ docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 \
  --create --topic pgdb.public.products --partitions 1 --replication-factor 1
```

宿主机本地安装的客户端用外部监听器 `9092`：

```bash
$ ./kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic pgdb.public.products --partitions 1 --replication-factor 1
```

topic 建好后，Debezium 会在约 1 秒内把缓冲事件发出，复制槽积压随之回落。

## 端口与网络

**Kafka 端口**：宿主机客户端（业务程序、本地 `kafka-topics.sh`）连 `localhost:9092`（EXTERNAL，已映射）；容器内执行（`docker exec kafka ...`）用 `localhost:19092`（PLAINTEXT，绑定在容器内）。原因与监听器配置见 [Docker Compose 部署](./Docker%20Compose%20部署.md#端口区分9092-与-19092)。

**源库地址**：连接器运行在 debezium 容器内，`database.hostname` 必须是容器能解析的地址。

- 源库与 Connect 在**同一个 Compose**：用容器名（如 `postgres`），靠 Docker DNS 解析。
- 源库在**另一个 Compose/网络**：两者不共网，容器名不可达。Mac/Windows 的 Docker Desktop 可用 `host.docker.internal` 走宿主机回环（源库端口需映射到宿主机）；Linux 需在 debezium 容器加 `extra_hosts: ["host.docker.internal:host-gateway"]`，或把两个 Compose 挂到同一个外部网络后用容器名互访。

## 消费端顺序保证与下游同步

把变更同步到 Elasticsearch 等下游时，同一行一秒内可能修改几十次，必须按变更发生的真实先后消费，否则旧值会覆盖新值。正确链路是（同 key 同分区、分区内 offset 保序、消费端串行），不依赖消息内的时间戳。

### 顺序靠分区与 offset，不靠时间戳

Debezium 默认用表主键做消息 key，Kafka 按 key 哈希分区，同一主键的所有变更落在同一分区，分区内按 offset 单调递增保序。消费端按 offset 顺序读，拿到的即是真实先后，offset 是分区内权威顺序，无需再用业务字段排序。

不要用 `source.ts_ns` 排序：它精度只到微秒（末尾常为 `000`），同一事务或同一微秒内多条变更时间戳相同，无法区分；且跨分区、跨实例时钟不同步。`source.lsn`（WAL 日志序列号）单调递增，是 PostgreSQL 侧真实变更顺序，可用于离线对账，但在线消费仍以 offset 为准。

无主键表没有稳定 key，消息会被轮询到不同分区，几十次修改散落各处，无法还原顺序。需加主键，或在连接器配置显式指定唯一列当 key：

```json
"message.key.columns": "public.products:id"
```

### 消费端必须串行处理

分区有序，但消费端一旦对同一分区的消息开线程池并发处理或做异步重试，后到的旧值就可能覆盖新值。保证方式是同一分区在一个消费者内串行处理。写下游用幂等 upsert：Elasticsearch 的 `_id` 用主键，`op=c/u` 写入 `after` 整行，`op=d` 删文档；重复消费靠主键覆盖兜底（至少一次语义）。

### 高频写入降频

一秒几十次全写 Elasticsearch 是写放大。在保证串行的前提下，对同一 key 做短窗口合并：缓冲窗口（如 500ms）内同一 key 的多条变更，窗口结束只写最后一条。offset 提交须与"已成功写入下游"对齐，否则重启会丢或重。实现可用 Kafka Streams / Flink 窗口，或内存缓冲加定时刷。

## 自定义消息 key（message.key.columns）

连接器默认用表主键做 Kafka 消息 key，同一主键的变更因此落同一分区、保持顺序。`message.key.columns` 可以覆盖这一默认，为指定表自定义做 key 的列。常用于无主键表（否则变更散落到不同分区、顺序错乱），或想用业务标识（订单号、用户号等）而非数据库主键来归集同一对象的变更。

语法是分号分隔的条目列表，每条形如 `<schema>.<表>:<列>`：

- 同一张表的多个**列**用逗号分隔（组成复合 key）
- 多张**表条目**之间用分号分隔
- `<schema>.<表>` 是全限定表名，支持正则；列名也支持正则

单表单列：

```json
"message.key.columns": "public.products:id"
```

单表多列（复合 key）：

```json
"message.key.columns": "public.products:shop_id,product_code"
```

多张表同时配置，用分号分隔：

```json
"message.key.columns": "public.products:id;public.orders:order_no;public.users:user_id"
```

若多张表的 key 列同名，表名部分可用正则一次匹配多张表（例如 `public` 下所有表都用 `id` 列作 key），注意正则中的反斜杠在 JSON 里需双写。

注意事项：

- 指定的列应当**唯一标识一行**。若多行共用同一 key 值（例如用非唯一的 status 列），不同行的变更会挤进同一分区、消费端无法区分，顺序也会错乱。
- 更换 key 等同于换分区：历史消息留在旧分区，新消息落新分区，原有顺序被打断。所以 key 一旦定下不要随意改，重要性类似 `topic.prefix`。
- 本配置只决定消息的 **key 与分区**，不影响 value，`after`/`before` 仍是整行。
- 与主键的关系：配了就用指定列；没配则用主键；无主键又不配，消息没有稳定 key，会轮询分区，顺序无法保证。

## 踩坑总结与最佳实践

实际部署中高频出现的问题与对应解法：

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 消息体巨大、每条都带表结构 | converter 的 `schemas.enable` 默认 true | Compose 设 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE=false`（必须带前缀） |
| 设了 `VALUE_CONVERTER_SCHEMAS_ENABLE=false` 不生效 | 镜像只识别 `CONNECT_` 前缀变量 | 改成 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE` |
| 连接器 RUNNING 但无数据 topic、槽积压增长 | broker 关闭自动建、数据 topic 未创建 | 连接器配 `topic.creation.default.replication.factor/partitions` |
| `DECIMAL` 字段是 `{scale,value}` 看不懂 | 默认 `precise` 编码 | 改 `decimal.handling.mode=string`（或 `double`） |
| 宿主机连 `19092` 报 Node may not be available | 用了容器内部端口 | 宿主机改用 `9092` |
| 连接器连不上源库 | 跨 Compose 网络不互通 | 用 `host.docker.internal` 或共享网络，源库端口映射到宿主机 |
| 同一行多次修改，下游顺序错乱 | 消费端并发处理，或无主键导致跨分区 | 同 key 同分区（加主键或配 `message.key.columns`）加单分区串行消费 |

推荐的基线连接器配置（单节点集群，已合并 topic 自建与金额字段可读）：

```json
{
  "name": "pg-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "topic.prefix": "pgdb",
    "database.hostname": "host.docker.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "你的密码",
    "database.dbname": "db",
    "plugin.name": "pgoutput",
    "slot.name": "debezium",
    "publication.name": "dbz_publication",
    "schema.include.list": "public",
    "table.include.list": "public.*",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.partitions": "1",
    "decimal.handling.mode": "string"
  }
}
```

验证流程：注册后查 `/connectors/{name}/status` 确认 `RUNNING`；查 topic 列表确认数据 topic 已建；在源库做一次 INSERT/UPDATE，用 `kafka-console-consumer` 消费对应 topic 看到变更事件即端到端打通。

## 参考来源

- [Debezium: CDC](https://debezium.io/documentation/)：Debezium 官方文档。
- [Debezium: PostgreSQL 连接器](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)：连接器配置项、数据库前置条件与消息格式说明。
- [Debezium: MySQL 连接器](https://debezium.io/documentation/reference/stable/connectors/mysql.html)：binlog 与权限要求。
