Jackson 序列化 `BigDecimal` 默认输出数字：

```java
BigDecimal money = new BigDecimal("1.01");
// {"money":1.01}
```

这有两个隐患：

- 金额、大整数等场景，前端 JS 用 `Number` 接收会丢精度（`123456789.123456789` 变成 `123456789.12345679`）。
- Jackson 对科学计数法的 `BigDecimal`（如 `new BigDecimal("1E+10")`）会原样输出 `1E+10`，下游解析容易出错。

把它们序列化成字符串就稳了：`{"money":"1.01"}`。

## 自定义序列化器

```java
public class BigDecimalAsStringJsonSerializer extends JsonSerializer<BigDecimal> {
    @Override
    public void serialize(BigDecimal value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        // toPlainString 不产生科学计数法
        gen.writeString(value.toPlainString());
    }
}
```

关键是 `toPlainString()`，它保证 `1E+10` 输出成 `10000000000` 而不是 `1E+10`。

## 用法

**字段级**，用 `@JsonSerialize` 注解：

```java
public class Order {
    @JsonSerialize(using = BigDecimalAsStringJsonSerializer.class)
    private BigDecimal amount;
}
```

**全局级**，通过 `SimpleModule` 注册，所有 `BigDecimal` 都转字符串：

```java
SimpleModule module = new SimpleModule();
module.addSerializer(BigDecimal.class, new BigDecimalAsStringJsonSerializer());
objectMapper.registerModule(module);
```

## 与 null 默认值配合

如果同时启用了 [序列化时自定义 NULL 输出](./序列化时自定义%20NULL%20输出.md)，`BigDecimal` 的 null 默认值 `"0"` 是由 null 序列化器处理的，非 null 值才走这里的字符串序列化器，两者各管一段。
