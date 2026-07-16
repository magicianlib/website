先看下示例：

```java
ObjectMapper objectMapper = new ObjectMapper();

User user = User.builder().name("张三").age(18)
    	        .time(LocalTime.now())
                .date(LocalDate.now())
                .dateTime(LocalDateTime.now())
                .build();

String json = objectMapper.writeValueAsString(user);
```

输出结果为：

```json
{
    "name": "张三",
    "age": 18,
    "date": {
        "year": 2021,
        "month": "JULY",
        "era": "CE",
        "dayOfYear": 207,
        "dayOfWeek": "MONDAY",
        "leapYear": false,
        "dayOfMonth": 26,
        "monthValue": 7,
        "chronology": {
            "id": "ISO",
            "calendarType": "iso8601"
        }
    },
    "time": {
        "hour": 13,
        "minute": 38,
        "second": 52,
        "nano": 514000000
    },
    "dateTime": {
        "dayOfYear": 207,
        "dayOfWeek": "MONDAY",
        "month": "JULY",
        "dayOfMonth": 26,
        "year": 2021,
        "monthValue": 7,
        "hour": 13,
        "minute": 38,
        "second": 52,
        "nano": 515000000,
        "chronology": {
            "id": "ISO",
            "calendarType": "iso8601"
        }
    },
    "tags": null
}
```

注意看 `date` 、 `time` 和 `dateTime` 字段，这个输出信息与我们预想的似乎不太一样。

解决该问题主要有两种方式：使用 Jackson 的 JavaTimeModule 或者 使用自定义序列化反序列化方式。分别来看下：

## 使用JavaTimeModule方式(推荐)

想要使用 JavaTimeModule 解决 Java8 日期格式化问题我们需要引入 Jackson 的 jsr310 依赖：

```xml
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-jsr310</artifactId>
    <version>${jaskon.version}</version>
</dependency>
```

这样，我们就能够创建一个 JavaTimeModule 对象了：

```java
JavaTimeModule javaTimeModule = new JavaTimeModule();
```

当然我们还是要做些相应的配置才行，不过最终这个 `JavaTimeModule` 对象是要注册到 `ObjectMapper` 对象中的，如下：

```java
public ObjectMapper registerModule(Module module);
```

所以，为了方便我们还是创建一个静态方法来配置 `JavaTimeModule` ，如下：

```java
private static void configureObjectMapper4Jsr310(ObjectMapper objectMapper) {

    JavaTimeModule javaTimeModule = new JavaTimeModule();

    // config JavaTimeModule ...

    objectMapper.registerModule(javaTimeModule);

}
```

这样做的主要原因是 JavaTimeModule 是 Module 的一个子实现，也就是说在实际使用中我们可能还会为其他子实现进行定制化配置。通过将配置进行公共提取，当其他 ObjectMapper 也需要相应配置时直接调用该方法进行注册即可。

现在就来配置 JavaTimeModule 来解决 Java8 日期格式的问题。

### 配置序列化和反序列化

先看下 JavaTimeModule 类继承图：

<img src="https://@media/java-media/jackson/JavaTimeModule1708509985.png" width="500px"/>

配置日期格式问题我们主要借助它的两个方法：

```java
// 序列化使用
public <T> SimpleModule addSerializer(Class<? extends T> type, JsonSerializer<T> ser);

// 反序列化使用
public <T> SimpleModule addDeserializer(Class<T> type, JsonDeserializer<? extends T> deser);
```

这两个方法都是在父类中的 SimpleModule 中定义。

形参 `type` 指的是我们要序列化的类型，如 `LocalDateTime.class` 。

形参 `ser` 和 `deser` 指的是我们序列化和反序列化的具体实现方式，比如我们要配置 `LocalDateTime.class` 的序列化和反序列化方法，需要传递的序列化和反序列化对象就是 `LocalDateTimeSerializer` 和 `LocalDateTimeDeserializer` 。

具体就不做过多说明了，现在来看下该具体配置吧，直接上代码：

