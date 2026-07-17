默认情况下，`setSerializationInclusion(NON_NULL)` 会把 null 字段直接跳过。但有时下游要求字段必须存在、且按类型给一个「空默认值」：`String` → `""`、集合 → `[]`、`Map` → `{}`、`Number` → `0`、`Boolean` → `false`、`BigDecimal` → `"0"`。

`@JsonInclude` 做不到按类型分情况补值，这类需求要靠 `BeanSerializerModifier`：在序列化每个 Bean 的属性时，给 null 属性挂一个自定义的 null 序列化器。

## 定义各类型的 null 序列化器

```java
public class JacksonBeanNullValueSerializerModifier extends BeanSerializerModifier {

    @Override
    public List<BeanPropertyWriter> changeProperties(SerializationConfig config,
                                                     BeanDescription beanDesc,
                                                     List<BeanPropertyWriter> beanProperties) {

        for (BeanPropertyWriter writer : beanProperties) {
            JavaType javaType = writer.getType();
            Class<?> rawClass = javaType.getRawClass();

            if (javaType.isMapLikeType()) {
                writer.assignNullSerializer(NullMapSerializer.INSTANCE);
            } else if (javaType.isArrayType() || javaType.isCollectionLikeType()) {
                writer.assignNullSerializer(NullCollectionSerializer.INSTANCE);
            } else if (Boolean.class.isAssignableFrom(rawClass)) {
                writer.assignNullSerializer(NullBooleanSerializer.INSTANCE);
            } else if (BigDecimal.class.isAssignableFrom(rawClass)) {
                writer.assignNullSerializer(NullBigDecimalSerializer.INSTANCE);
            } else if (Number.class.isAssignableFrom(rawClass)) {
                // Integer / Long / Double 等都走这里
                writer.assignNullSerializer(NullNumberSerializer.INSTANCE);
            } else if (String.class.isAssignableFrom(rawClass)) {
                writer.assignNullSerializer(NullStringSerializer.INSTANCE);
            }
        }
        return beanProperties;
    }

    public static class NullMapSerializer extends JsonSerializer<Object> {
        public static final NullMapSerializer INSTANCE = new NullMapSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeStartObject();
            gen.writeEndObject();
        }
    }

    public static class NullCollectionSerializer extends JsonSerializer<Object> {
        public static final NullCollectionSerializer INSTANCE = new NullCollectionSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeStartArray();
            gen.writeEndArray();
        }
    }

    public static class NullBooleanSerializer extends JsonSerializer<Object> {
        public static final NullBooleanSerializer INSTANCE = new NullBooleanSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeBoolean(false);
        }
    }

    public static class NullBigDecimalSerializer extends JsonSerializer<Object> {
        public static final NullBigDecimalSerializer INSTANCE = new NullBigDecimalSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeString("0");
        }
    }

    public static class NullNumberSerializer extends JsonSerializer<Object> {
        public static final NullNumberSerializer INSTANCE = new NullNumberSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeNumber(0);
        }
    }

    public static class NullStringSerializer extends JsonSerializer<Object> {
        public static final NullStringSerializer INSTANCE = new NullStringSerializer();
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
            gen.writeString("");
        }
    }
}
```

每个序列化器用单例（`INSTANCE`），避免每个属性 new 一个对象。

## 注册到 ObjectMapper

```java
public static void configureNullValueSerialization(ObjectMapper objectMapper) {
    SerializerFactory factory = objectMapper.getSerializerFactory()
            .withSerializerModifier(new JacksonBeanNullValueSerializerModifier());
    objectMapper.setSerializerFactory(factory);
}
```

## 效果

```java
@Setter
@Getter
public class NullBean {
    private String str;
    private Integer num;
    private Boolean flag;
    private BigDecimal amount;
    private Map<String, String> map;
    private List<String> list;
}

NullBean bean = new NullBean(); // 全部为 null
System.out.println(objectMapper.writeValueAsString(bean));
```

输出，没有 `null`，每个字段都按类型补了默认值：

```json
{"str":"","num":0,"flag":false,"amount":"0","map":{},"list":[]}
```

## 注意

这个 modifier 走的是「字段类型」判断。如果某字段同时被自定义序列化器接管（例如 [BigDecimal 序列化为字符串](./BigDecimal%20序列化为字符串.md) 那种全局 `addSerializer`），两者作用层不同不会冲突；但若对同一字段既挂了 null 序列化器又要求非 null 时走自定义逻辑，要注意 `assignNullSerializer` 只在值为 null 时触发。
