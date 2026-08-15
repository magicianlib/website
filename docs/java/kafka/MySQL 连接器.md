在已部署的 Kafka Connect 上注册 Debezium MySQL 连接器，把 MySQL 的行级变更实时投递到 Kafka topic。整体流程与 [PostgreSQL 连接器](./PostgreSQL%20连接器.md) 一致：准备账号、注册连接器、逐项讲清配置、最后做数据验证（建表、INSERT、UPDATE、DELETE）。本文只讲 MySQL 侧的差异点，两者的消息结构、消费端顺序保证等共性问题在那篇里已有完整说明，必要时会给出链接。

:::tip[环境约定]
后续命令基于示例 Compose 仓库 [github.com/magicianlib/dockerfiles](https://github.com/magicianlib/dockerfiles) 搭建的环境：

```
.
├── kafka
│   └── debezium-connect
└── mysql80
```

- Kafka：
  - 容器内监听端口 19092
  - 宿主机端口 9092
  - 已关闭 broker 自动建 topic
- debezium
  - REST 端口 8083
- MySQL：
  - 版本 8.0.43，root 密码 `admin`
  - 示例库名 inventory

Kafka 与 Connect 的部署细节见 [Docker Compose 部署](./Docker%20Compose%20部署.md)。
:::

## 第一步：确认数据库前置条件

Debezium 把自己伪装成 MySQL 的一个从库，通过 binlog 复制协议拉取行级变更，源库需满足以下条件。

服务器参数（改完需重启 MySQL 才生效）：

| 参数 | 要求 | 说明 |
| --- | --- | --- |
| `server-id` | 唯一 | 复制拓扑中节点的唯一标识。连接器也会作为一个「从库」加入拓扑，因此每个连接器还要有自己独立的 `database.server.id`（不能与源库及其他从库冲突） |
| `log_bin` | ON | 开启二进制日志，记录所有数据变更，这是 CDC 的数据来源。MySQL 8.0 默认开启 |
| `binlog_format` | `ROW` | 行级日志格式，Debezium 只支持 ROW；STATEMENT/MIXED 只记 SQL 语句，无法还原出行变更的前后镜像 |
| `binlog_row_image` | `FULL` | 行镜像完整度。`FULL` 记录变更前后的所有列，UPDATE/DELETE 消息的 `before` 才是完整旧值；`MINIMAL` 只记主键和变更列，消息里拿不到完整旧镜像。默认即 FULL |
| `binlog_row_metadata` | `FULL` | 行元数据完整度（8.0 新增）。FULL 时 binlog 事件自带列的 signed、charset、enum/set 值等元信息，Debezium 可直接从 binlog 还原表结构；MINIMAL 需额外回表查询。默认 MINIMAL，建议显式设为 FULL |
| `binlog_expire_logs_seconds` | 足够长 | binlog 保留时长（默认 7 天）。需覆盖连接器最长可能的停机时间，否则 offset 对应的日志被清理后，重启只能重新 snapshot |
| `gtid_mode` | `ON` | 为每个事务分配全局唯一 ID，主从切换后连接器能靠 GTID 定位变更位点（对应 `gtid.source.filter`/`snapshot.locking` 等 GTID 相关能力）。需与 `enforce_gtid_consistency` 一起开 |

本仓库的 `mysql80/conf/my.cnf` 已配置好以上全部参数。容器内的确认方法：

```bash
$ docker exec mysql sh -c "mysql -uroot -padmin -e \"
  SELECT @@server_id, @@log_bin, @@binlog_format, @@binlog_row_image,
         @@binlog_row_metadata, @@gtid_mode, @@binlog_expire_logs_seconds;\""
@@server_id	@@log_bin	@@binlog_format	@@binlog_row_image	@@binlog_row_metadata	@@gtid_mode	@@binlog_expire_logs_seconds
1	1	ROW	FULL	FULL	ON	864000
```

对照上表全部符合即可继续；`log_bin` 为 0 说明配置没生效，先回去检查配置文件挂载（本仓库的 my.cnf 走了中转复制方案，原因见 Compose 文件内注释），不要急着注册连接器。

:::note[关于密码]
本环境 MySQL 实例初始化时 root 密码为 `admin`（`MYSQL_ROOT_PASSWORD` 只在数据目录首次初始化时生效，之后改 Compose 里的值不影响已有实例）。生产环境不要用 root，用下面第二步的专用账号。
:::

## 第二步：创建最小权限账号

连接器需要一个能拉 binlog 的账号。本地调试可以直接用 root，但生产环境务必用最小权限账号：

```sql
CREATE USER 'debezium'@'%' IDENTIFIED BY 'Admin@123';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';
FLUSH PRIVILEGES;
```

逐项说明：

- `SELECT`：快照阶段读取存量数据（表级行权限，这里图省事给了全局，收窄版可按库 `ON inventory.*` 另行授予，但下面四项必须全局 `*.*`）。
- `RELOAD`：执行 `FLUSH TABLES WITH READ LOCK`（或 8.0 的 `LOCK TABLES FOR BACKUP`），快照期间锁表拿到一致性位点。
- `SHOW DATABASES`：列出全部库名，用于 `database.include.list` 过滤。
- `REPLICATION SLAVE`：核心权限，伪装成从库拉 binlog 事件，没有它连接器起不来。
- `REPLICATION CLIENT`：执行 `SHOW MASTER STATUS` / `SHOW SLAVE STATUS`，获取当前 binlog 位点。

:::tip[与 PG 侧的对比]
PG 那篇里预建 publication、REPLICA IDENTITY 等前置动作在 MySQL 里都不存在：MySQL 没有 publication 概念，捕获范围完全由连接器配置（`database.include.list` + `table.include.list`）决定；旧值镜像靠 `binlog_row_image=FULL` 保证，无需逐表设置。
:::

## 第三步：注册连接器

通过 Kafka Connect 的 REST API 注册，`POST /connectors`。把下面的 JSON 存成 `register-mysql.json`：

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "topic.prefix": "mysqlcdc",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "Admin@123",
    "database.server.id": "184001",
    "database.include.list": "inventory",
    "table.include.list": "inventory.customers",
    "decimal.handling.mode": "string",
    "snapshot.mode": "initial",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:19092",
    "schema.history.internal.kafka.topic": "schemahistory.mysqlcdc",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.partitions": "1"
  }
}
```

注册并确认状态：

```bash
$ curl -i -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @register-mysql.json

