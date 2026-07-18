Bean Validation 是一项 Java 规范，提供统一的方式对 JavaBean 的数据进行校验。Hibernate Validator 是该规范的一个实现（也是目前最主流的实现），由 Hibernate 社区维护。

规范定义了一组约束注解和一套校验 API，注解可以标注在类的属性、方法参数、返回值上，声明对应的数据校验规则。例如 `@NotNull` 保证属性非 null，`@Size` 约束字符串或集合的长度范围。Hibernate Validator 负责解析这些注解并执行校验逻辑，并在规范之外提供了快速失败、自定义约束、消息国际化等扩展能力。

## 依赖

```xml
<dependency>
    <groupId>org.hibernate.validator</groupId>
    <artifactId>hibernate-validator</artifactId>
    <version>${version}</version>
</dependency>
```

Hibernate Validator 的消息插值依赖 Jakarta EL 实现。运行在 Web 容器或引入了 `spring-boot-starter-validation` 的 Spring Boot 环境时已自带 EL，无需重复引入。纯 Java SE 环境漏配 EL 实现会抛出：

```
jakarta.validation.ValidationException: HV000183: Unable to initialize 'jakarta.el.ExpressionFactory'.
Caused by: java.lang.ClassNotFoundException: jakarta.el.ExpressionFactory
```

所以需要额外引入引入 Jakarta EL 实现：

```xml
<!-- Hibernate Validator 依赖 EL 实现来解析消息中的表达式, 纯 SE 环境需要显式引入 -->
<dependency>
    <groupId>org.glassfish.expressly</groupId>
    <artifactId>expressly</artifactId>
    <version>${version}</version>
</dependency>
```

:::tip[javax 与 jakarta]
Bean Validation 3.0 起命名空间从 `javax.validation` 迁移到 `jakarta.validation`，EL 同步从 `javax.el` 迁移到 `jakarta.el`。对应关系：Spring Boot 2.x 搭配 Hibernate Validator 6.x（`javax.*`），Spring Boot 3.x 搭配 Hibernate Validator 8.x/9.x（`jakarta.*`）。升级时整套 API 的包名要一起换。
:::

## Validator 工具类最佳实践

`ValidatorFactory` 与 `Validator` 都是线程安全对象，且 `ValidatorFactory` 创建成本较高（要扫描注解、初始化 EL 等），必须缓存为静态单例复用，禁止每次校验都调用 `Validation.buildDefaultValidatorFactory()`。

创建 `Validator` 有两种方式：

```java
// 1. 标准 API: 通过 SPI 自动发现 classpath 上的实现, 拿到默认配置的 Validator
Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

// 2. 显式指定 Hibernate Validator, 可以配置 HV 扩展项 (如 failFast)
Validator validator = Validation.byProvider(HibernateValidator.class)
        .configure()
        .failFast(true) // 快速失败: 遇到第一个校验错误即返回, 不再继续
        .buildValidatorFactory()
        .getValidator();
```

`failFast` 是 Hibernate Validator 的扩展（标准 API 没有），遇到第一个违规就返回，适合只关心「是否合法」而不需要一次性拿到全部错误信息的场景，要使用它就必须走 `byProvider(HibernateValidator.class)`。

`validator.validate(obj)` 返回的是 `Set<ConstraintViolation<T>>`，校验通过时集合为空。直接使用这套 API 调用方要自己判断空集合、提取消息，比较啰嗦，通常封装成工具类：校验失败统一抛 `ConstraintViolationException`，调用方一次 try/catch 即可。

