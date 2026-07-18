`LocalDate` / `LocalTime` / `LocalDateTime` 等 `java.time.*` 类型，Jackson 默认会序列化成一大堆字段对象，反序列化时还会直接报错：

```json
"date": {
    "year": 2021, "month": "JULY", "monthValue": 7, "dayOfMonth": 26,
    "era": "CE", "dayOfYear": 207, "dayOfWeek": "MONDAY", "leapYear": false,
    "chronology": { "id": "ISO", "calendarType": "iso8601" }
}
```

根因是 Jackson 核心包不认识 `java.time`，需要引入 `jackson-datatype-jsr310` 并注册 `JavaTimeModule`。

## 依赖

```xml
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-jsr310</artifactId>
    <version>${jackson.version}</version>
</dependency>
```

## 推荐写法：JavaTimeModule + configOverride

注册 `JavaTimeModule` 后，禁用「写为时间戳」的默认行为，再用 `configOverride` 给每个类型统一指定格式（序列化、反序列化共用一份）：

```java
public static void configureJsr310(ObjectMapper mapper) {
    mapper.registerModule(new JavaTimeModule());
    mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    override(mapper, LocalTime.class, "HH:mm:ss");
    override(mapper, LocalDate.class, "yyyy-MM-dd");
    override(mapper, LocalDateTime.class, "yyyy-MM-dd HH:mm:ss");
    override(mapper, OffsetDateTime.class, "yyyy-MM-dd'T'HH:mm:ssXXX");
    override(mapper, OffsetTime.class, "HH:mm:ssXXX");
    override(mapper, Instant.class, "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

private static void override(ObjectMapper mapper, Class<?> type, String pattern) {
    JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern(pattern);
    mapper.configOverride(type).setFormat(format);
}
```

效果：

```json
{
    "name": "张三",
    "date": "2021-07-26",
    "time": "15:27:16",
    "dateTime": "2021-07-26 15:27:16"
}
```

`WRITE_DATES_AS_TIMESTAMPS` 必须禁用，否则 Jackson 仍会输出毫秒时间戳，`configOverride` 的字符串格式不生效。

## 自定义序列化器写法

需要更复杂的逻辑（比如动态时区、自定义解析容错）时，扩展 `JsonSerializer` / `JsonDeserializer`：

```java
public class LocalDateTimeSerializer extends JsonSerializer<LocalDateTime> {
    @Override
    public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(value.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }
}

public class LocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {
    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        return LocalDateTime.parse(p.getText(), DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
```

字段级用注解挂上去：

```java
@JsonSerialize(using = LocalDateTimeSerializer.class)
@JsonDeserialize(using = LocalDateTimeDeserializer.class)
private LocalDateTime dateTime;
```

这种写法和 `JavaTimeModule` 本质一样，只是把 ser / deser 单独拎出来。能用 `configOverride` 解决的，优先用它，省掉一堆样板类。

## @JsonFormat 的局限

`@JsonFormat(pattern = "yyyy-MM-dd")` 只对 `java.util.Date` 生效，**不能**直接格式化 `LocalDate` 这类 `java.time` 类型。`java.time` 走 `JavaTimeModule`。
