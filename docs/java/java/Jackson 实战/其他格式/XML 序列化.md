Jackson 不止 JSON，通过 `jackson-dataformat-xml` 扩展可以用同一套 `ObjectMapper` API 处理 XML，入口是 `XmlMapper`。

## 依赖

```xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
    <version>${jackson.version}</version>
</dependency>
```

`XmlMapper` 继承自 `ObjectMapper`，前面讲过的通用配置（忽略未知字段、跳过 null、时区、jsr310 等）都适用，统一走 `builder`：

```java
XmlMapper mapper = XmlMapper.builder()
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .defaultPropertyInclusion(JsonInclude.Value.construct(NON_NULL, NON_NULL))
        .build();
configureJsr310(mapper);
```

## 对象与 XML 互转

用 `@JacksonXmlRootElement` 指定根元素名，`@JacksonXmlProperty` 控制属性 / 元素、命名：

```java
@Setter
@Getter
@JacksonXmlRootElement(localName = "user")
public class User {
    private String name;
    private int age;
    private BigDecimal amount;
}
```

```java
User user = new User("test", 20, new BigDecimal("99.99"));

// 对象 → XML
String xml = mapper.writeValueAsString(user);
// <user><name>test</name><age>20</age><amount>99.99</amount></user>

// XML → 对象
User parsed = mapper.readValue(xml, User.class);
```

## XML 声明

默认不输出 `<?xml version="1.0" encoding="UTF-8"?>`，需要的话开启 `WRITE_XML_DECLARATION`：

```java
XmlMapper mapper = XmlMapper.builder()
        .configure(ToXmlGenerator.Feature.WRITE_XML_DECLARATION, true)
        .build();
```

## 集合元素

XML 没有天然的数组结构，集合字段需要 `@JacksonXmlElementWrapper` 声明是否包一层包装元素：

```java
@JacksonXmlRootElement(localName = "group")
public class Group {
    // useWrapper = false：每个 user 直接平铺，不再套一层 <users>
    @JacksonXmlElementWrapper(useWrapper = false)
    @JacksonXmlProperty(localName = "user")
    private List<User> users;
}
```

## 工具类封装

和 [JacksonUtils](../高级特性/JacksonUtils%20工具类封装.md) 一个套路，`XmlMapper` 同样可以预置多个单例（带 / 不带 XML 声明、是否格式化），对外暴露 `toXml` / `toObj` 一组重载，把 `JsonProcessingException` 包成统一异常。