```java
public class ValidatorUtils {

    private static final ValidatorFactory VALIDATOR_FACTORY;
    private static final Map<Locale, Validator> VALIDATOR_CACHE = new ConcurrentHashMap<>();

    static {
        try {
            // failFast 模式: 遇到第一个校验失败即返回
            VALIDATOR_FACTORY = Validation.byProvider(HibernateValidator.class)
                    .configure()
                    .failFast(true)
                    .buildValidatorFactory();
        } catch (Exception e) {
            throw new ExceptionInInitializerError("Failed to initialize Validator: " + e.getMessage());
        }
    }

    /** 获取默认 Locale 对应的 Validator。 */
    public static Validator getValidator() {
        return getValidator(Locale.getDefault());
    }

    /** 获取指定 Locale 对应的 Validator, 使用缓存避免重复创建。 */
    public static Validator getValidator(Locale locale) {
        return VALIDATOR_CACHE.computeIfAbsent(locale, key -> {
            MessageInterpolator interpolator = VALIDATOR_FACTORY.getMessageInterpolator();
            return VALIDATOR_FACTORY.usingContext()
                    .messageInterpolator(new LocaleSpecificMessageInterpolator(interpolator, key))
                    .getValidator();
        });
    }

    /** 使用默认 Locale 和 Default 分组校验, 校验失败抛出 ConstraintViolationException。 */
    public static <T> void validate(T obj) {
        validate(Locale.getDefault(), obj, Default.class);
    }

    /** 使用默认 Locale 和指定分组校验。 */
    public static <T> void validate(T obj, Class<?>... groups) {
        validate(Locale.getDefault(), obj, groups);
    }

    /** 使用指定 Locale 和 Default 分组校验。 */
    public static <T> void validate(Locale locale, T obj) {
        validate(locale, obj, Default.class);
    }

    /** 使用指定 Locale 和指定分组校验。 */
    public static <T> void validate(Locale locale, T obj, Class<?>... groups) {
        Set<ConstraintViolation<T>> violations = getValidator(locale).validate(obj, groups);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }

    // validateProperty 系列重载同样提供 (Locale, obj, groups) 的组合,
    // 用于只校验对象的某个属性, 签名与 validate 一致, 这里省略
}
```