```java
private static void configureObjectMapper4Jsr310(ObjectMapper objectMapper) {

    JavaTimeModule javaTimeModule = new JavaTimeModule();

    // LocalTime 序列化和反序列化配置
    DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");
    javaTimeModule.addSerializer(LocalTime.class, new LocalTimeSerializer(timeFormatter));
    javaTimeModule.addDeserializer(LocalTime.class, new LocalTimeDeserializer(timeFormatter));

    // LocalDate 序列化和反序列化配置
    DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    javaTimeModule.addSerializer(LocalDate.class, new LocalDateSerializer(dateFormatter));
    javaTimeModule.addDeserializer(LocalDate.class, new LocalDateDeserializer(dateFormatter));

    // LocalDateTime 序列化和反序列化配置
    DateTimeFormatter datetimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    javaTimeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(datetimeFormatter));
    javaTimeModule.addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer(datetimeFormatter));

    objectMapper.registerModule(javaTimeModule);

}
```

这样，Java8 日期格式化的配置就完成了。

### 日期序列化测试

```java
ObjectMapper objectMapper = new ObjectMapper();
// 配置 jsr310 日期序列化和反序列化问题
configureObjectMapper4Jsr310(objectMapper);

User user = User.builder().name("张三").age(18)
    			.time(LocalTime.now())
                .date(LocalDate.now())
                .dateTime(LocalDateTime.now())
                .build();

String json = objectMapper.writeValueAsString(user);
```

输出结果：

```json
{
    "name": "张三",
    "age": 18,
    "date": "2021-07-26",
    "time": "15:27:16",
    "dateTime": "2021-07-26 15:27:16",
    "tags": null
}
```

这回日期就是我们想要的输出格式了~

### 日期反序列化测试

```java
String jsonStr = "{\"name\":\"张三\",\"age\":18,\"date\":null,\"time\":null,\"dateTime\":\"2021-07-26 18:35:02\",\"tags\":null}";

ObjectMapper objectMapper = new ObjectMapper();
// 配置 jsr310 日期序列化和反序列化问题
configureObjectMapper4Jsr310(objectMapper);

User user = objectMapper.readValue(jsonStr, User.class);
System.out.println(user);
```

看下截图：

