`@ConfigurationProperties` 是 Spring Boot 提供的注解，相比较传统的 @Value 它可以将整个配置文件，直接映射到对象中，比 @Value  更高效。

该注解是 Spring Boot 自动配置中的重要一环，比如对于一个基于 Tomcat 的 Spring Boot 项目即使我们不做任何配置也能正常启动，原始是因为 Tomcat 默认端口号是 8080。但是当我们配置 `server.port=9090` 之后就会发现 Tomcat 端口号就成了 9090 了。

其根本原因就是 Spring Boot 对 Web 服务的配置使用的是 org.springframework.boot.autoconfigure.web. ServerProperties 对象，该类上就使用了 @ConfigurationProperties 注解。当然了，仅使用该注解还无法做到将配置加载到对象中。

@ConfigurationProperties 加载配置的原理是通过 BeanPostProcessor 实现的，其对应的 Bean 后置处理器为 ConfigurationPropertiesBindingPostProcessor。也就是说在bean被实例化后，会调用后置处理器，递归的查找属性，通过反射机制注入值，因此属性需要提供setter和getter方法。

此外，针对此种属性注入的方式，SpringBoot支持 Relaxed Binding（宽松绑定），即只需保证配置文件的属性和setter方法名相同即可。也就是说在配置中配置 context-path、contextPath 是等效的，都可以映射到类的 contextPath 字段。

一个简单的例子来体会一下Relaxed Binding（宽松绑定）：

```java
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "my.main-project.person")
public class MyPersonProperties {

    private String firstName;

    public String getFirstName() {
        return this.firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
}
```

上面这个示例代码中，在配置文件中使用如下配置都可以映射到该类：

| **配置**                          | **说明**                                                     |
| :-------------------------------- | :----------------------------------------------------------- |
| my.main-project.person.first-name | Kebab case，.properties 和 .yml 配置文件最常用的方式         |
| my.main-project.person.firstName  | 标准驼峰方式                                                 |
| my.main-project.person.first_name | 下划线表示法，在 `.properties` 和 `.yml` 文件中使用的另一种格式 |
| MY_MAINPROJECT_PERSON_FIRSTNAME   | 大写格式，在使用系统环境变量时推荐使用                       |

注意：@ConfigurationProperties注解中 prefix 的值必须是 kebab-case 风格（例如my.main-project.person）。具体可以查看一下 [Spring Boot 官方文档 Relaxed Binding（以 Spring Boot 2.7.15 为例）](https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.relaxed-binding)。

另外，如果想在 JavaBean 上使用 `@ConfigurationProperties` 注解，Spring Boot 文档特别强调的几点：

|**NOTE**|
|:-----------------------------------|
|属性必须要有getter、setter方法。|
|如果属性的类型是集合，要确保集合是不可变的。|
|使用JavaBean属性绑定的方式只针对标准 Java Bean 属性，不支持对静态属性的绑定。|
|如果使用 Lombok 自动生成getter/setter 方法，一定不要生成对应的任何构造函数，因为 Spring IOC 容器会自动使用它来实例化对象。|

具体可以看下 [JavaBean Properties Binding 官方文档（以 Spring Boot 2.7.15 为例）](https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.java-bean-binding)。

如果想要使用 `@ConfigurationProperties` 注解进行属性注入，记得在 pom.xml 文件中添加 spring-boot-configuration-processor 依赖：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-configuration-processor</artifactId>
</dependency>
```

Spring 考虑到带有 `@ConfigurationProperties` 注解的类可能不适合扫描（比如基于条件启动），所以 Spring 并不会自动扫描带有 `@ConfigurationProperties` 注解的类。

在这种情况下，推荐使用 `@EnableConfigurationProperties` 注解指定要处理的类型列表（即：将 `@ConfigurationProperties` 注释的类加到 Spring IOC 容器中）。一般通过将 `@EnableConfigurationProperties` 加在 `@Configuration` 类上完成。

这种方式在Spring源码中被广泛使用，即：

```java
@Configuration
@EnableConfigurationProperties(MonitorConfigurationProperties.class)
public class Config {

}
```

```java
@ConfigurationProperties(prefix = "monitor")
public class MonitorConfigurationProperties {
    /**
     * 应用名称
     */
    private String appId;
    /**
     * 服务地址
     */
    private String serverUrl = "localhost:8080";
    /**
     * 集合
     */
    private List<Integer> data = new ArrayList<>();

