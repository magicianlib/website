单节点 Kafka（KRaft 模式）加 Debezium Connect 的一体化 Docker Compose 部署，适用于本地开发与 CDC 调试。Kafka 与 Debezium 放在同一个 Compose 里，自动共享 Docker 网络，容器之间用容器名互访。

## KRaft 版本说明

Kafka 支持 KRaft（KIP-500）模式的版本节点：

| 版本 | 状态 | 说明 |
| --- | --- | --- |
| Kafka 2.8.0 | 最早引入（Early Access） | 可脱离 ZooKeeper 运行，但功能不完整（缺少 ACL、SCRAM、动态配置等支持），仅用于测试评估 |
| Kafka 3.3.0 | 生产可用最小版本 | KRaft 正式达到生产标准，补齐元数据高可用、故障恢复、集群平滑升级等关键特性 |
| Kafka 4.0+ | 唯一架构 | 彻底移除 ZooKeeper 模式，KRaft 成为唯一且强制的元数据管理架构 |

本文使用的 `apache/kafka:4.3.1` 属于 4.x，原生 KRaft，无 ZooKeeper。

## 镜像选择

| 镜像 | 版本 | 说明 |
| --- | --- | --- |
| `apache/kafka` | `4.3.1` | 官方镜像，内置 KRaft，无需 ZooKeeper。Kafka 4.x 已彻底移除 ZK 模式，KRaft 是唯一架构 |
| `debezium/connect` | `2.7.3.Final` | Debezium 官方的 Kafka Connect 集成镜像，预装全部 Debezium 连接器（PostgreSQL、MySQL、MongoDB 等）与 JDBC Sink |

版本兼容：Debezium 2.7 的 PostgreSQL 连接器支持 PostgreSQL 12~17。

## docker-compose 全貌

完整文件如下，下文逐段拆解。

```yaml
services:
  kafka:
    image: apache/kafka:4.3.1
    container_name: kafka
    ports:
      # 暴露给宿主机/外部客户端连接的端口
      - "9092:9092"
    environment:
      # 0. 集群 ID（官方镜像读取无前缀的 CLUSTER_ID；可自行用 kafka-storage.sh random-uuid 生成替换）
      CLUSTER_ID: 'L7a3Pp2RTvKxQ9wYjm1BcN'

      # 1. 节点角色：同时作为 Broker (数据存储) 和 Controller (控制平面)
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'

      # 2. 监听器配置
      KAFKA_LISTENERS: 'PLAINTEXT://0.0.0.0:19092,CONTROLLER://0.0.0.0:9093,EXTERNAL://0.0.0.0:9092'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT'

      # 3. 对外宣告的连接地址
      # 远程部署时设置环境变量 ADVERTISED_HOST 为服务器 IP，默认 localhost
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:19092,EXTERNAL://${ADVERTISED_HOST:-localhost}:9092'

      # 4. KRaft 控制器配置
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'

      # 5. 单节点集群容错/副本配置
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0

      # 禁用 topic 自动创建；业务 topic 需显式创建
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'

    healthcheck:
      # 探测本节点 PLAINTEXT 监听端口，确认 Broker 已对外可用
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list >/dev/null 2>&1"]
      interval: 10s
      timeout: 5s
      retries: 12

    volumes:
      # 建议独立存放在 ./data/kafka 下，避免和 connect 数据混合
      - ./data/kafka:/var/lib/kafka/data

  debezium:
    image: debezium/connect:2.7.3.Final  # Debezium 官方提供的集成镜像
    container_name: debezium
    ports:
      - "8083:8083"  # Kafka Connect 的 REST API 管理端口
    environment:
      # 连接到 Docker 内部网络的 Kafka
      BOOTSTRAP_SERVERS: 'kafka:19092'
      GROUP_ID: 'debezium-cluster'

      # Kafka Connect 自动保存元数据和位移的内部 Topic
      CONFIG_STORAGE_TOPIC: 'debezium_configs'
      OFFSET_STORAGE_TOPIC: 'debezium_offsets'
      STATUS_STORAGE_TOPIC: 'debezium_statuses'

      # 消息数据转换格式（默认使用 JSON）
      KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter'
      VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter'
      # 关闭每条消息内嵌的结构描述（即表结构元数据），显著减小消息体积
      # 本镜像只会对 CONNECT_ 前缀的变量做去前缀、转小写、下划线变点号后写入配置，
      # 因此必须带前缀；写成不带前缀的形式不会被识别，最终仍是默认开启状态
      CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE: 'false'
      CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE: 'false'
    depends_on:
      kafka:
        condition: service_healthy  # 等 Kafka 健康检查通过后再启动，避免连接失败退出
    volumes:
      - ./data/debezium:/kafka/data
```

