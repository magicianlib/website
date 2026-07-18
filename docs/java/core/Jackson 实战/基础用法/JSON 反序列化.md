JSON 字符串转对象（反序列化）主要用 `ObjectMapper#readValue`，按目标类型有三种重载：

```java
public <T> T readValue(String content, Class<T> valueType);
public <T> T readValue(String content, JavaType valueType);
public <T> T readValue(String content, TypeReference<T> valueTypeRef);
```

入参源除 `String` 外，还有 `byte[]`、`File`、`URL`、`InputStream` 一组同样签名的重载。

## 字符串转对象

```java
String json = "{\"name\":\"张三\",\"age\":18}";
User user = objectMapper.readValue(json, User.class);
```

简单类型用 `Class` 重载即可。带泛型的对象（通用的 `Result<T>` 响应封装）直接传 `Result.class` 会丢类型，见下节。

## 带泛型的对象（Result&lt;T&gt;）

服务调用通常会包一层通用响应：

```java
@Getter
@Setter
public class Result<T> {
    private int code;
    private String message;
    private T data;
}
```

对应的 JSON：

```json
{"code":200,"message":"ok","data":{"name":"张三","age":18}}
```

直接 `readValue(json, Result.class)` 不行，`data` 会被解析成 `LinkedHashMap`，拿不到真正的 `User`。根因是泛型擦除：运行期 `Result<User>` 和 `Result<Order>` 是同一个 `Result.class`，Jackson 无从得知 `data` 的具体类型，只能退化成 `Map`。

**TypeReference**，类型在编码时已知的业务代码里最直观：

```java
Result<User> result = objectMapper.readValue(json, new TypeReference<Result<User>>() {});
User user = result.getData(); // 真正的 User 对象
```

**TypeFactory**，适合类型要动态拼装（元素类型是方法参数、做通用工具）的场景：

```java
JavaType type = objectMapper.getTypeFactory()
        .constructParametricType(Result.class, User.class);
Result<User> result = objectMapper.readValue(json, type);
```

`constructParametricType` 封进工具类后，调用就是一行：

```java
Result<User> result = toObj(json, Result.class, User.class);
```

:::note
「字符串转集合」里说 `TypeReference` 不推荐，是针对封装通用工具方法的语境（元素类型是参数，`TypeReference` 写死泛型没法参数化）。业务代码里类型固定时，`TypeReference` 反而最清晰。
:::

## 无返回值（Result&lt;Void&gt;）

`Void` 是 `T` 的特例，表示「有响应壳、无返回体」，常用于 PUT / DELETE 这类无返回值的接口。两种写法照常可用，`data` 解析为 null：

```java
Result<Void> result = objectMapper.readValue(json, new TypeReference<Result<Void>>() {});
// 或
JavaType type = objectMapper.getTypeFactory().constructParametricType(Result.class, Void.class);
Result<Void> result = objectMapper.readValue(json, type);
```

如果压根不读 `data`，直接用 raw type 省去泛型声明也行：

```java
Result result = objectMapper.readValue(json, Result.class);
```

区别在类型安全：`Result<Void>` 保证 `data` 是 null；raw type 下 `data` 可能是 `LinkedHashMap`（JSON 里带了值时），容易被误用。要明确表达「无返回体」，用 `Result<Void>`。

:::warning
`Void` 不可实例化，即便 JSON 的 `data` 带了非 null 值，Jackson 也会把它置成 null 而不报错，能容忍脏数据，但不会替你校验「data 本应为空」。
:::

## 多层泛型嵌套

`Result<List<User>>` 这种嵌套，`TypeReference` 一步到位：

```java
Result<List<User>> result = objectMapper.readValue(json, new TypeReference<Result<List<User>>>() {});
```

`TypeFactory` 写法要逐层构造，多层时更啰嗦，优先用 `TypeReference`：

```java
JavaType userList = objectMapper.getTypeFactory().constructCollectionType(List.class, User.class);
JavaType type = objectMapper.getTypeFactory().constructParametricType(Result.class, userList);
Result<List<User>> result = objectMapper.readValue(json, type);
```

## 字符串转集合

集合泛型擦除，`readValue(json, List<User>.class)` 行不通，要用 `TypeFactory` 构造集合类型：

```java
CollectionType type = objectMapper.getTypeFactory()
        .constructCollectionType(List.class, User.class);
List<User> users = objectMapper.readValue(json, type);
```

`TypeReference` 也能写，但匿名内部类会留下一个 `.class` 文件，一般不推荐：

```java
List<User> users = objectMapper.readValue(json, new TypeReference<List<User>>() {});
```

封装成泛型方法，把类型构造藏到工具类里：

```java
public static <C extends Collection<E>, E> C toCollection(
        String json, Class<C> collection, Class<E> element) {
    CollectionType type = MAPPER.getTypeFactory().constructCollectionType(collection, element);
    return MAPPER.readValue(json, type);
}

// List<User> users = toCollection(json, ArrayList.class, User.class);
```

## 字符串转 Map

同理用 `constructMapType`：

```java
MapType type = objectMapper.getTypeFactory()
        .constructMapType(Map.class, String.class, Integer.class);
Map<String, Integer> map = objectMapper.readValue(json, type);
```

## 从文件 / URL / 流读取

签名一致，把 `String` 换成对应入参即可。文件不要求扩展名是 `.json`，只要内容是合法 JSON 就能解析：

```java
User fromFile = objectMapper.readValue(new File("/path/data.txt"), User.class);
User fromUrl  = objectMapper.readValue(new URL("file:/path/data.txt"), User.class);
User fromIn   = objectMapper.readValue(new FileInputStream(file), User.class);
```

## 忽略未知字段

JSON 多了目标类没有的字段时，默认会抛 `UnrecognizedPropertyException`。对接外部接口、字段经常变动时，关掉这个校验：

```java
objectMapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
```

## Java8 日期问题

含 `LocalDateTime` 等字段的 JSON 默认反序列化会失败，需要注册 `JavaTimeModule`，见 [java.time 日期格式问题](./java.time%20日期格式问题.md)。