HTTP/1.1 201 Created

$ curl -s http://localhost:8083/connectors/mysql-connector/status

{"name":"mysql-connector","connector":{"state":"RUNNING","worker_id":"172.19.0.3:8083"},
 "tasks":[{"id":0,"state":"RUNNING","worker_id":"172.19.0.3:8083"}],"type":"source"}
```

`connector.state` 和 `tasks[].state` 都是 `RUNNING` 才算注册成功。若 `tasks[].state` 是 `FAILED`，`tasks[].trace` 里就是报错堆栈，对照 [踩坑总结](#踩坑总结与最佳实践) 排查。

:::info[关于 REST API]
注册、查状态、PUT 改配置、删除、重启等端点与 PG 连接器完全相同（连接器名换成 `mysql-connector` 即可），完整列表见 [PostgreSQL 连接器的第三步](./PostgreSQL%20连接器.md#第三步注册连接器)。注意 PUT 的 body 是**不含 `name`/`config` 外壳的裸 config**，把注册 JSON 原样发过去会报 500 反序列化错误。
:::

### 配置项详解

只列与 PG 连接器不同或有 MySQL 特有语义的项，相同的项（`topic.prefix`、`database.hostname`、`decimal.handling.mode`、`topic.creation.*` 等）见 [PostgreSQL 连接器的配置项详解](./PostgreSQL%20连接器.md#配置项详解)。

<table class="config-table">
<colgroup>
<col style={{width: '25%'}} />
<col style={{width: '25%'}} />
<col style={{width: '50%'}} />
</colgroup>
<thead>
<tr><th>配置项</th><th>本例取值</th><th>作用与选值理由</th></tr>
</thead>
<tbody>
<tr><td><code>connector.class</code></td><td><code>io.debezium.connector.mysql.MySqlConnector</code></td><td>连接器实现类，MySQL 固定用这个</td></tr>
<tr><td><code>database.server.id</code></td><td><code>184001</code></td><td>连接器在 MySQL 复制拓扑里的「从库」ID。MySQL 8.0.14+ 环境下 Debezium 会生成随机默认值，但显式指定更可控：集群内多实例 Connect 各自的连接器必须互不相同，也不能与源库的 <code>server-id</code>（本例为 1）及真实从库冲突，否则 binlog 拉流直接断开。任意取一个不易撞车的大数即可。不可热更</td></tr>
<tr><td><code>database.user</code> / <code>database.password</code></td><td><code>debezium</code> / <code>Admin@123</code></td><td>第二步创建的 CDC 账号</td></tr>
<tr><td><code>database.include.list</code></td><td><code>inventory</code></td><td>允许捕获的库名白名单，逗号分隔的正则，如 <code>inventory,billing</code>。与 PG 最大的不同：MySQL 连接器可以同时捕多个库（一个连接器对应一个实例），不配则捕实例上全部库（含 mysql 等系统库，一般至少配一个收窄范围）</td></tr>
<tr><td><code>table.include.list</code></td><td><code>inventory.customers</code></td><td>允许捕获的表，条目形如 <code>&lt;库名&gt;.&lt;表名&gt;</code>（MySQL 没有独立 schema 层，库名即第一段），逗号分隔的正则。不在名单里的表被静默过滤。可热更（本文验证环节会靠它加新表）</td></tr>
<tr><td><code>snapshot.mode</code></td><td><code>initial</code></td><td>快照策略。可选 <code>initial</code>（默认，无位移时先全量快照再流式）、<code>never</code>（从不快照，只从 binlog 当前位点开始）、<code>when_needed</code>（位移丢失或 binlog 已清理时自动重新快照）、<code>schema_only</code>（只快照表结构不快照数据，适合下游已有存量的场景）。本地验证用默认 <code>initial</code></td></tr>
<tr><td><code>schema.history.internal.kafka.bootstrap.servers</code></td><td><code>kafka:19092</code></td><td>MySQL 特有。表结构历史（DDL 事件流）要存到 Kafka，此项指定存到哪个集群；不填连接器起不来。值用 Connect 容器内可达的地址（本例同集群用容器名 + 内部端口 19092）</td></tr>
<tr><td><code>schema.history.internal.kafka.topic</code></td><td><code>schemahistory.mysqlcdc</code></td><td>存放表结构历史的 topic 名，单调日志型。惯例命名 <code>schemahistory.&lt;topic.prefix&gt;</code>；多个连接器的 history topic 不能共用，否则表结构互相污染。不可热更</td></tr>
</tbody>
</table>

:::warning[部分配置不可热更]
`topic.prefix`、`database.server.id`、`schema.history.internal.kafka.topic` 等改了会导致位移与结构历史错乱，不能通过 PUT 在线修改，需要先 DELETE 连接器再重新注册。可热更的通常是与捕获范围、编码相关的项，如 `table.include.list`、`decimal.handling.mode`、`topic.creation.*`。
:::

## 第四步：数据验证

连接器 RUNNING 后，做一轮完整的增删改变更。以下全部为实际执行过的命令与真实输出（消息里的时间戳、GTID、binlog 位点每次都会不同，看结构即可）。

<details open>
<summary>不一定非要 `docker exec`</summary>

本文的 Kafka 操作统一用 `docker exec kafka ...`（容器内走 `19092` 监听），数据库操作用 `mysql` 命令行，保证命令可以直接复制执行。实际操作时完全可以用更顺手的方式，效果等价：

- **Kafka**：宿主机装了 Kafka 客户端时，直接走外部监听器 `9092`，不用进容器：

  ```bash
  $ ./kafka-topics.sh --bootstrap-server localhost:9092 --list
  $ ./kafka-console-consumer.sh --bootstrap-server localhost:9092 \
    --topic mysqlcdc.inventory.orders --from-beginning
  ```

- **MySQL**：端口 3306 已映射到宿主机，用 DataGrip、Navicat 等客户端连 `localhost:3306`（账号 `root` / `admin`），建表和增删改都在图形界面里做，本文的 SQL 逐条执行即可。
</details>

### 4.1 存量快照验证

首次注册且 `snapshot.mode=initial` 时，连接器把表里已有数据以 `op=r`（read）事件发出。`customers` 表已有 alice 和 bob1 两行，消费 topic 看一眼：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:19092 --topic mysqlcdc.inventory.customers \
  --from-beginning --timeout-ms 4000 --property print.key=true"

{"id":1}	{"before":null,"after":{"id":1,"name":"alice","email":"alice@new.com","updated_at":"2026-08-15T19:53:53Z"},"source":{"version":"2.7.3.Final","connector":"mysql","name":"mysqlcdc","ts_ms":1786830599000,"snapshot":"first","db":"inventory","sequence":null,"ts_us":1786830599000000,"ts_ns":1786830599000000000,"table":"customers","server_id":0,"gtid":null,"file":"mysql-bin.000001","pos":3458,"row":0,"thread":null,"query":null},"transaction":null,"op":"r","ts_ms":1786783799210,"ts_us":1786783799210737,"ts_ns":1786783799210737138}

{"id":3}	{"before":null,"after":{"id":3,"name":"bob1","email":"bob@gmail.com","updated_at":"2026-08-15T19:57:46Z"},"source":{"version":"2.7.3.Final","connector":"mysql","name":"mysqlcdc","ts_ms":1786830599000,"snapshot":"last","db":"inventory",...},"transaction":null,"op":"r","ts_ms":1786783799211,...}
```

