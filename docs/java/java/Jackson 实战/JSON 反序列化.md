JSON字符串转对象(通常称为反序列化)主要使用的是 `ObjectMapper#readValue` 方法。Jackson 提供了多种重载方法，这些方法都定义在 ObjectMapper 类中，下面是 String Json 字符串的三种重载 API：

```java
public <T> T readValue(String content, Class<T> valueType);
public <T> T readValue(String content, JavaType valueType);
public <T> T readValue(String content, TypeReference valueTypeRef);
```

## 字符串转对象

话不多说，直接上代码：

```java
String jsonStr = "{\"name\":\"张三\",\"age\":18,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null}";

ObjectMapper objectMapper = new ObjectMapper();

User user = objectMapper.readValue(jsonStr, User.class);
System.out.println(user);
```

上面的示例使用的是 Class 重载方法 `readValue(String content, Class<T> valueType)` 。

另外我们还可以使用 TypeReference 重载方法 `readValue(String content, TypeReference valueTypeRef)` 来实现相同的效果：

```java
String jsonStr = "{\"name\":\"张三\",\"age\":18,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null}";

ObjectMapper objectMapper = new ObjectMapper();

// 注意 TypeReference 的用法
User user = objectMapper.readValue(jsonStr, new TypeReference<User>(){});
System.out.println(user);
```

不过实际使用时并不推荐使用 `TypeReference` ，因为 Java 的泛型类型擦除机制使得在运行时无法获取具体的类型信息。

## 字符串转集合

在实际使用中我们比较多的应用就是 JSON 数组形式的字符串转集合，想要解决这个问题就不能使用 `Class` 重载方法了，取而代之的是使用 TypeFactory：

```java
String jsonStr = "[{\"name\":\"张三\",\"age\":18,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null},{\"name\":\"李四\",\"age\":20,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null}]";

CollectionType collectionType = objectMapper.getTypeFactory().constructCollectionType(List.class, User.class);

List<User> userList = objectMapper.readValue(json, collectionType);
```

不过也可以使用 `TypeReference` 实现（虽然不推荐）。看下示例：

```java
// 注意 TypeReference 的用法
List<User> user = objectMapper.readValue(jsonStr, new TypeReference<List<User>>(){});
```

封装一个转任意集合的方法：

```java
@SuppressWarnings("unchecked")
public static <E> ArrayList<E> toCollection(String json, Class<E> element) {
    return toCollection(json, ArrayList.class, element);
}

public static <E, C extends Collection<E>> C toCollection(String json, Class<C> collection, Class<E> element) {
    try {
        CollectionType type = MAPPER.getTypeFactory().constructCollectionType(collection, element);
        return MAPPER.readValue(json, type);
    } catch (Exception e) {
        throw new RuntimeException("Parse json to Collection<E> failed:" + json, e);
    }
}
```

使用示例：

```java
@SuppressWarnings("unchecked")
List<User> userList = toCollection(json, ArrayList.class, User.class);
```

## 字符串转Map

同样了，字符串转 Map 也不能少：

```java
String jsonStr = "[{\"name\":\"张三\",\"age\":18,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null},{\"name\":\"李四\",\"age\":20,\"date\":null,\"time\":null,\"dateTime\":null,\"tags\":null}]";

MapType mapType = objectMapper.getTypeFactory().constructMapType(Map.class, String.class, String.class);

Map<String, String> map = objectMapper.readValue(jsonStr, mapType);
```

我们同样需要使用 `TypeReference` API：

```java
// 注意 TypeReference 的用法
Map<String, String> map = objectMapper.readValue(jsonStr, new TypeReference<Map<String, String>>() {});
```

可以进一步的封装成工具类使用：