`ValidatorFactory.usingContext()` 可以基于同一个 factory 派生出带不同配置（这里是不同 Locale 的 `MessageInterpolator`）的 `Validator`，开销远低于重新构建 factory。上面用 `ConcurrentHashMap` 按 Locale 缓存这些派生 Validator，既保证多语言切换，又避免重复创建。`LocaleSpecificMessageInterpolator` 的作用见后文[校验消息与国际化](#校验消息与国际化)。

使用方式：

```java
User user = new User();
user.setUsername("alice");
user.setAge(25);

ValidatorUtils.validate(user); // 通过则无返回, 失败抛 ConstraintViolationException
```

## 常用约束注解

约束注解位于 `jakarta.validation.constraints` 包下，Hibernate Validator 另在 `org.hibernate.validator.constraints` 补充了一些扩展注解。

| 注解 | 含义 | 常用属性 |
| --- | --- | --- |
| `@Null` / `@NotNull` | 必须为 null / 非 null | - |
| `@AssertTrue` / `@AssertFalse` | 必须为 true / false | - |
| `@NotBlank` | 字符串非 null 且去除空白后长度 > 0 | - |
| `@NotEmpty` | 字符串、集合、Map、数组非 null 且非空 | - |
| `@Size` | 字符串长度 / 集合大小在范围内 | `min`, `max` |
| `@Length` | 字符串长度范围（Hibernate 扩展） | `min`, `max` |
| `@Min` / `@Max` | 数值不小于 / 不大于指定值 | `value` |
| `@DecimalMin` / `@DecimalMax` | 数值边界（支持字符串表示的高精度） | `value` |
| `@Digits` | 整数位与小数位数上限 | `integer`, `fraction` |
| `@Negative` / `@NegativeOrZero` | 必须为负 / 非正 | - |
| `@Positive` / `@PositiveOrZero` | 必须为正 / 非负 | - |
| `@Pattern` | 字符串匹配正则 | `regexp`, `flags` |
| `@Email` | 邮箱格式（Hibernate 扩展更严格） | `regexp` |
| `@Past` / `@PastOrPresent` | 日期在过去 / 过去或现在 | - |
| `@Future` / `@FutureOrPresent` | 日期在未来 / 未来或现在 | - |

每个注解都支持三个通用属性：`message`（校验失败消息，默认从资源文件加载）、`groups`（分组校验）、`payload`（携带元数据，不参与校验逻辑）。

:::info[@NotNull、@NotEmpty、@NotBlank 的区别]
三者针对「非空」的严格程度递增：

- `@NotNull` 只验证不为 null（空字符串 `""` 能通过）
- `@NotEmpty` 验证非 null 且非空（`""` 和空集合不通过，但纯空白字符串 `"   "` 能通过）
- `@NotBlank` 验证非 null 且去除空白后长度大于 0（`"   "` 不通过）

字符串字段用 `@NotBlank`，集合用 `@NotEmpty`，其余对象引用用 `@NotNull`。
:::

## 自定义约束注解

规范内置的注解不够用时，可以自定义约束注解。一个自定义约束由三部分组成：

- 约束注解本身，标注 `@Constraint(validatedBy = ...)` 指定校验器；
- 校验器 `ConstraintValidator<A, T>`，A 是注解类型，T 是被校验值的类型；
- 校验消息资源文件（可选，不配则用 `message` 字面量）。

下面定义一个 `@AgeRange`，约束 `Integer` 年龄落在 `[min, max]` 区间内。

注解定义：

```java
@Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER, TYPE_USE})
@Retention(RUNTIME)
@Repeatable(List.class)
@Documented
@Constraint(validatedBy = AgeRangeValidator.class)
public @interface AgeRange {

    /** 校验失败消息模板, 默认从资源文件加载。 */
    String message() default "{io.ituknown.validator.AgeRange.message}";

    /** 允许的最小年龄（含）。 */
    int min() default 1;

    /** 允许的最大年龄（含）。 */
    int max() default 100;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    /** 支持在同一元素上重复标注 @AgeRange。 */
    @Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER, TYPE_USE})
    @Retention(RUNTIME)
    @Documented
    @interface List {
        AgeRange[] value();
    }
}
```

约束注解的硬性要求：必须标注 `@Constraint(validatedBy = ...)` 关联校验器；必须包含 `message`、`groups`、`payload` 三个属性（规范规定，缺一不可）；`message` 默认值用 `{全限定注解名.message}` 形式引用资源文件中的消息。`@Repeatable` 让同一字段可以标注多个 `@AgeRange`（如对不同分组用不同区间），需要配套一个容器注解 `List`。

校验器实现：

```java
public class AgeRangeValidator implements ConstraintValidator<AgeRange, Integer> {

    private int min;
    private int max;

    @Override
    public void initialize(AgeRange constraintAnnotation) {
        this.min = constraintAnnotation.min();
        this.max = constraintAnnotation.max();
    }

    @Override
    public boolean isValid(Integer value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        return value >= min && value <= max;
    }
}
```

`initialize` 在校验器初始化时调用一次，用来读取注解属性；`isValid` 执行实际校验，返回 `true` 表示通过。

:::caution[null 值默认视为有效]
约束校验器对 `null` 值应统一返回 `true`（视为有效）。是否允许 null 由 `@NotNull` / `@NotBlank` 这类前置注解决定，自定义约束只负责校验「有值时」的合法性。这样组合性才好：`@AgeRange` 单独用允许不填年龄，搭配 `@NotNull` 才强制必填。
:::

使用：

```java
@Setter
@Getter
class User {

    @NotBlank(groups = Modify.class)
    private String username;

    @AgeRange(min = 0, max = 200)
    private Integer age;

    interface Modify {
    }
}
```

`@NotBlank` 声明了 `groups = Modify.class`，表示它只在 `Modify` 分组下生效；不带 `groups` 的注解默认属于 `Default` 分组。调用 `ValidatorUtils.validate(user)` 只校验 `Default` 分组（不会触发 `username` 的非空校验），`ValidatorUtils.validate(user, User.Modify.class)` 才校验 `Modify` 分组。

## 校验消息与国际化

校验失败的消息走资源文件，约定文件名为 `ValidationMessages`，放在 classpath 根目录，按 Locale 分文件：

```
ValidationMessages.properties          # 默认 (fallback)
ValidationMessages_zh_CN.properties    # 简体中文
ValidationMessages_zh_TW.properties    # 繁体中文
ValidationMessages_en.properties       # 英文
```

资源 key 用约束注解的全限定名加 `.message`，与注解 `message` 默认值 `{io.ituknown.validator.AgeRange.message}` 对应。消息里的 `{min}`、`{max}` 是注解属性的占位符，插值时自动替换为实际值：

```properties
# ValidationMessages_zh_CN.properties
io.ituknown.validator.AgeRange.message=年龄范围只能在 {min} 和 {max} 之间

# ValidationMessages_zh_TW.properties
io.ituknown.validator.AgeRange.message=年齡只能在 {min} ~ {max} 歲之間

# ValidationMessages_en.properties / ValidationMessages.properties
io.ituknown.validator.AgeRange.message=The age can only be between {min} and {max} years old.
```

Locale 匹配规则与 `ResourceBundle` 一致：请求 `Locale.CHINA`（zh_CN）命中 `ValidationMessages_zh_CN.properties`，请求 `Locale.TAIWAN`（zh_TW）命中 `ValidationMessages_zh_TW.properties`，都找不到时回退到默认的 `ValidationMessages.properties`。

:::tip[默认 UTF-8, 中文不乱码]
Hibernate Validator 默认按 UTF-8 读取 `ValidationMessages.properties`，资源文件直接写中文不会乱码。这与 `java.util.ResourceBundle` 默认的 ISO-8859-1 不同（原生 ResourceBundle 读 UTF-8 properties 会乱码，需要自定义 `Control`，详见 [i18n 国际化实现](./i18n%20国际化实现.md)）。
:::

切换 Locale 时复用同一个 `Validator` 并不会改变消息语言，因为 `Validator` 的消息插值器在创建时就绑定了 Locale。前面 `ValidatorUtils` 的做法是用 `ValidatorFactory.usingContext()` 为每个 Locale 派生一个绑定了对应 `MessageInterpolator` 的 `Validator` 并缓存，调用方按需选择：

```java
// 简体中文消息
ValidatorUtils.validate(Locale.CHINA, user);

// 英文消息
ValidatorUtils.validate(Locale.ENGLISH, user);
```

固定 Locale 的插值器是一个装饰器，把任何传入的 Locale 都重定向为构造时指定的目标 Locale，保证同一个缓存 Validator 输出的语言一致：

```java
public class LocaleSpecificMessageInterpolator implements MessageInterpolator {

    private final MessageInterpolator defaultInterpolator;
    private final Locale targetLocale;

    public LocaleSpecificMessageInterpolator(MessageInterpolator defaultInterpolator, Locale targetLocale) {
        this.defaultInterpolator = defaultInterpolator;
        this.targetLocale = targetLocale;
    }

    @Override
    public String interpolate(String messageTemplate, Context context) {
        return defaultInterpolator.interpolate(messageTemplate, context, targetLocale);
    }

    @Override
    public String interpolate(String messageTemplate, Context context, Locale locale) {
        // 忽略调用方传入的 locale, 始终用固定的 targetLocale
        return defaultInterpolator.interpolate(messageTemplate, context, targetLocale);
    }
}
```

校验失败时 `ConstraintViolationException` 的消息就是插值后的本地化文案，例如 `@AgeRange(min=0, max=200)` 校验 `age=500` 在 `Locale.CHINA` 下抛出的异常消息为「年龄范围只能在 0 和 200 之间」。

## 资源链接

[https://beanvalidation.org/](https://beanvalidation.org/)

[https://hibernate.org/validator/](https://hibernate.org/validator/)

[https://docs.jboss.org/hibernate/validator/](https://docs.jboss.org/hibernate/validator/)