两行各一条 `op=r` 消息，第一条 `snapshot` 为 `first`、最后一条为 `last`，快照链路正常。注意两个与 PG 不同的细节：

- `updated_at` 是 ISO-8601 字符串（`"2026-08-15T19:53:53Z"`），不是 PG 那样的微秒时间戳数字。MySQL 的 DATETIME/TIMESTAMP 默认按 `time.precision.mode=adaptive` 编码为字符串，消费端解析时注意区分。
- `source` 里是 `file`/`pos`/`gtid`（binlog 文件名与位点、GTID），对应 PG 的 `lsn`，同样单调递增、可用于对账排序；快照阶段这些字段是快照锁定位点，`server_id` 为 0、`gtid` 为 null 属正常现象。

### 4.2 新建表：DDL topic 与数据 topic 是两回事

:::info[重要：MySQL 连接器会捕获 DDL]
与 PG 连接器不同，MySQL 连接器会捕获库表结构变更（DDL）。建库、建表、改表等事件被发到一个与 `topic.prefix` 同名的 topic（本例为 `mysqlcdc`），同时表结构变更也会写入 `schemahistory.mysqlcdc` 供连接器重启时回放。但**行级数据 topic 依然要等到第一条数据消息发出时才创建**，建空表不会产生 `mysqlcdc.inventory.表名`。
:::