![HandlerJava8DateTime1708510099.png](https://@media/java-media/jackson/HandlerJava8DateTime1708510099.png)

这就完结解决 Java8 日期格式的问题了~

## 自定义序列化和反序列化方式

注意，这种配置方式与上面的 JavaTimeModule 本质上是一样的。主要是扩展 `com.fasterxml.jackson.databind.JsonSerializer` 和 `com.fasterxml.jackson.databind.JsonDeserializer` 来实现自定义某个类的序列化问题。

话不多说，直接上代码：

### 日期序列化配置

序列化 LocalDate：

```java
public class LocalDateJsonSerializer extends JsonSerializer<LocalDate> {

    @Override
    public void serialize(LocalDate date, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.CHINA)));
    }
}
```

序列化 LocalTime：

```java
public class LocalTimeJsonSerializer extends JsonSerializer<LocalTime> {
    @Override
    public void serialize(LocalTime time, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(time.format(DateTimeFormatter.ofPattern("HH:mm:ss", Locale.CHINA)));
    }
}
```

序列化 LocalDateTime：

```java
public class LocalTimeJsonSerializer extends JsonSerializer<LocalDateTime> {
    @Override
    public void serialize(LocalDateTime datetime, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(datetime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.CHINA)));
    }
}
```

### 日期反序列化配置

反序列化LocalDate：

```java
public class LocalDateJsonDeserializer extends JsonDeserializer<LocalDate> {
    @Override
    public LocalDate deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        return LocalDate.parse(parser.getText(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }
}
```

反序列化LocalTime：

```java
public class LocalTimeJsonDeserializer extends JsonDeserializer<LocalTime> {

    @Override
    public LocalTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        return LocalTime.parse(parser.getText(), DateTimeFormatter.ofPattern("HH:mm:ss"));
    }
}
```

反序列化LocalDateTime：

```java
public class LocalDateTimeJsonDeserializer extends JsonDeserializer<LocalDateTime> {
    @Override
    public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        return LocalDateTime.parse(parser.getText(), DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
```

### 日期序列化测试

想要使用上面我们自定义的序列化和反序列化配置主要有两种方式。第一种比较简单，借助 Jackson 提供的 `@JsonSerialize` 和 `@JsonDeserialize` 注解。如下：

```java
public class User {

    private String name;

    private Integer age;

    @JsonSerialize(using = LocalDateJsonSerializer.class)
    @JsonDeserialize(using = LocalDateJsonDeserializer.class)
    private LocalDate date;

    @JsonSerialize(using = LocalTimeJsonSerializer.class)
    @JsonDeserialize(using = LocalTimeJsonDeserializer.class)
    private LocalTime time;

    @JsonSerialize(using = LocalDateTimeJsonSerializer.class)
    @JsonDeserialize(using = LocalDateTimeJsonDeserializer.class)
    private LocalDateTime dateTime;

    private List<String> tags;
}
```

测试一下：

```java
ObjectMapper objectMapper = new ObjectMapper();

User user = User.builder().name("张三").age(18)
    			.time(LocalTime.now())
                .date(LocalDate.now())
                .dateTime(LocalDateTime.now())
                .build();

String json = objectMapper.writeValueAsString(user);
```

输出结果：

```json
{
    "name": "张三",
    "age": 18,
    "date": "2021-07-26",
    "time": "15:48:59",
    "dateTime": "2021-07-26 15:48:59",
    "tags": null
}
```

看起来似乎有点啰嗦，可能会有同学问直接使用 `@JsonFormat` 注解不行吗？如下：

```java
public class User {

    private String name;

    private Integer age;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private LocalTime time;

    private LocalDateTime dateTime;

    private List<String> tags;
}
```

抱歉，不行的。 `@JsonFormat` 配置形式只能格式化 `java.util.Date` 日期格式~

实际上，还有一种使用形式。不过这种主要是在 SpringMVC 的消息转换器中使用。因为需要借助 SpringMVC 的 Jackson 消息转换器 `org.springframework.http.converter.json.Jackson2ObjectMapperBuilder` 。如下示例：

```java
private static void configureObjectMapper4Jsr310(ObjectMapper objectMapper) {

    Jackson2ObjectMapperBuilder mapperBuilder = new Jackson2ObjectMapperBuilder();
    mapperBuilder.serializerByType(LocalDate.class, new LocalDateJsonSerializer());
    mapperBuilder.serializerByType(LocalTime.class, new LocalTimeJsonSerializer());
    mapperBuilder.serializerByType(LocalDateTime.class, new LocalDateTimeJsonSerializer());

    mapperBuilder.deserializerByType(LocalDate.class, new LocalDateJsonDeserializer());
    mapperBuilder.deserializerByType(LocalTime.class, new LocalTimeJsonDeserializer());
    mapperBuilder.deserializerByType(LocalDateTime.class, new LocalDateTimeJsonDeserializer());

    mapperBuilder.configure(objectMapper);
}
```

反序列化就不做测试了~

## Jackson 2.8+ 推荐使用方式

```java
public static void configureObjectMapper4Jsr310(ObjectMapper objectMapper) {
    objectMapper.registerModule(new JavaTimeModule());

    // 禁用 JSR310 将日期时间写为时间戳的特性 默认行为，必须禁用才能使用后面的字符串格式
    objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    {
        // LocalTime 序列化和反序列化配置
        JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern("HH:mm:ss");
        objectMapper.configOverride(LocalTime.class).setFormat(format);
    }
    {
        // LocalDate 序列化和反序列化配置
        JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern("yyyy-MM-dd");
        objectMapper.configOverride(LocalDate.class).setFormat(format);
    }
    {
        // LocalDateTime 序列化和反序列化配置
        JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern("yyyy-MM-dd HH:mm:ss");
        objectMapper.configOverride(LocalDateTime.class).setFormat(format);
    }
    {
        // OffsetDateTime 序列化和反序列化配置
        JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern("yyyy-MM-dd HH:mm:ss OOOO");
        objectMapper.configOverride(OffsetDateTime.class).setFormat(format);
    }
    {
        // OffsetTime 序列化和反序列化配置
        JsonFormat.Value format = JsonFormat.Value.forShape(JsonFormat.Shape.STRING).withPattern("HH:mm:ss OOOO");
        objectMapper.configOverride(OffsetTime.class).setFormat(format);
    }
}
```