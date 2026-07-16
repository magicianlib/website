## 前言

`BeanFactory` 接口和 FactoryBean 接口在面试总经常会被问到，原因仅仅是太过相识。实际上两者并没有任何关系，但是这两个接口在 Spring 以及第三方框架中应用却非常广泛，尤其是 FactoryBean 在 `MyBatis` 中的应用。

从字面上理解： `BeanFactory` 是 Bean 的工厂，工厂能干什么？自然是用来生产产品的！而 `BeanFactory` 就是用来生产 Bean 的工厂接口。即使你是初学者你也直接或间接的使用了该接口，不信？最典型的就是在没使用 SpringBoot 之前，你有没有使用过 `SSM` 或者 `SSH` 框架？

在你的资源目录下是不是有一个 `spring.xml` 文件？另外，你是不是注意到在项目下有一个类，该类里面只有如下一行代码：

```java
ClassPathXmlApplicationContext context = new ClassPathXmlApplicationContext("classpath:spring.xml");
```

这行代码你一定很熟悉！如果从来没注意过有这行代码那(痴儿，你自悟去吧🐶🐶).....

另外，如果说你没见过这行代码。那在你的项目中使用使用过 JavaConfig 配置实现？你又是否使用过或者见别人使用过如下这行代码：

```java
AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(Config.class);
```

相信我，你一定用过。这行代码就是基于 JavaConfig + 注解的项目配置启动类。不管是上面一行代码还是这行代码它们都与 `BeanFactory` 有有着直接的关系，稍后会做详细的说明。

至于 FactoryBean 接口的话没见过也能够理解，因为作为 `C/V` 大法使用者来说，也可以理解！但是看过这篇文章后如果你还说你没使用过那就不可原谅了！因为， FactoryBean 在 `MyBatis`  中有着核心的应用！

## BeanFactory

事实上， `BeanFactory` 接口是 Spring 的核心也是最基本的 `IOC`  容器，而我们最常用的高级容器 `ApplicationContext` 接口就是扩展了该接口。我们经常使用 `BeanFactory` 的方式就是使用一个类去实现 `BeanFactoryAware` 接口，之后再容器初始化时会返回该类一个 `BeanFactory` 对象。有了该对象后我们就能获取 Spring 容器的每一个 Bean。先来看下 `BeanFactory` 的扩展图：