先故意踩一个坑：连接器的 `table.include.list` 目前只有 `inventory.customers`。现在建一张新表并插入数据：

```bash
$ docker exec mysql sh -c "mysql -uroot -padmin inventory -e \"
CREATE TABLE orders (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no    VARCHAR(32) NOT NULL,
  amount      DECIMAL(10,2),
  status      SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO orders(order_no, amount, status) VALUES ('SO-20260815-001', 18.50, 0);\""
```

查 topic 列表：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list" | grep mysql
mysqlcdc
mysqlcdc.inventory.customers
schemahistory.mysqlcdc
```

`mysqlcdc.inventory.orders` 没出现，Debezium 日志也没有任何报错。原因与 PG 那篇相同：**表不在 `table.include.list` 里**，不在捕获名单的表，数据变更被静默过滤。DDL 事件倒是不受白名单影响（`CREATE TABLE orders` 已经进了 `mysqlcdc` 这个 topic），不要看到 DDL 有消息就以为数据也被捕了。

用 PUT 把新表加进名单（body 必须是完整 config，且**不含 `name`/`config` 外壳**）：

```bash
$ curl -s -X PUT http://localhost:8083/connectors/mysql-connector/config \
  -H "Content-Type: application/json" \
  -d '{
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "topic.prefix": "mysqlcdc",
    ...其余配置原样保留...,
    "table.include.list": "inventory.customers,inventory.orders"
  }'