## Kafka 配置详解

`apache/kafka` 镜像通过环境变量生成配置，约定是 `KAFKA_` 前缀、全大写、下划线，对应 broker 配置项（如 `KAFKA_NODE_ID` 对应 `node.id`）。

### 集群 ID 与节点角色

`CLUSTER_ID` 是 KRaft 集群的唯一标识，集群内所有节点必须一致。`apache/kafka` 镜像读取**无前缀**的 `CLUSTER_ID`（注意不是 `KAFKA_CLUSTER_ID`），任意 UUID 即可，可用 `kafka-storage.sh random-uuid` 生成。

`KAFKA_NODE_ID` 是节点在集群中的唯一编号，单节点固定为 1。`KAFKA_PROCESS_ROLES` 设为 `broker,controller`，单节点同时承担数据存储（Broker）与元数据管理（Controller）两个角色；多节点生产环境建议把 Controller 与 Broker 分开部署，Controller 至少 3 个。

### 监听器与宣告地址

这是 Kafka 网络最容易出错的部分，由两组配置共同决定：

| 配置 | 含义 | 该填什么 |
| --- | --- | --- |
| `KAFKA_LISTENERS` | broker 监听（绑定）的地址，即在哪听 | 用 `0.0.0.0`，监听容器内所有网卡 |
| `KAFKA_ADVERTISED_LISTENERS` | 对外宣告给客户端的地址，即告诉别人怎么连我 | 必须是客户端能真实访问到的地址，不能用 `0.0.0.0` |

这里配了三类监听器：

- `CONTROLLER://0.0.0.0:9093`：KRaft 控制器之间的元数据通信通道，仅供集群内部使用。
- `PLAINTEXT://0.0.0.0:19092`：容器之间的数据通道，宣告为 `kafka:19092`（用容器名，靠 Docker DNS 解析）。Debezium 容器就连这个地址。
- `EXTERNAL://0.0.0.0:9092`：宿主机与外部客户端的通道，端口映射 `9092:9092`，宣告为 `${ADVERTISED_HOST:-localhost}:9092`。

`KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` 把监听器名映射到协议，这里三类都用明文 `PLAINTEXT`，无认证无加密；生产环境应换 SASL/SSL。

客户端连 Kafka 是两步：先连上 broker（监听在 `0.0.0.0` 所以能连），broker 把宣告地址回给客户端，客户端再用宣告地址继续通信。因此**宣告地址必须对客户端可达**。填 `0.0.0.0` 会让客户端无处可连，启动时直接报错。

### ADVERTISED_HOST 变量

`EXTERNAL` 的对外地址由 `ADVERTISED_HOST` 控制，语法 `${ADVERTISED_HOST:-localhost}` 表示未设置时回退到 localhost：

- 本机开发（默认）：直接 `docker compose up -d`，对外地址就是 `localhost`。
- 远程服务器部署，二选一：
    - 启动时临时指定：`ADVERTISED_HOST=你的服务器IP docker compose up -d`
    - 或在 Compose 同级目录放一个 `.env` 文件（Docker Compose 会自动读取），写入 `ADVERTISED_HOST=你的服务器IP`，之后直接 `docker compose up -d`

`PLAINTEXT` 段不经过这个变量，始终用容器名，无需改动。

### 端口区分：9092 与 19092

两类客户端用不同端口，取决于在哪里执行命令：