![](https://@media/spring-media/BeanFactoryAndFactoryBean/BeanFactoryHierarchy.webp)

看了这张图后你是不是应该明白了些什么？我们在项目中所使用的 `AnnotationConfigApplicationContext` 、 `FileSystemXmlApplicationContext` 以及 `ClassPathXmlApplicationContext` 都是间接的实现了 `BeanFactory` 接口，最主要的是： `ApplicationContext` 高级容器接口就是实现继承至该接口！

现在先来看下 `BeanFactory` 接口，该接口有如下方法

```java
public interface BeanFactory {
    // 该常量与 FactoryBean 接口有关, 在之后的 FactoryBean 中做说明
    String FACTORY_BEAN_PREFIX = "&";

    // 通过 Bean 的名称获取 Bean, 比如 "user"
    Object getBean(String name);

    // 当容器中存在相同类型的多个 Bean 时就使用该方法获取 Bean
    <T> T getBean(String name, Class<T> requiredType);

    // 通过类型获取 Bean
    <T> T getBean(Class<T> requiredType) throws BeansException;
    Object getBean(String name, Object... args) throws BeansException;
    <T> T getBean(Class<T> requiredType, Object... args) throws BeansException;

    // 获取bean的提供者（对象工厂）
    <T> ObjectProvider<T> getBeanProvider(Class<T> requiredType);
    <T> ObjectProvider<T> getBeanProvider(ResolvableType requiredType);

    // 判断容器中是否包含指定名称的 bean
    boolean containsBean(String name);

    // 判断指定名称的 bean 是否为单例
    boolean isSingleton(String name);

    // 判断指定名称的 bean 是否为原型
    boolean isPrototype(String name);

    // 指定名字的bean是否和指定的类型匹配
    boolean isTypeMatch(String name, ResolvableType typeToMatch);
    boolean isTypeMatch(String name, Class<?> typeToMatch);

    // 通过指定名称获取 bean 的类型
    @Nullable
    Class<?> getType(String name) throws NoSuchBeanDefinitionException;
    @Nullable
    Class<?> getType(String name, boolean allowFactoryBeanInit) throws NoSuchBeanDefinitionException;

    // 通过名称获取 bean 的别名
    String[] getAliases(String name);
}
```

上面是该接口定义的方法，看到方法后会发现这些方法也无非是通过名称或者类型获取 Bean，判断 Bean 的范围等等。另外，如果你了该接口后你会返现该接口上还定义了一个字符常量： `String FACTORY_BEAN_PREFIX = "&"` 。该常量与 FactoryBean 接口有关, 在之后的 FactoryBean 中会做说明。

现在来使用一个测试类来验证一下这些接口：

```java
// 组件
@Component("user")
public class User {

    private String name = "ituknown";

    private String sex = "boy";

    // Getter 、Setter And ToString
}

// JavaConfig
@Configuration
@Import(User.class)
public class Config {
}

// 测试类
public class Application {
    public static void main(String[] args) {


        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(Config.class);

        System.out.println("-------------ByType----------");
        User userByType = context.getBean(User.class);
        System.out.println(userByType.toString());
        System.out.println("\n");

        System.out.println("-------------ByName----------");
        User userByName = (User) context.getBean("user");
        System.out.println(userByName.toString());
    }
}
```

输出结果

```plaintext
-------------ByType----------
User{name='ituknown', sex='boy'}

-------------ByName----------
User{name='ituknown', sex='boy'}
```

其实，有关 `BeanFactory` 我们最常使用的方式就是 `BeanFactoryAware` 接口，以如下方式：

```java
public class Component implements BeanFactoryAware {

    private BeanFactory beanFactory;

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        this.beanFactory = beanFactory;
    }

    /* 演示示例 */
    public Object getBean(String name){
        return beanFactory.getBean(name);
    }
}
```

即一个类实现 `BeanFactoryAware` 获取 `BeanFactory` ，这样在声明周期内即可使用 `BeanFactory` 对象获取任何 Bean。最典型的就是经常会在项目中遇到一个工具类，该工具类实现了 `ApplicationContextAware` 接口，该接口就是扩展了 `BeanFactory` 接口，相当于 `ApplicationContext` 接口。这样在项目中如果某个类没有被 Spring 管理但是又需要在该类中使用 Spring 对象就会使用该实现类，最典型的应用就是在工具类中的使用。比如我们定义一个 `SpringContextUtil` 工具类实现了 `ApplicationContext` 接口，定义如下：

```java
@Component
public class SpringContextUtil implements ApplicationContextAware {
	private static ApplicationContext applicationContext;

	private SpringContextUtil() {
	}

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		SpringContextUtil.applicationContext = applicationContext;
	}

	/**
	 * 获取 bean
	 *
	 * @param name bean 名称
	 * @return {@link Object}
	 */
	public static Object getBean(String name) {
		return this.applicationContext.getBean(name);
	}

	/**
	 * 获取bean
	 *
	 * @param clazz bean 类型
	 * @return T
	 */
	public static <T> T getBean(Class<T> clazz) {
		checkApplicationContext();
		return this.applicationContext.getBean(clazz);
	}

	/**
	 * 获取bean
	 *
	 * @param name bean 名称
	 * @param clazz bean 类型
	 * @return T
	 */
	public static <T> T getBean(String name, Class<T> clazz) {
		return this.applicationContext.getBean(name, clazz);
	}
}
```

之后，如果在某个工具类中使用 Spring 对象。你会发现 直接使用 `@Autowire` 是无法注入的，这个使用就直接使用该工具类即可获取，比如获取 `UserService` 对象：

```java
UserService service = SpringContextUtil.getBean(UserService.class);
```

怎么样，是不是很简单？

这就是 `BeanFactory`  接口，他就是一个 Spring 的 IOC 容器，下面再来看下 FactoryBean ：

## FactoryBean

FactoryBean 接口很好理解，工厂Bean（字面上意思理解即可）！

确实，该接口是一个特殊的 Bean，凡是实现了该接口的类都是一个 Bean！该接口只有三个接口：

```java
public interface FactoryBean<T> {

	@Nullable
	T getObject() throws Exception;

	@Nullable
	Class<?> getObjectType();

	default boolean isSingleton() {
		return true;
	}

}
```

在 JDK8 之前，实现了该接口的类必须重写它的三个方法。不过自 JDK8，新增了 `detault` 关键字，用于标注为默认方法。所以，如果使用的是 JDK8 之后的版本重写其中两个接口即可！

```java
/**
 * 指定 Bean 对象
 */
T getObject();
/**
 * 指定 Bean 的类型
 */
Class<?> getObjectType();
/**
 * 执行该 Bean 是否为单例，默认为单例 Bean
 */
boolean isSingleton();
```

现在来定义一个类 `CustomFactoryBean` 实现该接口：

```java
// @Component("user") <== 注释该注解
public class User {

    private String name = "ituknown";

    private String sex = "boy";

    // Getter 、Setter And ToString
}

@Component("customFactoryBean")  // <==== 注意这里
public class CustomFactoryBean implements FactoryBean {

    @Override
    public Object getObject() throws Exception {
        return new User();
    }

    @Override
    public Class<?> getObjectType() {
        return User.class;
    }

    public void print(){
        System.out.println("CustomFactoryBean.class");
    }
}
```

在该类上特意使用 `@Component` 注解指定了 Bean 的名称，原因之后进行说明。另外，还自定义了一个方法用于演示说明！

现在但从这个类来说，它会参数两个 Bean！分别是 `User.class` 类型的 Bean 和 `CustomFactoryBean.class` 类型的 Bean。使用该类你要时刻记住一点： FactoryBean  本身就是一个 Bean！而它同时能够产生一个新 `Bean` ，该 Bean 的类型就是 `Class<?> getObjectType()` 返回的类型，该 Bean 的对象就是 `T getObject()` 返回的对象！

现在来启动测试类：

```java
public class Application {
    public static void main(String[] args) {

        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(CustomFactoryBean.class);

        CustomFactoryBean custom = context.getBean(CustomFactoryBean.class);
        custom.print();

        User user = context.getBean(User.class);
        System.out.println(user.toString());
    }
}
```

输出结果：

```
CustomFactoryBean.class
User{name='ituknown', sex='boy'}
```

从结果上说明了一个问题： `CustomFactoryBean` 类产生了两个 Bean！这也是 FactoryBean 的最大特性，现在应该理解了该接口的作用了吧？

另外，我们在该类上使用了 `@Component` 注解，并指定的 Bean 的名称是 `customFactoryBean` 。那现在来看如下代码：

```java
CustomFactoryBean bean = (CustomFactoryBean) context.getBean("customFactoryBean");
bean.print();
```

这行代码会输出什么？结果令人不可思议的是启动报错：

```
Exception in thread "main" java.lang.ClassCastException: com.ituknown.User cannot be cast to com.ituknown.CustomFactoryBean
	at com.ituknown.Application.main(Application.java:10)
```

输出信息提示： `User.class` 类型不能被转换成 `CustomFactoryBean.class` 类型！是不是很不可思议？

我们都知道，`@Component` 注解作用在哪个类上就是对哪个类生效。但是这里是怎么回事？为什么命名作用在 `CustomFactoryBean` 类上却说 `User.class`  类型转换问题？难道该注解指定的 Bean 的名称是 `User.class` 类型的？那来试一下：

```java
User userBean = (User) context.getBean("customFactoryBean");
System.out.println(userBean.toString());
```

不可思议的是输出了如下信息：

```plain
User{name='ituknown', sex='boy'}
```

<details open>
<summary>**最后，我们能知道一件事情**</summary>

FactoryBean 的实现类产生了两个 Bean，如果在该实现类上使用注解指定了 Bean 的名称，那么该名称作用的是产生的新 Bean，而不是 FactoryBean 本身！
</details>

有点绕口是不是？好好理解一下！现在我们再来看之前的留下的一个小问题。就是在 `BeanFactory` 接口中定义了一个常量： `String FACTORY_BEAN_PREFIX = "&";` 。当时说该字符与 FactoryBean 有关！好了，不打马虎眼了，直接说了。我们在使用注解定义实现类的 Bean 的名称是不是无法获得该 Bean 吗？那你在名称前加上 `&` 符号再试一下：

```java
CustomFactoryBean bean = (CustomFactoryBean) context.getBean("&customFactoryBean");
bean.print();
```

这回正常输出了，这就是 FactoryBean 的使用。到这里你有策底明白该接口的作用了吗？

在文章最开始的时候特意强调该接口在 `MyBatis` 中广泛使用，不是到还记得不？在配置 MyBatis 的时候你有记得配置过一个叫做 `SqlSessionFactory` 的工厂 Bean 吗？下面是一个简单示例：

```java
@Configuration
public class MyBatisConfig {

    @Bean
    public DruidDataSource druidDataSource() {
        DruidDataSource dataSource = new DruidDataSource();

        // 省略其他配置 ...

        return dataSource;
    }

    // 重点是这个方法↓↓↓↓↓↓↓↓↓
    @Bean
    public SqlSessionFactory sqlSessionFactory() {
      SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
      factoryBean.setDataSource(druidDataSource());
      // 省略其他配置 ...

      return factoryBean.getObject();
    }

    @Bean
    public DataSourceTransactionManager dataSourceTransactionManager() {
        return new DataSourceTransactionManager(druidDataSource());
    }

    @Bean
    public SqlSessionTemplate sqlSessionTemplate() {
        return new SqlSessionTemplate(sqlSessionFactory());
    }
}
```

这个示例的代码熟悉吗？你有发现过 在配置 `SqlSessionFactory` 的时候回利用 `SqlSessionFactoryBean` 吗？来看下该类的实现关系：

```java
public class SqlSessionFactoryBean
    implements
    FactoryBean<SqlSessionFactory>,
    InitializingBean, ApplicationListener<ApplicationEvent> {

}
```

所以，该类底层还是 FactoryBean 的实现类。那么为什么要使用该接口呢？现在将该类的主要方法展示出来：

```java
public class SqlSessionFactoryBean
    implements
    FactoryBean<SqlSessionFactory>,
    InitializingBean, ApplicationListener<ApplicationEvent> {

    private SqlSessionFactory sqlSessionFactory;

    @Override
    public SqlSessionFactory getObject() throws Exception {
      if (this.sqlSessionFactory == null) {
        afterPropertiesSet();
      }

      return this.sqlSessionFactory;
    }

    @Override
    public Class<? extends SqlSessionFactory> getObjectType() {
      return this.sqlSessionFactory == null ? SqlSessionFactory.class : this.sqlSessionFactory.getClass();
    }

    @Override
    public boolean isSingleton() {
      return true;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
      this.sqlSessionFactory = buildSqlSessionFactory();
    }

    protected SqlSessionFactory buildSqlSessionFactory() throws IOException {

      Configuration configuration;
      // 各种属性配置, 省略 X 行

      return this.sqlSessionFactoryBuilder.build(configuration);
    }
}
```

我们最终能够得到这些信息： SqlSessionFactoryBean 实现了 FactoryBean 接口，该类产生的 Bean 的对象的类型是 SqlSessionFactory，并且在产生的对象是做了各种配置。

其实，如果你查看了 SqlSessionFactoryBean 的源码你会发现里面有许多的配置属性，这些原本都是 SqlSessionFactory 工厂类里面的。如果直接进行配置 SqlSessionFactory 会非常的繁重复杂，但是在实现类里使用很简单的一个配置即可。所以 FactoryBean 解决了这么一个问题：

一个类本身的配置及属性特别繁重复杂，但是想要对外暴露简单的配置就能完成原复杂的逻辑属性配置，那么就可以只是用 FactoryBean 去解决该问题。这就是 FactoryBean 的主要作用！

## 前方高能预警

等等，你真的理解 FactoryBean 接口的 `getObject` 和 `getObjectType` 了吗？现在，我们要利用 ImportBeanDefinitionRegistrar 接口进行注册 Bean 来验证你是否真的理解了 FactoryBean 接口。

:::warning[高能预警]

如果你还不知道 ImportBeanDefinitionRegistrar 接口你需要先进行阅读 [@Import 的三种使用方式](./@Import%20的三种使用方式.md) ，因为该实例会使用到 `@Import` 注解

:::

现在，直接上实例，不过任何说明：

```java
// 实体类
public class User {

    private String name = "ituknown";

    private String sex = "boy";

    // Getter 、Setter And ToString
}

// FactoryBean 实现类
public class CustomFactoryBean implements FactoryBean {

    @Override
    public Object getObject() throws Exception {
        return new User();
    }

    @Override
    public Class<?> getObjectType() {
        return User.class;
    }

    public void print() {
        System.out.println("CustomFactoryBean.class");
    }
}

// ImportBeanDefinitionRegistrar 实现类
public class MyImportBeanRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        GenericBeanDefinition definition = new GenericBeanDefinition();
        definition.setBeanClass(CustomFactoryBean.class); // <== 注意这里⚠️
        registry.registerBeanDefinition("user", definition);
    }
}

// 自定义注解
@Retention(RetentionPolicy.RUNTIME)
@Import(MyImportBeanRegistrar.class)  // <== 在这里引入 MyImportBeanRegistrar
public @interface EnableFactoryBean {
}

// 配置类
@Configuration
@EnableFactoryBean  // <== 使用自定义注解
public class Config {
}
```

基本的代码到此结束，现在有一个很大的疑问就是我们在 `MyImportBeanRegistrar` 类中一行代码： `definition.setBeanClass(CustomFactoryBean.class)` ，接着在最后注入 Bean 的使用设置的 Bean 名称为 `user` 。

现在，我要问的是：在容器中使用 Bean 名称 `user` 获取的 Bean 的类型是什么？是 `User.class` 还是 `CustomerFactoryBean.class` ？

如果你回答的是 `User.class` ，那么恭喜你。你真的懂了 FactoryBean 接口的使用。如果你不懂为什么你需要再次回顾上面的内容！

编写一个测试类：

```java
public class Application {
    public static void main(String[] args) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(Config.class);

        User user = (User) context.getBean("user");
        System.out.println(user.toString());

        // 这里将会报异常
        CustomFactoryBean customFactoryBean = (CustomFactoryBean) context.getBean("user");
        customFactoryBean.print();

    }
}
```

所以，如果懂得了 `CustomFactoryBean` 类中标注的含义那恭喜你真的明白了 FactoryBean 🎉🎉🎉🎉~

## 写在最后

`BeanFactory` 和 FactoryBean  本身步难以理解，只要明白这两个类各自的作用以及使用方式就能够很有效的做区分。最简单理解就是按字面理解即可：`BeanFactory` 是一个 Bean 功能，用于产生 Bean，是 Spring 最基本的 IOC 容器。而 FactoryBean 它本身就是一个特殊的 Bean，所有实现了该接口的类最终会产生两个 Bean。特别需要强调的是：如果在该实现类上使用注解或显示的指定的 Bean 的名称，那么该名称作用的是产生的新对象，而不是该实现类本身。如果想要获取该实现类本身需要在 Bean 的名称前加 `&` 符号进行获取。

而且，FactoryBean 最典型的应用就是在 MyBatis 配置数据源是的 `SqlSessionFactoryBean` 配置。利用该类可以大大简化原有 `SqlSessionFactory` 复杂的配置。如果一个类本身的配置及属性特别繁重，而又想要对外暴露一个简单的配置可以直接利用 FactoryBean 来实现。

俗话说，好记性不如烂笔头。想要很好的理解这两个类还是需要多应用，在关键的问题上做笔记。这样更易于加深理解和记忆~
