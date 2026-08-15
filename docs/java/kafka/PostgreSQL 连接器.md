在已部署的 Kafka Connect 上注册 Debezium PostgreSQL 连接器，把 PostgreSQL 的行级变更实时投递到 Kafka topic。本文按实际操作顺序一步步走：准备账号、注册连接器、逐项讲清配置、最后做数据验证（建表、INSERT、UPDATE、DELETE），跟着做即可在本地完整跑通。

:::tip[环境约定]
后续命令基于示例 Compose 仓库 [github.com/magicianlib/dockerfiles](https://github.com/magicianlib/dockerfiles) 搭建的环境：

```
.
├── kafka
│   └── debezium-connect
└── pgsql17
```

- Kafka：
  - 容器内监听端口 19092
  - 宿主机端口 9092
  - 已关闭 broker 自动建 topic
- debezium
  - REST 端口 8083
- PostgreSQL：
  - 账号密码 admin/admin123
  - 库名 shop

Kafka 与 Connect 的部署细节见 [Docker Compose 部署](./Docker%20Compose%20部署.md)。
:::

## 第一步：确认数据库前置条件

Debezium 通过 PostgreSQL 的逻辑解码读取变更日志，源库需满足以下条件。

服务器参数（改完需重启 PostgreSQL 才生效）：

| 参数 | 要求 | 说明 |
| --- | --- | --- |
| `wal_level` | `logical` | 开启逻辑解码，WAL 流中带上行级变更的前后镜像；默认值 `replica` 只保留物理复制所需的信息，无法解析出行变更 |
| `max_replication_slots` | ≥1 | 复制槽数量上限，每个连接器占用一个槽。默认 10，一般够用；槽按「连接器数 + 预留」规划，比如 3 个连接器留 2 个余量给临时调试工具，设 5 即可。设大了无谓占用，真正的风险是槽泄漏（建了不删），所以宁少勿多 |
| `max_wal_senders` | ≥1 | WAL 发送进程上限，逻辑复制槽、物理流复制备库、`pg_basebackup` 都各占一个 sender。默认 10；有物理备库时按「连接器数 + 备库数 + 备份任务余量」来定，如 2 个连接器加 1 个备库设 5。超限时新建复制连接会直接报错，但设太大也不增加常驻开销（进程按需启动），适当放宽没有坏处 |

本仓库的 `pgsql17/conf/postgresql.conf` 已配置好这三项。容器内的确认方法：

```bash
$ docker exec postgres sh -c "psql -U admin -d shop -c 'SHOW wal_level;'"
 wal_level
-----------
 logical
```

看到 `logical` 即可继续；如果是 `replica`，说明配置没生效，先回去检查配置文件挂载，不要急着注册连接器。

:::warning[槽会阻止 WAL 清理]
复制槽会保留住未消费的 WAL，连接器长期停用时槽里的 WAL 越积越多，磁盘会被撑满。停用一个连接器后如果确定不再用，记得删掉对应槽：`SELECT pg_drop_replication_slot('槽名');`
:::

其他要点：

- **逻辑解码插件**：Debezium 2.x 默认用 PostgreSQL 内置的 `pgoutput`（PG10+ 自带，无需额外安装）。老教程里的 `decoderbufs` 需要自行编译安装，官方 postgres 镜像里没有，用默认的 `pgoutput` 即可。
- **REPLICA IDENTITY**：默认 `DEFAULT`，UPDATE/DELETE 消息的 `before` 只有主键列。要完整旧值镜像需表级设置 `ALTER TABLE 表名 REPLICA IDENTITY FULL`（本文验证用的 `customers` 表已设置，`orders` 表没有，正好对比两种行为）。
- **主键**：被捕获的表必须有主键。无主键时消息没有稳定 key，变更散落到不同分区，顺序无法保证。

## 第二步：创建最小权限账号

连接器需要一个具备逻辑复制权限的账号。本地调试可以直接用超管账号（具备隐式复制权限），但生产环境务必用下面的最小权限账号。

在目标数据库里执行（`psql` 必须先进入库 `\c shop` 或 `psql -d shop`，权限类语句不能用 `库名.schema` 形式跨库执行）：

```sql
BEGIN;

-- 创建用于 CDC 的登录账号，必须具备逻辑复制权限
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD 'Admin@123';

-- 允许连接到目标数据库
GRANT CONNECT ON DATABASE shop TO debezium;

-- 授予 schema 使用权限与现有表读取权限（public 仅为示例，替换为实际 schema）
GRANT USAGE ON SCHEMA public TO debezium;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;

-- （可选）后续新建表自动获得读取权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium;

COMMIT;
```

逐条说明：

- `REPLICATION`：允许创建复制槽、建立逻辑复制连接，这是 CDC 的核心权限，没有它连接器起不来。
- `GRANT CONNECT ON DATABASE`：账号能连上这个库。
- `GRANT USAGE ON SCHEMA`：能访问 schema 里的对象；没有它，即使表有 SELECT 权限也读不了。
- `GRANT SELECT ON ALL TABLES`：快照阶段要全表读取存量数据。
- `ALTER DEFAULT PRIVILEGES`：让以后新建的表自动继承 SELECT 权限，省得每建一张表就补一次授权。注意它只对「执行这条语句之后该角色新建的表」生效，已存在的表仍需上一条 `GRANT SELECT` 覆盖。

:::caution[PG15+ 还差一步]
PostgreSQL 15 起，对数据库执行 `CREATE PUBLICATION ... FOR ALL TABLES` 需要超管权限，最小权限账号没有。而 Debezium 首次启动时会尝试自动创建 publication，于是任务直接 FAILED，日志报 `permission denied for database shop`。解决办法是用超管**预建**同名 publication（连接器看到已存在就不再创建，只会校验和复用）：

```sql
-- 用超管账号（本环境为 admin）在目标库执行
CREATE PUBLICATION dbpublication FOR ALL TABLES;
```

`dbpublication` 是自定义名字（库内唯一即可），但**必须与第三步连接器配置里的 `publication.name` 完全一致**：Debezium 启动时按 `publication.name` 的值去数据库找 publication，找到就复用，找不到才尝试创建。名字对不上时预建等于白建，连接器还是会因权限不足而失败。

这是 PG15+ 最小权限方案下必踩的坑，本文注册连接器前会先执行它。
:::

## 第三步：注册连接器

通过 Kafka Connect 的 REST API 注册，`POST /connectors`，请求体含连接器名与配置。把下面的 JSON 存成 `register-pg.json`：

```json
{
  "name": "pg-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "topic.prefix": "pgcdc",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "Admin@123",
    "database.dbname": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_pg_shop",
    "publication.name": "dbpublication",
    "table.include.list": "public.customers",
    "decimal.handling.mode": "string",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.partitions": "1"
  }
}
```

注册：

```bash
$ curl -i -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @register-pg.json

HTTP/1.1 201 Created
{"name":"pg-connector","config":{...},"tasks":[],"type":"source"}
```

返回 `201` 只是连接器登记成功，任务还没跑起来，紧接着必须查状态：

```bash
$ curl -s http://localhost:8083/connectors/pg-connector/status

{"name":"pg-connector","connector":{"state":"RUNNING","worker_id":"172.20.0.3:8083"},
 "tasks":[{"id":0,"state":"RUNNING","worker_id":"172.20.0.3:8083"}],"type":"source"}
```

`connector.state` 和 `tasks[].state` 都是 `RUNNING` 才算注册成功。若 `tasks[].state` 是 `FAILED`，`tasks[].trace` 里就是报错堆栈，对照 [踩坑总结](#踩坑总结与最佳实践) 排查。

:::info[关于 REST API]
以上均通过 Connect 的 REST API 完成。后续的管理操作也都用它，常用端点：

| 操作 | 方法与路径 | 说明 |
| --- | --- | --- |
| 列出全部连接器 | `GET /connectors` | 返回连接器名数组 |
| 查看状态 | `GET /connectors/{name}/status` | 失败时 `tasks[].trace` 是报错堆栈 |
| 查看配置 | `GET /connectors/{name}/config` | 返回当前完整 config |
| 修改配置 | `PUT /connectors/{name}/config` | body 为**完整** config，整体替换；改完自动重启任务 |
| 删除 | `DELETE /connectors/{name}` | 删除连接器，默认不删复制槽 |
| 重启任务 | `POST /connectors/{name}/tasks/0/restart` | 重启指定任务 |
| 暂停/恢复 | `PUT /connectors/{name}/pause`、`/resume` | 暂停后停止消费，恢复后继续 |

:::

### 配置项详解

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
<tr><td><code>name</code></td><td><code>pg-connector</code></td><td>连接器名称，集群内唯一（重名注册返回 409）。出现在 REST 路径与内部配置 topic 的键里，建议只用字母、数字、<code>-</code>、<code>_</code>、<code>.</code>。不在 <code>config</code> 内、无法用 PUT 改名，改名需删后重建，一次定好</td></tr>
<tr><td><code>connector.class</code></td><td><code>io.debezium.connector.postgresql.PostgresConnector</code></td><td>连接器实现类，PG 固定用这个。可用 <code>GET /connector-plugins</code> 查 Connect 已安装的全部类</td></tr>
<tr><td><code>topic.prefix</code></td><td><code>pgcdc</code></td><td>数据 topic 前缀，最终 topic 名为 <code>\<topic.prefix\>.\<schema\>.\<表\></code>，本例即 <code>pgcdc.public.orders</code>。集群内所有连接器的前缀必须唯一，否则不同库的数据会混进同一批 topic；旧名 <code>database.server.name</code> 已废弃。不可热更，改了等于换一套 topic，只能删了重建</td></tr>
<tr><td><code>database.hostname</code></td><td><code>postgres</code></td><td>数据库地址。必须是 Connect <strong>容器内</strong>能解析的地址：源库与 Connect 同一网络用容器名（本例）；跨 Compose/网络用 <code>host.docker.internal</code>（Mac/Win）或共享网络，详见 <a href="#端口与网络">端口与网络</a></td></tr>
<tr><td><code>database.port</code></td><td><code>5432</code></td><td>数据库端口，默认 5432</td></tr>
<tr><td><code>database.user</code> / <code>database.password</code></td><td><code>debezium</code> / <code>Admin@123</code></td><td>第二步创建的 CDC 账号</td></tr>
<tr><td><code>database.dbname</code></td><td><code>shop</code></td><td>要捕获的数据库名。一个连接器只能捕一个库，多库需注册多个连接器</td></tr>
<tr><td><code>plugin.name</code></td><td><code>pgoutput</code></td><td>逻辑解码插件。可选 <code>pgoutput</code>（PG10+ 内置，2.x 默认，推荐）、<code>decoderbufs</code>（需自行编译装进 PG，老版本用）、<code>wal2json</code>（第三方，输出 JSON）、<code>wal2json-rds</code>/<code>wal2json-streaming</code>（AWS RDS 场景）。没有特殊理由用默认 <code>pgoutput</code> 即可</td></tr>
<tr><td><code>slot.name</code></td><td><code>debezium_pg_shop</code></td><td>逻辑复制槽名，连接器自动创建并独占。必须全小写、符合 PG 槽命名规则、集群内唯一。默认名是 <code>debezium.database.name</code>，建议显式命名。不可热更；改名前要先用旧名删掉旧槽，否则旧槽残留继续卡 WAL</td></tr>
<tr><td><code>publication.name</code></td><td><code>dbpublication</code></td><td>pgoutput 模式下的 publication 名，Debezium 启动时按此值查找，不存在才自动创建（默认 <code>dbz_publication</code>）。配了最小权限账号时，需超管预建<strong>同名</strong> publication（见第二步的坑）</td></tr>
<tr><td><code>table.include.list</code></td><td><code>public.customers</code></td><td>允许捕获的 schema.表，逗号分隔的正则，如 <code>public.customers,public.orders</code> 或 <code>public.*</code>。不在名单里的表不产生任何消息和 topic。可热更（本文验证环节会靠它加新表）</td></tr>
<tr><td><code>schema.include.list</code></td><td>（未配）</td><td>允许捕获的 schema 白名单。配了 <code>table.include.list</code> 时通常不必再配；不配两个 include.list 时默认捕所有库内 schema（含系统 schema），一般至少配一个收窄范围</td></tr>
<tr><td><code>decimal.handling.mode</code></td><td><code>string</code></td><td>DECIMAL/NUMERIC 字段编码：<code>precise</code>（默认，<code>\{"scale":1,"value":"ALk="\}</code>，无精度损失但难读）、<code>double</code>（直接是数字，直观但有浮点精度风险）、<code>string</code>（字符串 <code>"18.50"</code>，可读且无精度损失，金额类推荐）。本例选 <code>string</code>，验证消息里 <code>amount</code> 的效果一目了然</td></tr>
<tr><td><code>topic.creation.default.replication.factor</code></td><td><code>1</code></td><td>自动创建数据 topic 的副本数。可选 <code>1</code>、<code>-1</code>（用 broker 默认）。单节点集群必须填 <code>1</code>，填 <code>-1</code> 时 broker 默认副本数为 3 会建不出来</td></tr>
<tr><td><code>topic.creation.default.partitions</code></td><td><code>1</code></td><td>自动创建数据 topic 的分区数。可选 <code>1</code>、<code>-1</code>（用 broker 默认 <code>num.partitions</code>）。单节点验证环境填 <code>1</code> 足够；生产按吞吐规划，分区数影响并行度但同 key 仍保序</td></tr>
</tbody>
</table>

后两个 `topic.creation.*` 是本环境（broker 关闭了自动建 topic）让 Debezium 自建数据 topic 的关键，原理见 [数据 topic 不会自动创建](#数据-topic-不会自动创建)。

:::warning[部分配置不可热更]
`topic.prefix`、`slot.name` 等属性改了会导致位移语义错乱，不能通过 PUT 在线修改，需要先 DELETE 连接器、清理复制槽后再用新值重新注册。可热更的通常是与捕获范围、编码相关的项，如 `table.include.list`、`decimal.handling.mode`、`topic.creation.*`。
:::

## 第四步：数据验证

连接器 RUNNING 后，做一轮完整的增删改变更，确认事件真的流到了 Kafka。以下全部为实际执行过的命令与真实输出（消息里的时间戳、LSN 每次都会不同，看结构即可）。

<details open>
<summary>不一定非要 `docker exec`</summary>

本文的 Kafka 操作统一用 `docker exec kafka ...`（容器内走 `19092` 监听），数据库操作用 `psql` 命令行，保证命令可以直接复制执行。实际操作时完全可以用更顺手的方式，效果等价：

- **Kafka**：宿主机装了 Kafka 客户端（或解压了官方发行包）时，直接走外部监听器 `9092`，不用进容器：

  ```bash
  $ ./kafka-topics.sh --bootstrap-server localhost:9092 --list
  $ ./kafka-console-consumer.sh --bootstrap-server localhost:9092 \
    --topic pgcdc.public.orders --from-beginning
  ```

  也可以用 Kafbat UI / Kafka Tool 等图形界面直接浏览 topic 和消息。注意只有 `9092` 映射到了宿主机，容器内的 `19092` 宿主机连不上。

- **PostgreSQL**：端口 5432 已映射到宿主机，用 DataGrip、Navicat、DBeaver 等 UI Client 连 `localhost:5432`（账号 `admin` / `admin123`，库 `shop`），建表和增删改都在图形界面里做，本文的 SQL 逐条执行即可。

:::caution[别在 UI 里长期挂着空闲连接]
执行 `ALTER DATABASE ... RENAME` 这类需要独占库的操作时，UI Client 里开着的查询标签页会占住连接导致操作失败，先关掉该库的标签页再执行。
:::
</details>

### 4.1 存量快照验证

首次注册且 `snapshot.mode` 默认 `initial` 时，连接器会把表里已有数据以 `op=r`（read）事件发出。`customers` 表已有 carol 和 dave1 两行，消费 topic 看一眼：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:19092 --topic pgcdc.public.customers \
  --from-beginning --timeout-ms 4000"

{"before":null,"after":{"id":1,"name":"carol","email":"carol@example.com","updated_at":1786776712383248},"source":{"version":"2.7.3.Final","connector":"postgresql","name":"pgcdc","ts_ms":1786781244954,"snapshot":"first","db":"shop","sequence":"[null,\"29477408\"]","schema":"public","table":"customers","txId":778,"lsn":29477408},"transaction":null,"op":"r","ts_ms":1786781245015}

{"before":null,"after":{"id":2,"name":"dave1","email":"dave@example.com","updated_at":1786776821575148},"source":{"version":"2.7.3.Final","connector":"postgresql","name":"pgcdc","ts_ms":1786781244954,"snapshot":"last","db":"shop","sequence":"[null,\"29477408\"]","schema":"public","table":"customers","txId":778,"lsn":29477408},"transaction":null,"op":"r","ts_ms":1786781245017}
```

两行各一条 `op=r` 消息，第一条 `snapshot` 为 `first`、最后一条为 `last`（标记快照边界，中间行为 `true`），快照链路正常。命令里 `--timeout-ms 4000` 是让消费者读完存量后自动退出，避免挂住终端。

### 4.2 新建表：topic 何时出现

:::info[重要：PG 连接器不捕获 DDL]
PostgreSQL 连接器只捕获行级数据变更（DML），CREATE/ALTER/DROP 等表结构变更不产生任何事件。所以**建表本身不会创建 topic**，topic 要等到第一条数据消息发出时才会创建。空表 = 无消息 = 无 topic。
:::

先故意踩一个坑：连接器的 `table.include.list` 目前只有 `public.customers`。现在建一张新表并插入数据：

```bash
$ docker exec -i postgres sh -c "psql -U admin -d shop" <<'SQL'
CREATE TABLE public.orders (
    id          BIGINT PRIMARY KEY,
    order_no    VARCHAR(32) NOT NULL,
    amount      NUMERIC(10,2),
    status      SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
SQL

$ docker exec postgres sh -c "psql -U admin -d shop -c \
  \"INSERT INTO public.orders(id, order_no, amount, status) VALUES (1001, 'SO-20260815-001', 18.50, 0);\""
```

等几秒再查 topic 列表：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list"
pgcdc.public.customers
```

`pgcdc.public.orders` 没出现，且 Debezium 日志没有任何报错。原因就是**表不在 `table.include.list` 里**：不在捕获名单的表，数据变更被静默过滤。新建表后必须同步扩大表白名单，这是最容易漏的一步。

用 PUT 把新表加进名单（注意 body 必须是完整 config，不能只传改动字段）：

```bash
$ curl -s -X PUT http://localhost:8083/connectors/pg-connector/config \
  -H "Content-Type: application/json" \
  -d '{
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "topic.prefix": "pgcdc",
    ...其余配置原样保留...,
    "table.include.list": "public.customers,public.orders"
  }'
```

PUT 后连接器自动重启任务。再查 topic：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list"
pgcdc.public.customers
pgcdc.public.orders
```

topic 出现了，`topic.creation.*` 生效（副本数 1、分区数 1，按我们配置创建）：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 \
  --describe --topic pgcdc.public.orders"

Topic: pgcdc.public.orders	PartitionCount: 1	ReplicationFactor: 1
```

注意：改白名单前插入的那行数据（把 orders 加入名单之前的历史数据）**不会补发**，名单生效后写入的变更才有消息。

:::note[关于 publication 与 FOR ALL TABLES]
第二步预建的 publication 是 `FOR ALL TABLES`，新建表自动纳入，无需手工 `ALTER PUBLICATION ... ADD TABLE`。反过来，FOR ALL TABLES 的 publication 也不允许 ADD/DROP TABLE（会报 `publication is defined as FOR ALL TABLES`），要么全靠自动，要么改用显式表清单的 publication 并在建表后手工维护。
:::

### 4.3 新增数据：op=c 消息

```bash
$ docker exec postgres sh -c "psql -U admin -d shop -c \
  \"INSERT INTO public.orders(id, order_no, amount, status) VALUES (1002, 'SO-20260815-002', 99.90, 0);\""
```

消费（`--property print.key=true` 会把消息 key 也打出来，key 与 value 之间用制表符分隔）：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:19092 --topic pgcdc.public.orders \
  --from-beginning --timeout-ms 4000 --property print.key=true"

{"id":1002}	{"before":null,"after":{"id":1002,"order_no":"SO-20260815-002","amount":"99.90","status":0,"created_at":1786781313038293},"source":{"version":"2.7.3.Final","connector":"postgresql","name":"pgcdc","ts_ms":1786781313038,"snapshot":"false","db":"shop","sequence":"[\"29648056\",\"29648112\"]","schema":"public","table":"orders","txId":781,"lsn":29648112,"xmin":null},"transaction":null,"op":"c","ts_ms":1786781313079}
```

INSERT 消息的要点：

- **key** 是 `{"id":1002}`，表主键。Kafka 按 key 哈希分区，同一行的所有变更落同一分区、保持顺序。
- `before` 为 null（新增没有旧值），`after` 是完整的整行新值。
- `amount` 是字符串 `"99.90"`，这就是 `decimal.handling.mode=string` 的效果；若用默认 `precise`，这里是 `{"scale":2,"value":"ARG=\"}` 这样的 base64 编码。
- `op=c`（create），`source.lsn` 是该变更在 WAL 中的位点，单调递增，可用于对账排序。

### 4.4 修改数据：op=u 消息

```bash
$ docker exec postgres sh -c "psql -U admin -d shop -c \
  \"UPDATE public.orders SET amount = 128.00, status = 2 WHERE id = 1002;\""
```

对应消息：

```json
{"id":1002}	{
  "before": null,
  "after": {"id":1002,"order_no":"SO-20260815-002","amount":"128.00","status":2,"created_at":1786781313038293},
  "source": {"name":"pgcdc","db":"shop","schema":"public","table":"orders","txId":782,"lsn":29648384},
  "op": "u",
  "ts_ms": 1786781325221
}
```

UPDATE 消息的要点：

- `after` 是修改后的整行（**整行**，不只是被改的列）。
- `before` 为 null？orders 表用的是默认 REPLICA IDENTITY（`DEFAULT`），旧值只保留主键，Debezium 拿不到完整旧镜像就置 null。要拿到完整 `before`，执行 `ALTER TABLE public.orders REPLICA IDENTITY FULL` 后再试一次 UPDATE，`before` 就会是修改前的整行（`customers` 表就是这样配的）。
- key 仍是 `{"id":1002}`，与该行 INSERT 消息同分区，消费端按 offset 顺序读即是真实变更顺序。

### 4.5 删除数据：op=d 消息与墓碑

```bash
$ docker exec postgres sh -c "psql -U admin -d shop -c \"DELETE FROM public.orders WHERE id = 1001;\""
```

对应消息（实际是连着的两条）：

```json
{"id":1001}	{"before":{"id":1001,"order_no":"","amount":null,"status":0,"created_at":0},"after":null,"source":{...,"table":"orders","txId":783},"op":"d","ts_ms":1786781328258}

{"id":1001}	null
```

DELETE 的要点：

- `after` 为 null，`before` 在 REPLICA IDENTITY 为 `DEFAULT` 时是各列类型默认值拼出的「伪行」（字符串空、数值 0），基本没有业务价值，只能靠 key 知道删的是哪行；要可用的 `before` 同样需要 `REPLICA IDENTITY FULL`。
- 紧随其后 key 相同、value 为 `null` 的一条是**墓碑消息**（tombstone），不是错误。它供 Kafka 的 compacted topic 或下游按 key 清理状态用，日志压缩后保留每个 key 最后一条记录，墓碑标记该 key 可被清除。消费端遇到 value 为 null 且前一条是 `op=d`，一并按删除处理即可。

至此建表、新增、修改、删除全部验证通过，端到端链路（PostgreSQL → 逻辑解码 → Debezium → Kafka topic）确认可用。

## 消息结构与字段速查

汇总各字段的语义，供消费端开发对照：

| 字段 | 说明 |
| --- | --- |
| `before` / `after` | 变更前后的整行。INSERT 的 `before` 为 null，DELETE 的 `after` 为 null；UPDATE 的 `before` 取决于 REPLICA IDENTITY（见 4.4） |
| `op` | `r` 快照读、`c` 新增、`u` 更新、`d` 删除 |
| `source.db` / `schema` / `table` | 库、schema、表名；`schema` 是 PG 的 schema 名（业务数据，不是被去掉的结构描述块） |
| `source.lsn` / `txId` | 变更的 WAL 位点与事务 ID，单调递增，可用于对账 |
| `source.ts_ms` / 顶层 `ts_ms` | 分别是数据库侧提交时间与连接器处理时间，差值约等于端到端延迟 |
| 消息 key | 表主键的 JSON，决定分区与顺序 |

时间戳实际有三档精度：`ts_ms`/`ts_us`/`ts_ns`（毫秒/微秒/纳秒）。注意排序不要用 `source.ts_ns`：精度只到微秒（末尾常为 `000`），同一事务内多条变更时间戳相同无法区分；在线消费以 offset 为准，`source.lsn` 用于离线对账。

## 监听多个 schema

把多个 schema 加进白名单即可，都是逗号分隔的正则：

```json
"schema.include.list": "public,inventory",
"table.include.list": "public.*,inventory.*"
```

topic 自动按 `<prefix>.<schema>.<表>` 区分，消费时按 schema 选 topic。注意：

- 不要用裸 `.*` 匹配 schema 或表，否则会把 `pg_catalog`、`information_schema` 等系统 schema 卷进来报错，显式列举目标 schema。
- 专用 CDC 账号要对每个目标 schema 分别 `GRANT USAGE` 并对表 `GRANT SELECT`。

## 消息格式与精简

### 去掉每条消息的 schema 块

默认情况下每条消息外层带一个 `schema` 字段，重复描述整张表的结构（字段名、类型、是否可空等），与业务无关却占消息体绝大部分，单条可从几百字节膨胀到 3KB 以上。上面验证能直接看到可读 JSON，是因为 Compose 里已设置 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE=false`（注意 `debezium/connect` 镜像只识别 `CONNECT_` 前缀的变量）。关闭后新消息只剩 payload，体积降到原来的数分之一。已落盘的旧消息仍是旧格式。

### DECIMAL 字段编码

`DECIMAL/NUMERIC` 字段的三种编码（`decimal.handling.mode`）：

| 模式 | amount 的样子 | 说明 |
| --- | --- | --- |
| `precise`（默认） | `{"scale":2,"value":"ARG="}` | 无精度损失，但难读；`value` 是放大成整数后的大端有符号字节再 base64，`ARG=` 解码即整数 9990，真实值 = 9990 / 10^2 = 99.90 |
| `double` | `99.9` | 直接是数字，最直观；超大或超高精度小数有浮点精度风险 |
| `string` | `"99.90"` | 字符串，可读且无精度损失，金额类字段推荐（本文取值） |

### 进一步精简

- **SMT 解包**：加 `transforms=unwrap`（`ExtractNewRecordState`）把消息压平为最新一行加操作类型，去掉 `before`/`source`/`transaction`。适合下游只关心最新值的场景，但会丢失旧值镜像与来源元信息。
- **Avro + Schema Registry**：schema 只在注册表存一份，消息只带 id 与紧凑二进制，体积最小。`debezium/connect` 镜像自带 Apicurio 转换器，开 `ENABLE_APICURIO_CONVERTERS: 'true'` 并把 converter 换成 Apicurio Avro converter 即可，高吞吐生产环境首选。

## 数据 topic 不会自动创建

[Docker Compose 部署](./Docker%20Compose%20部署.md) 关闭了 broker 自动建 topic。此时两类 topic 表现不同：

- **Connect 内部 topic**（`debezium_configs`/`debezium_offsets`/`debezium_statuses`）：由 Connect 通过管理接口显式创建，不受影响。
- **Debezium 数据 topic**（`pgcdc.public.orders` 等）：默认**不会**自动创建。broker 关闭自动建、连接器又没配 `topic.creation.*` 时，Debezium 往不存在的 topic 发数据会失败。

典型现象：连接器状态 `RUNNING`，但数据 topic 一直不出现，Debezium 日志反复报：

```
Error while fetching metadata ... {pgcdc.public.orders=UNKNOWN_TOPIC_OR_PARTITION}
```

变更事件发不出去只能缓冲在内存，Postgres 复制槽持续积压（`pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)` 不断增大），表现为连接器连着却收不到数据。

两种解决办法：

办法一（推荐）：在连接器配置里启用 Debezium 的 topic 自动创建，即注册配置里的两项：

```json
"topic.creation.default.replication.factor": "1",
"topic.creation.default.partitions": "1"
```

副本数需与集群规模匹配，单节点填 `1`。

办法二（手动）：按需逐个创建。容器内执行用内部监听器 `19092`，宿主机本地客户端用 `9092`：

```bash
$ docker exec kafka sh -c "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 \
  --create --topic pgcdc.public.orders --partitions 1 --replication-factor 1"
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

`source.lsn`（WAL 日志序列号）单调递增，是 PostgreSQL 侧真实变更顺序，可用于离线对账，但在线消费仍以 offset 为准。

无主键表没有稳定 key，消息会被轮询到不同分区，几十次修改散落各处，无法还原顺序。需加主键，或在连接器配置显式指定唯一列当 key：

```json
"message.key.columns": "public.orders:id"
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
"message.key.columns": "public.orders:id"
```

单表多列（复合 key）：

```json
"message.key.columns": "public.orders:shop_id,product_code"
```

多张表同时配置，用分号分隔：

```json
"message.key.columns": "public.orders:id;public.users:user_id"
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
| 任务 FAILED：`permission denied for database shop` | PG15+ 最小权限账号无权建 FOR ALL TABLES publication | 超管预建 `CREATE PUBLICATION dbpublication FOR ALL TABLES;` |
| 连接器 RUNNING 但新表无 topic、无消息 | 新表不在 `table.include.list`，被静默过滤 | PUT 扩大白名单（需传完整 config） |
| 连接器 RUNNING 但无数据 topic、槽积压增长 | broker 关闭自动建、连接器没配 `topic.creation.*` | 连接器配 `topic.creation.default.replication.factor/partitions` |
| 新加白名单后历史数据没补发 | 白名单只对流式阶段生效 | 需要补数据时执行增量快照（signal 表方式）或重注册 |
| `before` 是 null 或默认值拼的伪行 | 表的 REPLICA IDENTITY 为默认 DEFAULT | `ALTER TABLE 表名 REPLICA IDENTITY FULL` |
| 消息体巨大、每条都带表结构 | converter 的 `schemas.enable` 默认 true | Compose 设 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE=false`（必须带前缀） |
| 设了 `VALUE_CONVERTER_SCHEMAS_ENABLE=false` 不生效 | 镜像只识别 `CONNECT_` 前缀变量 | 改成 `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE` |
| `DECIMAL` 字段是 `{scale,value}` 看不懂 | 默认 `precise` 编码 | 改 `decimal.handling.mode=string`（或 `double`） |
| 宿主机连 `19092` 报 Node may not be available | 用了容器内部端口 | 宿主机改用 `9092` |
| 连接器连不上源库 | 跨 Compose 网络不互通 | 用 `host.docker.internal` 或共享网络，源库端口映射到宿主机 |
| 同一行多次修改，下游顺序错乱 | 消费端并发处理，或无主键导致跨分区 | 同 key 同分区（加主键或配 `message.key.columns`）加单分区串行消费 |

推荐的基线连接器配置（单节点集群，已合并最小权限账号、topic 自建与金额字段可读）：

```json
{
  "name": "pg-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "topic.prefix": "pgcdc",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "Admin@123",
    "database.dbname": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_pg_shop",
    "publication.name": "dbpublication",
    "table.include.list": "public.customers,public.orders",
    "decimal.handling.mode": "string",
    "topic.creation.default.replication.factor": "1",
    "topic.creation.default.partitions": "1"
  }
}
```

## 参考来源

- [Debezium: CDC](https://debezium.io/documentation/)：Debezium 官方文档。
- [Debezium: PostgreSQL 连接器](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)：连接器配置项、数据库前置条件与消息格式说明。