```

PUT 后连接器自动重启任务，再查 topic：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list" | grep mysql
mysqlcdc
mysqlcdc.inventory.customers
mysqlcdc.inventory.orders
schemahistory.mysqlcdc
```

topic 出现了，`topic.creation.*` 生效（副本数 1、分区数 1）：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 \
  --describe --topic mysqlcdc.inventory.orders"

Topic: mysqlcdc.inventory.orders	PartitionCount: 1	ReplicationFactor: 1
```

:::caution[改白名单前的数据可能补发，但别指望它]
本次验证里有个值得玩味的现象：白名单扩大、任务重启后，改名单**之前**插入的那行（id=1）也补发了一条 `op=c`。原因是那行 INSERT 之后连接器一直没有发出过消息、位移未提交，重启后从上次提交的 binlog 位点重读，此时新名单已包含 orders，于是被发了出来。但这个行为依赖「位移恰好还没越过该变更」，只要中间发生过别的有效写入，位点一提交就再也补不回来。稳妥做法永远是**先改白名单，再写数据**；真要补历史数据用增量快照（signal 表方式）。
:::

### 4.3 新增数据：op=c 消息

```bash
$ docker exec mysql sh -c "mysql -uroot -padmin inventory -e \
  \"INSERT INTO orders(order_no, amount, status) VALUES ('SO-20260815-002', 99.90, 0);\""
```

消费（`print.key=true` 把消息 key 也打出来，key 与 value 之间用制表符分隔）：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:19092 --topic mysqlcdc.inventory.orders \
  --from-beginning --timeout-ms 4000 --property print.key=true"

{"id":2}	{"before":null,"after":{"id":2,"order_no":"SO-20260815-002","amount":"99.90","status":0,"created_at":"2026-08-15T08:52:11Z"},"source":{"version":"2.7.3.Final","connector":"mysql","name":"mysqlcdc","ts_ms":1786783931885,"snapshot":"false","db":"inventory","sequence":null,"ts_us":1786783931885121,"ts_ns":1786783931885121000,"table":"orders","server_id":1,"gtid":"dc503f2f-9492-11f0-b7eb-1624dbc0b346:13","file":"mysql-bin.000001","pos":4524,"row":0,"thread":66,"query":null},"transaction":null,"op":"c","ts_ms":1786783931886,"ts_us":1786783931886753,"ts_ns":1786783931886753873}
```

INSERT 消息的要点：

- **key** 是 `{"id":2}`，表主键。Kafka 按 key 哈希分区，同一行的所有变更落同一分区、保持顺序。
- `before` 为 null（新增没有旧值），`after` 是完整的整行新值。
- `amount` 是字符串 `"99.90"`，这是 `decimal.handling.mode=string` 的效果，三种模式对比见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#DECIMAL-字段编码)。
- `source.gtid`、`source.file`/`source.pos` 定位该变更在 binlog 中的位置，`source.server_id` 是执行该写入的 MySQL 实例的 server-id。

### 4.4 修改数据：op=u 消息

```bash
$ docker exec mysql sh -c "mysql -uroot -padmin inventory -e \
  \"UPDATE orders SET amount = 128.00, status = 2 WHERE id = 2;\""
```

对应消息：

```json
{"id":2}	{
  "before": {"id":2,"order_no":"SO-20260815-002","amount":"99.90","status":0,"created_at":"2026-08-15T08:52:11Z"},
  "after": {"id":2,"order_no":"SO-20260815-002","amount":"128.00","status":2,"created_at":"2026-08-15T08:52:11Z"},
  "source": {"name":"mysqlcdc","db":"inventory","table":"orders","gtid":"dc503f2f-...:14","file":"mysql-bin.000001","pos":4908},
  "op": "u",
  "ts_ms": 1786783944918
}
```

UPDATE 消息的要点：

