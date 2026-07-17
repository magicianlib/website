Jackson 是 Java 生态事实上的 JSON 处理库，GitHub 地址 [FasterXML/Jackson](https://github.com/FasterXML)。本系列聚焦实际工程里反复用到的序列化 / 反序列化配置与扩展，不展开与 Gson、Fastjson 的性能对比。

Jackson 在实际工程里覆盖三种格式，都建立在同一套 `ObjectMapper` API 之上：

- JSON（主力场景）：[JSON 序列化](./基础用法/JSON%20序列化.md)、[JSON 反序列化](./基础用法/JSON%20反序列化.md)
- XML：[XML 序列化](./其他格式/XML%20序列化.md)
- MessagePack 二进制：[MessagePack 二进制序列化](./其他格式/MessagePack%20二进制序列化.md)

## 依赖

只需要 `jackson-databind`，它内嵌了 `jackson-core` 和 `jackson-annotations`，日常 JSON 场景够用：

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>${jackson.version}</version>
</dependency>
```

用到 `java.time.*` 日期还要加 `jackson-datatype-jsr310`；XML、MessagePack 各自需要对应的 dataformat 扩展，具体见对应文档。

## ObjectMapper

`ObjectMapper` 是所有操作的入口。它是线程安全的，整个应用声明一个全局单例即可，不要每次序列化都 new 一个：

```java
private static final ObjectMapper MAPPER = new ObjectMapper();
```

更推荐用 `JsonMapper.builder()` 集中配置，把忽略未知字段、跳过 null、时区、`java.time` 处理等一次性写好，见 [ObjectMapper 配置](./基础用法/ObjectMapper%20配置.md)。配置固定后，可以直接用工具类封装常用 API，见 [JacksonUtils 工具类封装](./高级特性/JacksonUtils%20工具类封装.md)。