- 在**宿主机**上跑（本地安装的 `kafka-topics.sh`、业务程序、UI 工具）：用 `localhost:9092`（EXTERNAL，已映射到宿主机）。
- 在 **kafka 容器内**跑（`docker exec kafka ...`）：用 `localhost:19092`（PLAINTEXT，绑定在容器内）。

宿主机上连 `19092` 会失败（该端口未映射到宿主机）；外部客户端即便连上，broker 回传的也是 `kafka:19092`，宿主机解析不了容器名。`9092` 是外部客户端唯一正确的入口。

### KRaft 控制器配置

```yaml
KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
```

`KAFKA_CONTROLLER_LISTENER_NAMES` 指定哪个监听器用于控制器通信，这里就是上面的 `CONTROLLER`。`KAFKA_CONTROLLER_QUORUM_VOTERS` 列出参与选举的控制器节点，格式 `节点ID@地址`，单节点只有 `1@kafka:9093`；多节点要把所有 Controller 都列上。`KAFKA_INTER_BROKER_LISTENER_NAME` 指定 Broker 之间通信用哪个监听器，这里用容器间的 `PLAINTEXT`。

### 单节点副本因子

```yaml
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
```

前三项分别是消费位移 topic、事务状态 topic 的副本数与最小同步副本数。单节点只有一个 Broker，副本只能为 1；若沿用默认的 3，这些内部 topic 无法创建，集群起不来。`KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0` 关闭消费者组首次重平衡延迟，开发环境减少等待。

### 关闭 topic 自动创建

`KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'` 禁用 broker 自动建 topic，业务 topic 必须显式创建。Kafka Connect 的内部 topic（配置/位移/状态）由 Connect 通过管理接口显式创建，不受此开关影响；但 Debezium 的数据 topic 需要额外配置才能自动创建，详见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#数据-topic-不会自动创建)。

### 健康检查

```yaml
healthcheck:
  test: ["CMD-SHELL", "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list >/dev/null 2>&1"]
  interval: 10s
  timeout: 5s
  retries: 12
```

通过探测容器内 `PLAINTEXT` 端口能否列出 topic，判定 Broker 是否真正就绪。Debezium 用 `depends_on.kafka.condition: service_healthy` 等待该检查通过后再启动，避免 Kafka 未就绪时 Connect 连接失败退出。

### 数据卷

`./data/kafka:/var/lib/kafka/data` 把 Kafka 数据落到宿主机相对目录，容器重建不丢数据。建议 Kafka 与 Debezium 各自独立目录，避免数据混合。

## Debezium Connect 配置详解

`debezium/connect` 镜像同样以环境变量驱动。注意它**只对 `CONNECT_` 开头的变量**做去前缀、转小写、下划线变点号的转换（如 `CONNECT_BOOTSTRAP_SERVERS` → `bootstrap.servers`），并固定把 `BOOTSTRAP_SERVERS`、`GROUP_ID`、`KEY_CONVERTER` 等一批变量补上 `CONNECT_` 前缀重新导出。少数不在白名单内的变量必须自带前缀才能生效，`SCHEMAS_ENABLE` 就是其中之一。

### 连接 Kafka

```yaml
BOOTSTRAP_SERVERS: 'kafka:19092'
GROUP_ID: 'debezium-cluster'
```

`BOOTSTRAP_SERVERS` 指向 Kafka 的容器间监听器 `kafka:19092`，靠 Docker DNS 解析。`GROUP_ID` 是 Connect 集群标识，多 worker 共享，单 worker 随意命名。

### Connect 内部 topic

```yaml
CONFIG_STORAGE_TOPIC: 'debezium_configs'
OFFSET_STORAGE_TOPIC: 'debezium_offsets'
STATUS_STORAGE_TOPIC: 'debezium_statuses'
```

Kafka Connect 把自身的连接器配置、任务位移、任务状态分别存到这三个 topic，由 Connect 启动时通过管理接口自动创建，不需要手动建。它们应配置为单分区、开启 compact（清理策略）以保留最新值；单节点环境副本数为 1。

