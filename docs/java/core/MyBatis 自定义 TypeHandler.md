TypeHandler（类型处理器）负责 MyBatis 在 Java 类型与 JDBC 类型之间做转换。绝大多数情况下内置的就够用了，只有遇到敏感字段加密、自定义类型与数据库列互转这类需求，才需要自己写一个。

## TypeHandler 是什么，有什么用？

JDBC 只认一组固定的 SQL 类型（`VARCHAR`、`INTEGER`、`TIMESTAMP`…），Java 侧的类型要丰富得多，两者之间的转换就由 TypeHandler 完成。它在两个时机介入：

- **写入**：往 `PreparedStatement` 设置参数，Java 值 → JDBC 值。
- **读取**：从 `ResultSet`（或存储过程的 `CallableStatement`）取值，JDBC 值 → Java 值。

SQL 里每个 `#{param}` 入参、结果集的每一列，背后都经过一个 TypeHandler。

类型落在 JDBC 能直接表达的范围内（`String` ↔ `VARCHAR`、`Integer` ↔ `INTEGER`…），内置处理器会自动处理；需要自定义的典型场景：

- **加密存储**：敏感字段入库前加密、读取时解密。
- **脱敏**：身份证号、手机号出库时打码。
- **自定义类型映射**：JSON 对象以字符串存进 `VARCHAR`，读取时反序列化；或一组值序列化成 JSON。
- **枚举**：按名称还是按序号存取。
- **NULL 处理**：把数据库的 `NULL` 转成 Java 侧更合适的表示。

## 标准库实例

MyBatis 内置了大量 TypeHandler，覆盖几乎所有常用类型，启动时由 `TypeHandlerRegistry` 自动注册。常见的几个（完整列表见文末官方文档）：

| 类型处理器 | Java 类型 | JDBC 类型 |
| --- | --- | --- |
| `BooleanTypeHandler` | `Boolean` / `boolean` | `BOOLEAN` |
| `IntegerTypeHandler` | `Integer` / `int` | `NUMERIC` / `INTEGER` |
| `LongTypeHandler` | `Long` / `long` | `NUMERIC` / `BIGINT` |
| `BigDecimalTypeHandler` | `BigDecimal` | `NUMERIC` / `DECIMAL` |
| `StringTypeHandler` | `String` | `CHAR` / `VARCHAR` |
| `ClobTypeHandler` | `String` | `CLOB` / `LONGVARCHAR` |
| `ByteArrayTypeHandler` | `byte[]` | 字节流类型 |
| `BlobTypeHandler` | `byte[]` | `BLOB` / `LONGVARBINARY` |
| `DateTypeHandler` | `java.util.Date` | `TIMESTAMP` |
| `SqlTimestampTypeHandler` | `java.sql.Timestamp` | `TIMESTAMP` |
| `EnumTypeHandler` | 枚举 | 字符串（存枚举名称） |
| `EnumOrdinalTypeHandler` | 枚举 | 数值（存枚举序号） |

:::tip[NOTE]
从 MyBatis 3.4.5 起，`java.time.*`（`LocalDateTime`、`LocalDate`、`Instant` 等）的处理器也内置了，无需再手写转换。
:::

自定义之前，先确认有没有现成的能直接用。

## 自定义 TypeHandler

两种写法：

1. 实现 `org.apache.ibatis.type.TypeHandler<T>` 接口；
2. 继承 `org.apache.ibatis.type.BaseTypeHandler<T>`（官方推荐）。

直接实现接口得自己处理 `null`；`BaseTypeHandler` 已经把 `null` 判断包好了，子类只需实现四个「非空」方法，正好对应上面两个转换方向：

| 方法 | 方向 | 作用 |
| --- | --- | --- |
| `setNonNullParameter(PreparedStatement, int, T, JdbcType)` | Java → 数据库 | 把非空 Java 值设置到 `PreparedStatement` 上 |
| `getNullableResult(ResultSet, String)` | 数据库 → Java | 按列名从结果集取值并转换 |
| `getNullableResult(ResultSet, int)` | 数据库 → Java | 按列下标从结果集取值并转换 |
| `getNullableResult(CallableStatement, int)` | 数据库 → Java | 从存储过程输出参数取值并转换 |

> 写入时，`BaseTypeHandler` 会先判断参数是否为 `null`：是则调用 `ps.setNull()`，否则才调用你的 `setNonNullParameter`。所以实现里只关心非空逻辑即可。

一个字符串加密处理器：写入用 AES/GCM 加密后存库，读取解密还原。

