`JsonNode` 是 Jackson 对 JSON 的树形表示。需要动态拼装 / 读取 JSON、不想定义固定 POJO 时，用它的两个子类：

- `ObjectNode`：类似 `Map<String, JsonNode>`
- `ArrayNode`：类似 `List<JsonNode>`

## 创建节点

```java
ObjectMapper objectMapper = new ObjectMapper();

ObjectNode objectNode = objectMapper.createObjectNode();
ArrayNode arrayNode = objectMapper.createArrayNode();
```

如果用的是带配置的全局单例（见 [ObjectMapper 配置](./ObjectMapper%20配置.md)），更稳妥的写法是直接复用它的节点工厂，保证节点与 mapper 的配置一致：

```java
ObjectNode objectNode = new ObjectNode(objectMapper.getNodeFactory());
ArrayNode arrayNode = new ArrayNode(objectMapper.getNodeFactory());
```

## 写入与读取

`ObjectNode.put(...)` 设置一个键值对，`get(key)` 返回的是 `JsonNode`，要再调对应的转换方法取出具体类型：

```java
ObjectNode objectNode = objectMapper.createObjectNode();
objectNode.put("money", new BigDecimal("100.00"));

JsonNode node = objectNode.get("money");
BigDecimal money = node.decimalValue();
```

## 对象与 JsonNode 互转

对象转 `JsonNode` 用 `valueToTree`：

```java
User user = User.builder().name("张三").age(18).build();
JsonNode node = objectMapper.valueToTree(user);
```

JSON 字符串直接解析成 `JsonNode` 用 `readTree`，适合只取其中一两个字段、不反序列化整个结构的场景：

```java
String json = "{\"name\":\"张三\",\"age\":18}";
JsonNode node = objectMapper.readTree(json);

String name = node.get("name").asText();
int age = node.get("age").asInt();
```
