直接用 `ObjectMapper` 的 `writeValueAsString` / `readValue`，有两个麻烦：泛型集合 / Map 要自己构造 `JavaType`，以及 `JsonProcessingException` 这个受检异常每次都得 try-catch。封装成工具类一次性解决。

设计要点：

- 用 `enum` 单例承载（`enum` 天然线程安全的单例写法），持有两个 mapper 实例（格式化 / 非格式化）。
- 把 `JsonProcessingException` / `IOException` 统一包成自定义运行时异常 `SerializationException` / `DeserializationException`。
- 集合、Map、嵌套类型走 `TypeFactory`，对外暴露最常用的几组重载。

## 自定义异常

```java
@Getter
public class SerializationException extends RuntimeException {
    private final Class<?> sourceClass;
    public SerializationException(Class<?> sourceClass, Throwable cause) {
        super("Failed to serialize instance of [" + sourceClass.getName() + "]", cause);
        this.sourceClass = sourceClass;
    }
}

@Getter
public class DeserializationException extends RuntimeException {
    private final Class<?> targetClass;
    public DeserializationException(Class<?> targetClass, Throwable cause) {
        super("Failed to deserialize data to type [" + targetClass.getName() + "]", cause);
        this.targetClass = targetClass;
    }
}
```

包成运行时异常后，业务代码不用满地 `throws JsonProcessingException`，失败时直接冒泡到统一异常处理。

## 工具类骨架

```java
public enum JacksonUtils {
    ;

    private static final ObjectMapper MAPPER_WITH_FORMAT = createObjectMapper(true);
    private static final ObjectMapper MAPPER_WITHOUT_FORMAT = createObjectMapper(false);

    public static ObjectMapper getObjectMapper(boolean format) {
        return format ? MAPPER_WITH_FORMAT : MAPPER_WITHOUT_FORMAT;
    }

    public static ObjectMapper createObjectMapper(boolean format) {
        JsonMapper.Builder builder = JsonMapper.builder();
        // 通用配置：忽略未知字段 / 跳过 null / 时区 / transient / Date 格式
        applyCommonBuilderConfig(builder, format);
        ObjectMapper mapper = builder.build();
        configureJsr310(mapper); // 注册 java.time.*
        return mapper;
    }

    // ===== 序列化 =====

    public static String toJson(Object obj) {
        return toJson(obj, getObjectMapper(false));
    }

    public static String toJson(Object obj, ObjectMapper mapper) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new SerializationException(obj.getClass(), e);
        }
    }

    // ===== 反序列化 =====

    public static <T> T toObj(String json, Class<T> clazz) {
        return toObj(json, clazz, getObjectMapper(false));
    }

    public static <T> T toObj(String json, Class<T> clazz, ObjectMapper mapper) {
        try {
            return mapper.readValue(json, clazz);
        } catch (IOException e) {
            throw new DeserializationException(clazz, e);
        }
    }

    /** 泛型集合：List<User> = toObj(json, List.class, User.class) */
    public static <T> T toObj(String json, Class<?> parametrized, Class<?>... parameterClasses) {
        JavaType type = getObjectMapper(false)
                .getTypeFactory().constructParametricType(parametrized, parameterClasses);
        return toObj(json, type);
    }
}
```

`createObjectMapper` 里的 `applyCommonBuilderConfig` / `configureJsr310` 见 [ObjectMapper 配置](../基础用法/ObjectMapper%20配置.md)。

## 反序列化重载矩阵

实际工具类会针对不同入参和目标类型铺一组重载，命名统一，调用时按需选：

| 目标类型 | 方法 |
|:---|:---|
| 普通对象 `Class<T>` | `toObj(String json, Class<T> clazz)` |
| 泛型类型 `Type` | `toObj(String json, Type type)` |
| `TypeReference<T>` | `toObj(String json, TypeReference<T> ref)` |
| 泛型容器 | `toObj(String json, Class<?> parametrized, Class<?>... params)` |
| 集合 | `toCollection(String json, Class<C> collection, Class<E> element)` |
| Map | `toMap(String json, Class<H> map, Class<K> key, Class<V> value)` |
| `Collection<Map>` | `toCollectionMap(...)` |

每个方法再按入参源（`String` / `byte[]` / `InputStream`）和是否用自定义 mapper 补重载。这种 `(入参源 × 目标类型)` 的组合用方法重载铺满，调用方一眼就知道用哪个，不用记 `JavaType` 怎么构造。

## 使用

```java
// 序列化
String json = JacksonUtils.toJson(user);
String pretty = JacksonUtils.toJson(user, true);

// 反序列化为对象
User user = JacksonUtils.toObj(json, User.class);

// 反序列化为 List<User>（推荐用参数化类型重载，比 TypeReference 更直观）
List<User> users = JacksonUtils.toObj(json, List.class, User.class);

// 反序列化为 Map<String, Integer>
HashMap<String, Integer> map = JacksonUtils.toMap(json, String.class, Integer.class);
```

工具类本身只做「类型构造 + 异常包装」，所有配置集中在 `createObjectMapper`，需要换行为只改一处。XML、MessagePack 等其他格式也是同样的套路，见 [XML 序列化](../其他格式/XML%20序列化.md)、[MessagePack 二进制序列化](../其他格式/MessagePack%20二进制序列化.md)。