### 消息转换器

```yaml
KEY_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter'
VALUE_CONVERTER: 'org.apache.kafka.connect.json.JsonConverter'
CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE: 'false'
CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE: 'false'
```

`KEY_CONVERTER`/`VALUE_CONVERTER` 决定数据 topic 里消息的序列化格式，默认 JSON。`SCHEMAS_ENABLE=false` 关闭每条消息内嵌的结构描述（表结构元数据），把消息从带 schema 描述的 `{schema, payload}` 精简为只剩 `payload`，体积可降到原来的数分之一。

:::warning[变量必须带前缀]
`SCHEMAS_ENABLE` 这两个变量**必须写成 `CONNECT_KEY_CONVERTER_SCHEMAS_ENABLE` / `CONNECT_VALUE_CONVERTER_SCHEMAS_ENABLE`**。写成不带前缀的 `VALUE_CONVERTER_SCHEMAS_ENABLE` 会被镜像忽略，配置仍是默认的 `true`，消息照样带 schema。消息格式、字段编码与进一步精简见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md#消息格式与精简)。
:::

### 依赖与数据卷

`depends_on.kafka.condition: service_healthy` 让 Connect 等 Kafka 健康后再启动。`./data/debezium:/kafka/data` 落 Connect 自身数据。连接器的配置与位移实际存在 Kafka 的内部 topic 里，不在这个卷中，因此重建 debezium 容器不会丢连接器。

## 启动与验证

启动（远程部署时加 `ADVERTISED_HOST`）：

```bash
$ docker compose up -d
```

验证 Kafka Connect 就绪（返回版本、commit、集群 ID）：

```bash
$ curl http://localhost:8083/

{"version":"3.7.0","commit":"2ae524ed625438c5","kafka_cluster_id":"L7a3Pp2RTvKxQ9wYjm1BcN"}
```

列出已安装的连接器插件，确认 PostgreSQL 连接器在列：

```bash
$ curl http://localhost:8083/connector-plugins | grep -o '"class":"[^"]*postgres[^"]*"'

"class":"io.debezium.connector.postgresql.PostgresConnector"
```

列出 topic。容器内执行用内部监听器 `19092`：

```bash
$ docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:19092 --list
```

宿主机本地安装的客户端用外部监听器 `9092`：

```bash
$ ./kafka-topics.sh --bootstrap-server localhost:9092 --list
```

Connect 就绪、连接器插件在列后，即可注册具体的 Source 连接器，参见 [PostgreSQL 连接器](./PostgreSQL%20连接器.md)。

## 多节点扩展

单节点仅用于开发。生产环境至少 3 个节点，副本因子设为 3，Controller 与 Broker 分离部署。多节点 Compose 的关键是每个节点 `KAFKA_NODE_ID` 唯一、`KAFKA_CONTROLLER_QUORUM_VOTERS` 列出全部 Controller、各节点 `KAFKA_ADVERTISED_LISTENERS` 的 `PLAINTEXT` 段用各自容器名。基于二进制的多节点部署可参考 [集群部署](./集群部署.md)。

## 参考来源

- [Apache Kafka Quickstart](https://kafka.apache.org/quickstart/)：KRaft 模式与官方镜像的基础用法。
- [Running Apache Kafka KRaft on Docker（Instaclustr）](https://www.instaclustr.com/education/apache-spark/running-apache-kafka-kraft-on-docker-tutorial-and-best-practices/)：多节点 KRaft 集群的集群标识生成与部署最佳实践。
- [Docker Forums：apache/kafka 默认 CLUSTER_ID 行为](https://forums.docker.com/t/kafka-fails-to-start/147141)：未显式设置集群标识时镜像使用的默认值与日志特征。
- [Confluent Docker 配置参考](https://docs.confluent.io/platform/current/installation/docker/config-reference.html)：集群标识环境变量（CLUSTER_ID）的命名约定说明。
- [Kafka Downloads Page](https://kafka.apache.org/community/downloads/)：Kafka 下载页面，宿主机客户端（如 `kafka-topics.sh`）从此获取。
