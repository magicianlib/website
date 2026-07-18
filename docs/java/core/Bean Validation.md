Bean Validation 是一项 Java 规范，旨在提供一种统一的方式来对 JavaBean 内的数据进行验证。而 Hibernate Validator 是 Bean Validation 规范的一个实现（且是目前最好的一个实现），它由 Hibernate 社区开发和维护。

具体来说，Bean Validation 规范定义了一系列用于验证 JavaBean 内容的 API 和约束注解，这些注解可以用于类的属性或方法上，以指定关于这些属性或方法的数据校验规则。例如，你可以使用 `@NotNull` 注解来确保属性不为 null，使用 `@Size` 注解来指定字符串长度范围等等。

Hibernate Validator 实现了 Bean Validation 规范，它提供了对这些约束注解的解析和验证逻辑。除了实现规范中定义的基本功能外，Hibernate Validator 还提供了一些扩展功能，如自定义约束、国际化支持等。

```XML
<dependency>
    <groupId>org.hibernate.validator</groupId>
    <artifactId>hibernate-validator</artifactId>
    <version>${version}</version>
</dependency>
```

```
Caused by: javax.validation.ValidationException: HV000183: Unable to initialize 'javax.el.ExpressionFactory'
	...
Caused by: java.lang.ClassNotFoundException: javax.el.ELManager
	at java.net.URLClassLoader.findClass(URLClassLoader.java:387)
	at java.lang.ClassLoader.loadClass(ClassLoader.java:418)
	at sun.misc.Launcher$AppClassLoader.loadClass(Launcher.java:352)
	at java.lang.ClassLoader.loadClass(ClassLoader.java:351)
	... 9 more
```


```XML
<dependency>
    <groupId>org.glassfish</groupId>
    <artifactId>jakarta.el</artifactId>
    <version>${jakarta.version}</version>
</dependency>
```


```java
Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

// 推荐使用这种形式创建
Validator validator = Validation.byProvider(HibernateValidator.class)
        .configure()
        .failFast(true) // 快速失败
        .buildValidatorFactory()
        .getValidator();
```

## 资源链接

[https://beanvalidation.org/](https://beanvalidation.org/)

[https://hibernate.org/validator/](https://hibernate.org/validator/)

[https://docs.jboss.org/hibernate/validator/](https://docs.jboss.org/hibernate/validator/)

[https://segmentfault.com/a/1190000023451809](https://segmentfault.com/a/1190000023451809)

[https://blog.51cto.com/u_14998860/4867074](https://blog.51cto.com/u_14998860/4867074)