对象转 JSON 字符串（序列化）主要用 `ObjectMapper#writeValueAsString`：

```java
public String writeValueAsString(Object value) throws JsonProcessingException;
```

还有输出到字节、文件、流的几个重载：

```java
public byte[] writeValueAsBytes(Object value);
public void writeValue(File resultFile, Object value);
public void writeValue(OutputStream out, Object value);
public void writeValue(Writer w, Object value);
```

## 基本用法

```java
ObjectMapper objectMapper = new ObjectMapper();

User user = User.builder().name("张三").age(18).build();
String json = objectMapper.writeValueAsString(user);
```

```json
{"name":"张三","age":18,"date":null,"time":null,"dateTime":null,"tags":null}
```

## 字段名按什么确定

Jackson 默认不直接用字段名，而是**从 getter / setter 方法名推断属性名**，再作为 JSON 的 key。推断规则（默认 `USE_STD_BEAN_NAMING=false`）：

1. 去掉 `get` / `set` / `is` 前缀；
2. 把剩余部分**首字母转小写**（不看第二个字符是否大写）。

| getter | 默认属性名 | 开启 `USE_STD_BEAN_NAMING` |
|:---|:---|:---|
| `getName()` | `name` | `name` |
| `getURL()` | `url` | `URL` |
| `getIEType()` | `iEType` | `IEType` |

字段 `iEType` 配 `getIEType()` / `setIEType()`（Lombok 对「首字母小写、第二字符大写」的字段就是这么生成），默认推断出 `iEType`，正好等于字段名，序列化输出 `iEType`。

### 字段名与属性名不一致的坑

字段名和 getter 推断出的属性名对不上时（第二字符大小写敏感的字段最易踩，或手写 getter 拼错），Jackson 2.x 会把「字段」和「getter 推出的属性」当成**两个不同的属性**，后果：

- 序列化可能输出两个 key；
- 反序列化按属性名匹配 JSON，字段名对不上 → 值接不进字段。

例如字段 `iEType`，getter 误写成 `getIeType()`（`e` 小写）→ 推断属性 `ieType` ≠ 字段 `iEType`，前端传 `iEType` 反序列化时该字段为 null。

:::warning
字段名、getter 推断名、JSON key 三者必须一致，否则 Jackson 2.x 下序列化 / 反序列化会错位。Jackson 3.0 新增 `FIX_FIELD_NAME_UPPER_CASE_PREFIX`（默认开启），会按大小写不敏感合并字段与 getter，缓解了这类问题，但 2.x 没有这个保护。
:::

### 强制指定字段名

别依赖推断，用 `@JsonProperty` 直接钉死属性名，最精准、不受命名策略和版本影响：

```java
@JsonProperty("iEType")
private String iEType;
```

`@JsonProperty` 标在字段或 getter 上都行，优先级高于推断和 `PropertyNamingStrategy`。

若整批字段都要走 JavaBean 标准命名（前两个字符都大写时保留，如 `getURL()` → `URL`），可全局开启：

```java
objectMapper.configure(MapperFeature.USE_STD_BEAN_NAMING, true);
```

这是全局开关，会影响所有字段，且对 `iEType` 这类反而可能让属性名（`IEType`）与字段名（`iEType`）脱节，慎用；个别字段用 `@JsonProperty` 更稳妥。

## 忽略 null / 空字段

用 `setSerializationInclusion` 全局控制，`JsonInclude.Include` 取值：

| 值 | 含义 |
|:---|:---|
| `ALWAYS`（默认） | 全部输出 |
| `NON_NULL` | 跳过 null |
| `NON_EMPTY` | 跳过 null、`""`、空集合 / 数组 |
| `NON_ABSENT` | 跳过 null 及 `Optional.empty()` 等 |

```java
objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
```

字段级用 `@JsonInclude`，优先级高于全局：

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
private String name;
```

## 忽略 transient 字段

默认情况下 `transient` 字段也会被序列化，开启以下配置才忽略：

```java
objectMapper.configure(MapperFeature.PROPAGATE_TRANSIENT_MARKER, true);
```

## 忽略指定字段

`@JsonIgnoreProperties` 作用于类或字段，列出要忽略的属性名：

```java
@JsonIgnoreProperties({"name", "age"})
public class User { ... }
```

单字段直接用 `@JsonIgnore`：

```java
@JsonIgnore
private String password;
```

`FilterProvider` 也能过滤，但要配合 `@JsonFilter` 注册 ID，写法繁琐、不直观，能用注解解决就别用它：

```java
SimpleFilterProvider filterProvider = new SimpleFilterProvider();
filterProvider.addFilter("userFilter",
        SimpleBeanPropertyFilter.filterOutAllExcept("name"));
objectMapper.setFilterProvider(filterProvider);

@JsonFilter("userFilter")
public class User { ... }
```

`filterOutAllExcept` 语义是「除了列出的都忽略」，反直觉，容易踩坑。

## 字段排序

默认按字段声明顺序输出。按字典序全局开启：

```java
objectMapper.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
```

类级别用 `@JsonPropertyOrder`：

```java
@JsonPropertyOrder(alphabetic = true)
public class User { ... }
```

## 格式化输出

开启缩进，输出带换行缩进的可读 JSON：

```java
objectMapper.configure(SerializationFeature.INDENT_OUTPUT, true);
```

```json
{
  "name" : "John",
  "age" : 30
}
```

底层由 `PrettyPrinter` 决定。`DefaultPrettyPrinter` 是缺省实现，支持缩进；`MinimalPrettyPrinter` 不带缩进、不带多余空白，适合有签名校验、对字符严格要求的场景，即便开了 `INDENT_OUTPUT` 也会被它覆盖成紧凑输出：

```java
objectMapper.setDefaultPrettyPrinter(new MinimalPrettyPrinter());
```

## 输出到文件

```java
objectMapper.writeValue(new File("/path/test.json"), user);
```

## 节点模型

动态拼装 / 读取 JSON 而不定义 POJO，用 `ObjectNode` / `ArrayNode`，见 [节点模型 ObjectNode 与 ArrayNode](./节点模型%20ObjectNode%20与%20ArrayNode.md)。

## Java8 日期问题

`LocalDate` / `LocalDateTime` 等默认会序列化成一大坨字段对象，需要注册 `JavaTimeModule`，见 [java.time 日期格式问题](./java.time%20日期格式问题.md)。
