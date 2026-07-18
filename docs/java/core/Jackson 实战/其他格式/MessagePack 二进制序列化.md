MessagePack 是一种二进制序列化格式，结构和 JSON 一一对应，但体积更小、解析更快。对接高性能 RPC、缓存（Redis 存对象）、消息队列时常用。通过 `jackson-dataformat-msgpack`，Jackson 用同一套 API 就能产出 MessagePack。

## 依赖

`jackson-dataformat-msgpack` 是第三方扩展，**强依赖 Jackson 底层核心 API**，版本必须与 Jackson 主版本严格对应，否则会运行期报错。对应关系在 [msgpack-java releases](https://github.com/msgpack/msgpack-java/releases) 查。

```xml
<dependency>
    <groupId>org.msgpack</groupId>
    <artifactId>jackson-dataformat-msgpack</artifactId>
    <version>0.9.12</version> <!-- 需与所用 Jackson 版本对应 -->
</dependency>
```

## 创建 MessagePack 的 ObjectMapper

和 JSON 唯一的区别是 builder 传入 `MessagePackFactory`，其余通用配置照搬：

```java
ObjectMapper mapper = JsonMapper.builder(new MessagePackFactory())
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .defaultPropertyInclusion(JsonInclude.Value.construct(NON_NULL, NON_NULL))
        .build();
configureJsr310(mapper);
```

## 序列化

输出二进制 `byte[]`：

```java
User user = new User("test", 20, new BigDecimal("99.99"));
byte[] bytes = mapper.writeValueAsBytes(user);
```

需要走文本通道（HTTP body、日志）时，转 Base64 字符串：

```java
String base64 = Base64.getEncoder().encodeToString(bytes);
```

## 反序列化

`byte[]` 和 Base64 字符串都能直接读回来：

```java
// 从 byte[]
User user = mapper.readValue(bytes, User.class);

// 从 Base64
User user = mapper.readValue(Base64.getDecoder().decode(base64), User.class);
```

泛型集合、Map 同样走 `TypeFactory` / `TypeReference`，与 JSON 完全一致。

## 与 JSON 的取舍

| | JSON | MessagePack |
|:---|:---|:---|
| 编码 | 文本，可读 | 二进制，不可读 |
| 体积 | 较大（key、引号都占字节） | 小，尤其字段多、数值密集时 |
| 调试 | 直接看 | 要先解码 |
| 典型场景 | HTTP API、配置、日志 | RPC、缓存、MQ 等机器间通信 |

人读的接口、配置用 JSON；机器间高频通信、对体积敏感的场景用 MessagePack。