- `after` 是修改后的整行，不只是被改的列。
- **`before` 是修改前的完整整行**，这是 MySQL 侧最舒服的地方：只要 `binlog_row_image=FULL`（默认），UPDATE 和 DELETE 天然带完整旧值镜像，不需要像 PG 那样逐表设置 `REPLICA IDENTITY FULL`。若发现 `before` 不完整，先检查服务器的 `binlog_row_image`。
- key 仍是 `{"id":2}`，与该行 INSERT 消息同分区，消费端按 offset 顺序读即是真实变更顺序。

### 4.5 删除数据：op=d 消息与墓碑

```bash
$ docker exec mysql sh -c "mysql -uroot -padmin inventory -e \"DELETE FROM orders WHERE id = 1;\""
```

对应消息（实际是连着的两条）：

```json
{"id":1}	{"before":{"id":1,"order_no":"SO-20260815-001","amount":"18.50","status":0,"created_at":"2026-08-15T08:50:43Z"},"after":null,"source":{...,"table":"orders","gtid":"dc503f2f-...:15"},"op":"d","ts_ms":1786783957709}

{"id":1}	null
```

DELETE 的要点：

- `after` 为 null；`before` 是被删行的**完整旧值**（同样是 `binlog_row_image=FULL` 的功劳，对比 PG 默认 REPLICA IDENTITY 下只能拿到主键拼的伪行，这里的 `before` 是可直接用于撤销/审计的）。
- 紧随其后 key 相同、value 为 `null` 的一条是**墓碑消息**（tombstone），语义与 PG 侧完全相同，供 compacted topic 与下游按 key 清理状态用。

至此建表、新增、修改、删除全部验证通过，端到端链路（MySQL → binlog → Debezium → Kafka topic）确认可用。

## 与 PostgreSQL 连接器的差异速查

两边都跑过的话，用这张表对照记忆：

| 维度 | PostgreSQL | MySQL |
| --- | --- | --- |
| 数据来源 | WAL 逻辑解码（`wal_level=logical` + 复制槽） | binlog 复制协议（`binlog_format=ROW`） |
| DDL | 不捕获，无 DDL 消息 | 捕获，发往与 `topic.prefix` 同名的 topic，另写 schema history topic |
| 完整旧值镜像 | 需逐表 `ALTER TABLE ... REPLICA IDENTITY FULL`，默认只有主键 | 服务器级 `binlog_row_image=FULL`（默认），全库天然生效 |
| 库级范围 | 一个连接器一个库（`database.dbname`） | 一个连接器可捕多库（`database.include.list`） |
| 表标识 | `<schema>.<表>` 两段 | `<库名>.<表>` 两段（库名充当第一段） |
| 位点与恢复 | 复制槽 + LSN，槽会卡 WAL 需手动清理 | binlog file/pos + GTID，无槽概念，靠 binlog 保留时长兜底 |
| 特有前置配置 | `max_replication_slots`、`max_wal_senders`、publication | `server-id`（连接器侧还要 `database.server.id`）、`gtid_mode` |
| 时间字段编码 | 默认微秒时间戳数字 | 默认 ISO-8601 字符串（`time.precision.mode=adaptive`） |
| 消息 `source` 特有字段 | `lsn`、`txId`、`xmin` | `gtid`、`file`、`pos`、`row`、`thread`、`server_id` |

消息结构（`before`/`after`/`op`/`source`/`ts_ms`）、墓碑消息、消费端顺序保证与下游同步、`message.key.columns` 自定义 key 等共性问题两边的语义一致，详见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#消息结构与字段速查) 与 [Debezium 消费与下游同步](./Debezium%20消费与下游同步.md)，此处不再重复。

## 监听多个数据库

把多个库加进 `database.include.list` 即可，逗号分隔的正则：

```json
"database.include.list": "inventory,billing",
"table.include.list": "inventory.orders,billing.invoices"
```

topic 自动按 `<prefix>.<库名>.<表>` 区分，消费时按库名选 topic。注意：

- 不要用裸 `.*` 匹配库，会把 `mysql`、`sys`、`information_schema`、`performance_schema` 系统库卷进来，一般至少显式列举业务库。
- CDC 账号的 `SELECT` 权限需覆盖所有目标库（本文的 GRANT 是全局 `*.*`，天然覆盖；若按库收窄，新增库时要记得补授权）。