```java
@SuppressWarnings("unchecked")
public static <K, V> HashMap<K, V> toMap(String json, Class<K> key, Class<V> value) {
    return toMap(json, HashMap.class, key, value);
}

public static <K, V, H extends Map<K, V>> H toMap(String json, Class<H> map, Class<K> key, Class<V> value) {
    try {
        MapType type = MAPPER.getTypeFactory().constructMapType(map, key, value);
        return MAPPER.readValue(json, type);
    } catch (Exception e) {
        throw new RuntimeException("Parse json to Map<K, V> failed:" + json, e);
    }
}
```

继续封装一个 `Collection<Map>` 方法：

```java
@SuppressWarnings("unchecked")
public static <K, V> ArrayList<HashMap<K, V>> toCollectionMap(String json, Class<K> key, Class<V> value) {
    return toCollectionMap(json, ArrayList.class, HashMap.class, key, value);
}

public static <K, V, H extends Map<K, V>, C extends Collection<H>> C toCollectionMap(String json, Class<C> collection, Class<H> map, Class<K> key, Class<V> value) {
    try {
        MapType mapType = MAPPER.getTypeFactory().constructMapType(map, key, value);
        CollectionType collectionType = MAPPER.getTypeFactory().constructCollectionType(collection, mapType);
        return MAPPER.readValue(json, collectionType);
    } catch (Exception e) {
        throw new RuntimeException("Parse json to Collection<Map<K, V>>> failed:" + json, e);
    }
}
```

## 文件转对象

Jackson 不仅能够将普通的 JSON 字符串反序列化为对象，还能够直接从文件中读取 JSON 内容反序列化成对象。

ObjectMapper 提供的 File 三种重载方法：

```java
public <T> T readValue(File src, Class<T> valueType);
public <T> T readValue(File src, JavaType valueType);
public <T> T readValue(File src, TypeReference valueTypeRef);
```

用法与 [字符串转对象](#字符串转对象) 一致，看下下面的示例：

```java
ObjectMapper objectMapper = new ObjectMapper();
User user = objectMapper.readValue(new File("/Users/Desktop/test.json"), User.class);
```

需要说明的是文件并不限制一定是 json 文件，只要文件内容是 JSON 格式就能够正常解析，比如 txt 文件：

```java
ObjectMapper objectMapper = new ObjectMapper();
User user = objectMapper.readValue(new File("/Users/Desktop/test.txt"), User.class);
```

## 网络文件转对象

Jackson 同样提供了从网络文件（URL）读取 JSON 内容的 API，ObjectMapper URL 的三种重载方法定义如下：

```java
public <T> T readValue(URL src, Class<T> valueType);
public <T> T readValue(URL src, JavaType valueType);
public <T> T readValue(URL src, TypeReference valueTypeRef);
```

直接看示例：

```java
ObjectMapper objectMapper = new ObjectMapper();
User user = objectMapper.readValue(new URL("file:/Users/Desktop/test.txt"), User.class);
```

## 二进制流转对象

既然能够从文件和网络中获取 JSON 内容，肯定也能够解析 IO 流：

```java
public <T> T readValue(InputStream src, Class<T> valueType);
public <T> T readValue(InputStream src, JavaType valueType);
public <T> T readValue(InputStream src, TypeReference valueTypeRef);
```

示例：

```java
ObjectMapper objectMapper = new ObjectMapper();
User user = objectMapper.readValue(new FileInputStream(new File("/Users/Desktop/test.txt")), User.class);
```

## 忽略未知字段错误

```java
OBJECT_MAPPER.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
```

## Java8 日期反序列化问题

Jackson在反序列化处理Java8日期存在一些问题：

```json
{
    "name": "张三",
    "age": 18,
    "date": null,
    "time": null,
    "dateTime": "2021-07-26 18:35:02",
    "tags": null
}
```

当你尝试转换成 User 对象时会提示如下错误：

![deserializationJava8DateFail1708509575.png](https://@media/java-media/jackson/deserializationJava8DateFail1708509575.png)

归根结底，这是 Jackson 对 Java8 日期格式化得问题，解决方式见 [java.time 日期格式问题](./java.time%20日期格式问题.md)。