```java
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Base64;

/**
 * 对字符串字段做 AES/GCM 对称加密的 TypeHandler。
 * 写入时加密并以 Base64 字符串存库，读取时解密还原为明文。
 */
public class EncryptedStringTypeHandler extends BaseTypeHandler<String> {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    /**
     * 加密密钥（128 bit）。
     * 生产环境中务必从配置中心或密钥管理服务（KMS）读取，切勿硬编码。
     */
    private static final SecretKeySpec SECRET =
            new SecretKeySpec("0123456789abcdef".getBytes(StandardCharsets.UTF_8), "AES");

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * 写入：加密明文（Java → 数据库）。
     */
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, String parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, encrypt(parameter));
    }

    /**
     * 读取：解密密文（数据库 → Java）。
     */
    @Override
    public String getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return decrypt(rs.getString(columnName));
    }

    @Override
    public String getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return decrypt(rs.getString(columnIndex));
    }

    @Override
    public String getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return decrypt(cs.getString(columnIndex));
    }

    /**
     * AES/GCM 加密：每次生成随机 IV，把 IV 拼在密文前，整体 Base64 编码。
     * 这样同一明文每次的密文都不同，且密文自带 IV，无需单独存储。
     */
    private static String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_BYTES];
            RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, SECRET, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("加密失败", e);
        }
    }

    /**
     * AES/GCM 解密：Base64 解码后取出前 12 字节作为 IV，剩余部分为密文。
     */
    private static String decrypt(String cipherText) {
        if (cipherText == null) {
            return null;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(cipherText);
            byte[] iv = Arrays.copyOfRange(combined, 0, IV_BYTES);
            byte[] ct = Arrays.copyOfRange(combined, IV_BYTES, combined.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, SECRET, new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("解密失败", e);
        }
    }
}
```

核心就一句话：写库前的逻辑放 `setNonNullParameter`，读出后的逻辑放 `getNullableResult`。

要让处理器自动关联某个 Java 类型或 JDBC 类型，加注解即可（都可选）：

```java
@MappedTypes(String.class)        // 声明处理的 Java 类型
@MappedJdbcTypes(JdbcType.VARCHAR) // 声明处理的 JDBC 类型
public class EncryptedStringTypeHandler extends BaseTypeHandler<String> {
    // ...
}
```

## 使用方式

按作用范围从小到大，有这么几种。

### 字段级（最常用）

在单个字段上指定处理器。写入用 `#{property, typeHandler=全限定类名}`：

```xml
<insert id="insert">
    insert into user (id, id_card_number)
    values (#{id}, #{idCardNumber, typeHandler=com.example.EncryptedStringTypeHandler})
</insert>
```

读取在 `resultMap` 里给字段加 `typeHandler`：

```xml
<resultMap id="userMap" type="com.example.User">
    <id column="id" property="id"/>
    <result column="id_card_number" property="idCardNumber"
            typeHandler="com.example.EncryptedStringTypeHandler"/>
</resultMap>
```

:::danger
读取走 TypeHandler 时，`select` 必须用 `resultMap` 而非 `resultType`，否则映射不到处理器。
:::

注解写法等价，用 `@Result` 指定：

```java
@Select("select * from user where id = #{id}")
@Results(id = "userMap", value = {
        // 其他字段的映射...
        @Result(
                property = "idCardNumber",
                column = "id_card_number",
                jdbcType = JdbcType.VARCHAR,
                typeHandler = EncryptedStringTypeHandler.class)
})
User getById(@Param("id") int id);
```

### 全局注册

注册为全局后，所有该类型字段都会走它（覆盖同类型内置处理器）：

```xml
<typeHandlers>
    <typeHandler handler="com.example.EncryptedStringTypeHandler"/>
</typeHandlers>
```

或扫描整个包（此时 JDBC 类型只能用 `@MappedJdbcTypes` 声明）：

```xml
<typeHandlers>
    <package name="com.example.typehandler"/>
</typeHandlers>
```

:::warning[NOTE]
全局注册会接管 `String ↔ VARCHAR` 的**所有**字段——其它不需要加密的 `VARCHAR` 也会被加密。加密这类强语义处理器，更适合按字段指定。
:::

两个细节：

- Java 类型默认由处理器泛型推断（`BaseTypeHandler<String>` → `String`）；可在 `<typeHandler>` 上用 `javaType="String"` 覆盖，或在类上加 `@MappedTypes`。
- `@MappedJdbcTypes` 会**限制**生效范围；从 3.4.0 起，若某 Java 类型只注册了一个处理器，它在 `ResultMap` 里自动成为默认。

### Spring Boot

`application.yml` 配扫描包即可：

```yaml
mybatis:
  type-handlers-package: com.example.typehandler
```

或手动配置 `SqlSessionFactoryBean`：

```java
@Bean
public SqlSessionFactoryBean sqlSessionFactory(DataSource dataSource) {
    SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setTypeHandlersPackage("com.example.typehandler");
    return factory;
}
```

另外，`<configuration>` 的子元素**必须**按固定顺序出现，否则启动报错（顺序如下，每个都可选，但出现就得按这个排）：

1. `properties`
2. `settings`
3. `typeAliases`
4. `typeHandlers`
5. `objectFactory`
6. `objectWrapperFactory`
7. `reflectorFactory`
8. `plugins`
9. `environments`
10. `databaseIdProvider`
11. `mappers`

---

参考链接：

- [MyBatis 官方文档 - 类型处理器（typeHandlers）](https://mybatis.org/mybatis-3/zh_CN/configuration.html#typeHandlers)
- [BaseTypeHandler JavaDoc](https://mybatis.org/mybatis-3/apidocs/org/apache/ibatis/type/BaseTypeHandler.html)
