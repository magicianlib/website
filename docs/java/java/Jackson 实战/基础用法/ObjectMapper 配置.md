`ObjectMapper` 是 Jackson 的核心入口，线程安全，整个应用声明一个全局单例即可。配置建议集中在 `JsonMapper.builder()` 上一次写好，避免散落的 `configure(...)` 调用。

下面是一份生产可用的默认配置，覆盖了日常 JSON 场景几乎全部需要预置的开关：

```java
public static ObjectMapper createObjectMapper(boolean format) {
    JsonMapper.Builder builder = JsonMapper.builder();

    // 格式化输出（缩进），按需开启
    builder.configure(SerializationFeature.INDENT_OUTPUT, format);

    // 反序列化时忽略 JSON 中存在的、目标类没有的字段
    builder.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    // 序列化时跳过 null 值
    builder.defaultPropertyInclusion(
            JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.NON_NULL)
    );

    // 忽略 transient 字段
    builder.configure(MapperFeature.PROPAGATE_TRANSIENT_MARKER, true);

    // 默认时区取 JVM 系统时区，避免 java.util.Date 序列化时偏移 8 小时
    builder.defaultTimeZone(TimeZone.getDefault());

    // java.util.Date 的默认格式
    builder.defaultDateFormat(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));

    ObjectMapper mapper = builder.build();

    // 注册 Java8（java.time.*）日期模块
    configureJsr310(mapper);

    return mapper;
}
```

逐项说明：

| 配置 | 作用 |
|:---|:---|
| `SerializationFeature.INDENT_OUTPUT` | 缩进输出，便于人读；线上建议关闭，省体积 |
| `FAIL_ON_UNKNOWN_PROPERTIES` disable | JSON 多了目标类没有的字段时不报错，对接外部接口必备 |
| `defaultPropertyInclusion(NON_NULL)` | 全局跳过 null 字段，等价 `setSerializationInclusion(NON_NULL)` |
| `PROPAGATE_TRANSIENT_MARKER` | 让 `transient` 字段在序列化时被忽略 |
| `defaultTimeZone` | 解决 `java.util.Date` 序列化默认用 UTC 导致的 8 小时偏差，见 [时区问题](./时区问题.md) |
| `defaultDateFormat` | `java.util.Date` 的格式串 |
| `configureJsr310` | 注册 `JavaTimeModule` 处理 `java.time.*`，见 [java.time 日期格式问题](./java.time%20日期格式问题.md) |

其中 `configureJsr310` 把 `java.time.*` 各类型统一格式化：

```java
public static void configureJsr310(ObjectMapper objectMapper) {
    objectMapper.registerModule(new JavaTimeModule());

    // 禁用「日期写为时间戳」的默认行为，否则不会用下面的字符串格式
    objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    configureFormat(objectMapper, LocalTime.class, "HH:mm:ss");
    configureFormat(objectMapper, LocalDate.class, "yyyy-MM-dd");
    configureFormat(objectMapper, LocalDateTime.class, "yyyy-MM-dd HH:mm:ss");
    configureFormat(objectMapper, OffsetDateTime.class, "yyyy-MM-dd'T'HH:mm:ssXXX");
    configureFormat(objectMapper, OffsetTime.class, "HH:mm:ssXXX");
    configureFormat(objectMapper, Instant.class, "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

private static void configureFormat(ObjectMapper mapper, Class<?> type, String pattern) {
    JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern(pattern);
    mapper.configOverride(type).setFormat(format);
}
```

`configOverride` 是 Jackson 2.8+ 推荐写法，序列化与反序列化统一走同一格式，比逐个 `addSerializer` / `addDeserializer` 简洁。

## 维护两个实例

很多场景需要「紧凑」和「格式化」两种输出，不必每次现场切换配置，预置两个单例即可：

```java
private static final ObjectMapper MAPPER_WITH_FORMAT = createObjectMapper(true);
private static final ObjectMapper MAPPER_WITHOUT_FORMAT = createObjectMapper(false);

public static ObjectMapper getObjectMapper(boolean format) {
    return format ? MAPPER_WITH_FORMAT : MAPPER_WITHOUT_FORMAT;
}
```

完整的工具类封装（含序列化 / 反序列化 / 集合 / Map 一组 API）见 [JacksonUtils 工具类封装](../高级特性/JacksonUtils%20工具类封装.md)。