## 数据 topic 不会自动创建

与 PG 侧完全相同：broker 关闭自动建 topic 后，数据 topic 依赖连接器的 `topic.creation.default.replication.factor` / `topic.creation.default.partitions` 自建（单节点副本数必须填 `1`），否则连接器 RUNNING 但数据发不出去。现象与两种解决办法见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#数据-topic-不会自动创建)，MySQL 连接器配置方式一字不差。

## 端口与网络

Kafka 端口（宿主机 `9092`、容器内 `19092`）与源库地址写法（`database.hostname` 必须是 Connect 容器可解析的地址：同一 Compose 用容器名，跨网络用 `host.docker.internal` 或共享网络）与 PG 侧一致，详见 [端口与网络](./PostgreSQL%20连接器.md#端口与网络)。MySQL 端口 `3306` 已映射宿主机，DataGrip/Navicat 直连 `localhost:3306` 即可。

## 踩坑总结与最佳实践

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 注册直接 400：`The 'database.server.id' value is invalid: A value is required` | 部分环境下 `database.server.id` 无默认值 | 显式配置 `database.server.id`，取不与源库/从库冲突的大数 |
| PUT 改配置返回 500（`Cannot deserialize value of type String ... reference chain: ["config"]`） | PUT body 传了带 `name`/`config` 外壳的注册 JSON | PUT 的 body 是裸 config（`GET /connectors/{name}/config` 的返回形态） |
| 连接器 RUNNING 但新表无 topic、无消息 | 新表不在 `table.include.list`，被静默过滤（DDL 有消息不代表数据被捕） | PUT 扩大白名单（先改名单再写数据） |
| 连接器 RUNNING 但无数据 topic、Debezium 日志反复 `UNKNOWN_TOPIC_OR_PARTITION` | broker 关闭自动建、连接器没配 `topic.creation.*` | 连接器配 `topic.creation.default.replication.factor/partitions`，单节点副本数填 `1` |
| UPDATE/DELETE 的 `before` 不完整 | 服务器 `binlog_row_image` 不是 FULL | `binlog_row_image=FULL`（配合 `binlog_row_metadata=FULL`） |
| 长时间停机后重启，快照重跑或报 binlog 位点不存在 | offset 对应的 binlog 已被清理 | 调大 `binlog_expire_logs_seconds` 覆盖最长停机；或接受 `snapshot.mode=when_needed` 自动重快照 |
| 连接器反复断开重连 binlog | `database.server.id` 与源库或其他从库冲突 | 换一个全局唯一的 `database.server.id` |
| 删除重注册后快照 SKIPPED、存量数据不重发 | `topic.prefix` 相同会复用 `debezium_offsets` 里的旧位移 | 确需重跑快照时删连接器后调 `DELETE /connectors/mysql-connector/offsets` 清位移再重注册（异步，稍等片刻） |
| 多实例 Connect 部署后两个任务互踢 | 两个连接器用了相同 `database.server.id` | 每个连接器独立取值 |
| `amount` 是 `\{"scale":2,"value":"..."\}` 看不懂 | 默认 `precise` 编码 | 改 `decimal.handling.mode=string`（或 `double`） |

推荐的基线连接器配置（单节点集群，已合并最小权限账号、topic 自建与金额字段可读）：

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "topic.prefix": "mysqlcdc",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "Admin@123",
    "database.server.id": "184001",
    "database.include.list": "inventory",
    "table.include.list": "inventory.customers,inventory.orders",
    "decimal.handling.mode": "string",
    "snapshot.mode": "initial",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:19092",
    "schema.history.internal.kafka.topic": "schemahistory.mysqlcdc",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.partitions": "1"
  }
}
```

## 参考来源

- [Debezium: MySQL 连接器](https://debezium.io/documentation/reference/stable/connectors/mysql.html)：连接器配置项、数据库前置条件与消息格式说明。
- [MySQL 8.0 Reference: Replication and Binary Logging Options](https://dev.mysql.com/doc/refman/8.0/en/replication-options.html)：`binlog_format`、`binlog_row_image`、`binlog_row_metadata`、GTID 等服务器参数说明。