    // Getter/Setter ...
}

```

另外，也可以直接在 JavaBean 上使用 `@Configuration` 和 `@ConfigurationProperties` 注解，让 Spring IOC 可以自动扫描到 `@ConfigurationProperties` 注解标注的类（不过不推荐）：

```java
@Configuration
@ConfigurationProperties(prefix = "monitor")
public class MonitorConfigurationProperties {
    /**
     * 应用名称
     */
    private String appId;
    /**
     * 服务地址
     */
    private String serverUrl = "localhost:8080";
    /**
     * 集合
     */
    private List<Integer> data = new ArrayList<>();

    // Getter/Setter ...
}
```

## JSR-303 对 @ConfigurationProperties 验证

`@ConfigurationProperties` 还提供了对 JSR-303 注解验证支持，在 pom 文件中添加 spring-boot-starter-validation 依赖：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

当你在对含有 `@ConfigurationProperties` 注解的 JavaBean 使用Spring 的 `@Validated` 注解时，Spring Boot 会尝试验证此类：

```java
@Validated
@ConfigurationProperties(prefix = "monitor")
public class MonitorConfigurationProperties {
    /**
     * 应用名称
     */
    @NotBlank
    private String appId;
    /**
     * 服务地址
     */
    private String serverUrl = "localhost:8080";
    /**
     * 集合
     */
    private List<Integer> data = new ArrayList<>();

    // Getter/Setter ...
}
```

现在，appId 属性是必填项，当我们不去配置时就会启动失败：

<img width="" src="https://@media/spring-media/ConfigurationProperties/configuration-properties-validated.png" alt="configuration-properties-validated.png" />

另外，有些博客会告诉你当编写一个配置类时记得同时在 MATE-INF 目录下创建一个 spring-configuration-metadata.json 文件，并在该文件中以 JSON 的格式编写属性配置信息（如属性类型、释义以及默认值），这样当你编辑配置时就会有属性提示。

实际上并不需要，因为这些事情 Spring Boot 会自动当你完成，当你编译或构建项目时会自动在 classes 文件下生成该文件。示例如下：

<img width="" src="https://@media/spring-media/ConfigurationProperties/configuration-properties-metadata-json.png" alt="configuration-properties-metadata-json.png" />

之后编写配置时对应的属性提示就出来了：

<img width="" src="https://@media/spring-media/ConfigurationProperties/configuration-properties-tips.png" alt="configuration-properties-tips.png" />

--

[https://docs.spring.io/spring-boot/docs/current/reference/html/configuration-metadata.html](https://docs.spring.io/spring-boot/docs/current/reference/html/configuration-metadata.html)

[https://docs.spring.io/spring-boot/docs/2.1.17.RELEASE/reference/html/configuration-metadata.html#configuration-metadata-annotation-processor](https://docs.spring.io/spring-boot/docs/2.1.17.RELEASE/reference/html/configuration-metadata.html#configuration-metadata-annotation-processor)

[https://www.mdoninger.de/2015/05/16/completion-for-custom-properties-in-spring-boot.html](https://www.mdoninger.de/2015/05/16/completion-for-custom-properties-in-spring-boot.html)

[https://docs.spring.io/spring-boot/docs/2.1.13.RELEASE/reference/html/boot-features-external-config.html#boot-features-external-config-typesafe-configuration-properties](https://docs.spring.io/spring-boot/docs/2.1.13.RELEASE/reference/html/boot-features-external-config.html#boot-features-external-config-typesafe-configuration-properties)

[https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.java-bean-binding](https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.java-bean-binding)

[https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.relaxed-binding](https://docs.spring.io/spring-boot/docs/2.7.15/reference/html/features.html#features.external-config.typesafe-configuration-properties.relaxed-binding)
