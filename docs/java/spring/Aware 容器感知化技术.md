## 前言

Spring 框架最牛之处就是其 IOC 了，我们甚至可以说 Spring 就是 IOC 的产物，而且 IOC 是在面试过程中经常会被问到的问题。首先大家要明白一个问题：IOC 不是技术，而是一种思想！

而 Spring 框架最大的亮点就是 依赖注入 与 AOP 。这里需要特别强调的是：依赖注入就是 IOC 思想的具体应用，但是如果你将 依赖注入等价于ioc 就大错特错了！不知道你有没有通过依赖查找？如果你没听过依赖查找那你是否使用过 @Lookup 注解？即使你没有用过或者听过本文也不做过多讲解，具体你可以看下 单例 Bean 中注入原型 Bean，该章节有 @Lookup 即依赖查找的具体应用！

我们都知道 Spring 最大的亮点之一依赖注入就是你的所有 Bean 对 Spring 容器的存在是没有意识的。即使你将 Spring 容器替换为别的容器（如 Google 的 Guice，该容器也是 IOC 思想的产物），Bean 之间的耦合度依然很低。

但是，在实际项目的开发中我们难免会用到 Spring 容器本身的资源来达到我们的目的，这时候的 Bean 就必须感知到 Spring 容器的存在，才能调用 Spring 容器本身的资源，这就是所谓的 Spring Aware 容器感知化技术。

:::tip
Spring Aware 设计本身就是为了 Spring 内部使用的，而不是对外部开放使用，因为一旦你的类使用了 Aware 那将会与 Spring 框架高度耦合。所以，在项目中是否应该使用 Spring Aware 应该根据实际情况进行权衡利弊！
:::

## Aware 标记接口

Spring Aware 对外开放了所有 Aware 接口的超接口： `Aware` 。该接口是一个空壳接口，用于标记。相当于 JDK 对外提供的一个序列化接口 `Serializable` 一样。怎么描述 `Aware` 接口呢？或许我们应该这么描述它：该接口用于标记一个 Bean，当该 Bean 符合 Spring 特定框架条件时就会对该对象进行传递一次生命周期钩子。

这段话可能难以理解，你也可以这么想：Spring 本身处理自身的逻辑，当在执行某一个操作是发现某个 Bean 符合通知条件。就会对该对象进行一次回调，事实上，该方式是一个 `void-returning` 方法，该方法接受一个参数。

下面是一段为代码用于理解该接口：

```java
public T doSomething(){
    // 处理自身逻辑 ...


    if (Condition){
        // 满足特定条件进行一个 void-returning 回调
        doAware(arg);
    }
}

// 注意是 void 方法
public void doAware(T arg){
    // do something
}
```

这段伪代码不止是否能够理解，如果理解就简单了，如果不理解就继续往下看。

在 Spring 框架中 `Aware` 是一个超接口，仅仅是用于标记。具体的应用是其子接口，比如： `BeanNameAware` 接口。下面这张图是 Spring 框架提供的所有的 `Aware` 子接口：

![](https://@media/spring-media/Aware/AwareInterface.webp)

很多时候，理解某一个接口或方法直接通过其命名即可理解。这也是在编码过程中非常重要的一项准则，如果你读读 Spring 源码，你会发现其命名跟诗一样。尽管很长，但是容易理解。

下面就分别看下该接口的子接口的具体应用，以下不会按上面截图顺序进行讲解，而是按从简到难一步一步进行说明。

## BeanNameAware

`BeanNameAware` 接口是最易于理解的接口，该接口很简单：

```java
public interface BeanNameAware extends Aware {

	void setBeanName(String name);

}
```

凡是实现了该接口并重写其中方法的 Bean，在 Spring 容器进行初始化时会通过该方法将该 Bean 的名称进行返回。现在来看下具体实例：

```java
public class User implements BeanNameAware {

    private String beanName;

    @Override
    public void setBeanName(String name) {
        this.beanName = name;
    }

    public void printBeanName(){
        System.out.println(beanName);
    }
}
```

该类实现了 `BeanNameAware` 接口，我们将该接口传递的参数 `name` 的值赋值给 `beanName` 属性，之后再 `printBeanName` 方法中打印该 Bean 的名称。

之后再来使用 `ApplicationContext` 注册该类为 Bean：

```java
public class Application {
    public static void main(String[] args) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.registerBean(User.class);
        context.refresh();  // <==== 注意, 一定要调用该方法

        User user = context.getBean(User.class);
        user.printBeanName();
    }
}
```

之后打印的名称为 `user` ，这同时也说明了一个问题。如果不具体指定具体类的 Bean 的名称，默认情况下 Spring 会将该 Bean 的名称设置为该类的首字母小写的名称。如 `UserService` 注册为 Bean 时，其默认的 Bean 的名称为 `userService` 。

同时你也可以将 `context.registerBean(User.class)` 替换为 `context.registerBean("customBeanName", User.class)` 。其中 `customBeanName` 就是你想要设置的 Bean 的名称。

所以，该接口的应用很简单。仅仅是在容器初始化时将该 Bean 的名称传递过来，不能说很鸡肋但是在实际项目中确实没什么用处，而且代码耦合性太强，所以！了解了解即可！

## EnvironmentAware

如果说 `BeanNameAware` 接口是鸡肋的话，那该接口却是开天辟地的应用了。因为该接口应用太强大了，该接口会传递一个 `Environment` 对象，你可以通过该对象获取到你的配置文件中的任何属性的值！现在，你能够想象该接口的应用了吗？

试想一下，在某个类中。你没办法获取配置文件的属性，那你就可以实现该接口，按照该接口动态获取你想要的配置文件任何属性值！最基本的应用比如 JDBC 的配置，如果你不方便直接获取那你完全可以通过该接口将其值传递过来，甚至完全可以使用一个类利用反射机制将配置文件中的说有属性与值配置到某个类中，之后你再获取该值直接使用该类即可！同样的，看下实例应用：

在资源目录 `resources` 下创建一个配置文件 `application.properties` ，内容如下：

```properties
project.name=Spring Aware 容器化感知技术
project.author=ituknown.org
```

创建一个 `Project` 类，将该配置文件中的值全部设置给具体属性，同时增加一个 JavaConfig 配置读取配置文件：

```java
public class Project implements EnvironmentAware {

    private String name;

    private String author;

    private static Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        Project.environment = environment;
        this.name = environment.getProperty("project.name", "");
        this.author = environment.getProperty("project.author", "");
    }

    // Getter 、Setter And ToString
}

// JavaConfig
@Configuration
@PropertySource("classpath:application.properties")  // <== 读取配置文件
public class Config {

    @Bean
    public Project project(){
        return new Project();
    }
}

// 测试类
public class Application {
    public static void main(String[] args) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.registerBean(Config.class);
        context.refresh();

        Project project = context.getBean(Project.class);
        System.out.println(project.toString());
    }
}
```

最后，输出结果如下：

```properties
Project{name='Spring Aware 容器化感知技术', author='ituknown'}
```

所以，在某些情况下 `EnvironmentAware` 是很重要的！

## ResourceLoaderAware

`ResourceLoaderAware` 接口是用于资源加载的感知接口，可以从 classpath 下、磁盘空间甚至远程加载资源。这个功能很有帮助，你记不记得 SpringBoot 配置文件？是不是分为两种： `application.properties` 和 `bootstrap.properties` 。其中 `bootstrap.properties` 我们一般会在其中配置数据仓库的地址，从仓库中读取所需的配置文件。

所以，`ResourceLoaderAware` 完全可以实现该功能，因为它可以读取网络上资源。在使用该功能你只需要记得相关协议即可。比如如果加载项目下资源文件就使用 `classpath` ，如果想要加载本地磁盘上的资源文件就使用 `file://` 。同样如果想要加载网络上的资源你只需要使用相关协议即可，比如 `ftp` 、 `http` 等等。

现在，就来分别进行一次演示。我们先来看下加载项目资源文件：

#### 加载项目资源文件

同样来，在项目资源目录 `resources` 下创建一个配置文件： `application.properties` ，内容如下：

```properties
project.name = Spring Aware Container perception technology
project.author = ituknown
```

:::info
之后也使用该文件的相同内容演示，不在赘述
:::


创建一个类 `MyResourceLoader` 并实现 `ResourceLoaderAware` ，在内部获取 `classpath` 下的资源文件：

```java
public class MyResourceLoader implements ResourceLoaderAware {

    @Override
    public void setResourceLoader(ResourceLoader resourceLoader) {

        Resource resource = resourceLoader.getResource("classpath:application.properties");
    }
}
```

现在，我们获取到了 `resource` 对象。那我们就可以做任何操作，比如打印每行信息：

```java
try (BufferedReader bufferedReader =
     new BufferedReader(new InputStreamReader(resource.getInputStream()))) {
    String line;
    while ((line = bufferedReader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    // ExceptionHandler
}
```

在比如说，转换成 Properties 对象，之后就能使用获取各个属性的值了：

```java
try {

    Properties properties = PropertiesLoaderUtils.loadProperties(resource);

    // 获取属性值
    String name = properties.getProperty("project.name");

} catch (IOException e) {
    // ExceptionHandler
}
```

现在来编写测试类测试一下：

```java
public class Application {
    public static void main(String[] args) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.registerBean(MyResourceLoader.class);
        context.refresh();
    }
}
```

你也可以运行看输出结果是否正确！

#### 加载磁盘和网络资源文件

同样的，如果想要加载磁盘资源文件只需要使用 `file://` 协议即可。比如这里将 `application.properties` 文件放置在 `/Users/ituknown/Download` 目录下，跟之前的代码一样，修改下位置即可：

```java
public class MyResourceLoader implements ResourceLoaderAware {

    @Override
    public void setResourceLoader(ResourceLoader resourceLoader) {

        Resource resource = resourceLoader.getResource("file:///Users/ituknown/Download/application.properties");
    }
}
```

加载网络资源：

```java
public class MyResourceLoader implements ResourceLoaderAware {

    @Override
    public void setResourceLoader(ResourceLoader resourceLoader) {

        Resource resource = resourceLoader.getResource("http://www.xx.xx/application.properties");
    }
}
```

## NotificationPublisherAware

## BeanClassLoaderAware

该接口其实是一个类加载器，也就是 JDK 下 `java.lang` 包下载 `ClassLoader` 类。类加载器的作用相信大家都知道：将字节码文件加载进入虚拟机。

在 JVM 中我们如何判断一个类是否相等？有两个条件：包类相同且由同一个类加载器加载！

而这里的 `BeanClassLoaderAware` 接口会返回一个 `ClassLoader` 对象，该对象就是用于加载 Bean 的类加载器。

类加载具体有什么用，不做过多解释。现在来看一个实例。

在资源目录 `resources` 下穿件一个 `application.properties` 文件，在文件中输入任意配置。现在使用类加载器进行加载该资文件内容：

```java
Enumeration<URL> urls = ClassLoader.getSystemResources("application.properties");
while (urls.hasMoreElements()){
    URL url = urls.nextElement();

    // 有了 resource 对象后我们就可以做任意操作
    UrlResource resource = new UrlResource(url);

    // 比如转换成 Properties 对象获取配置文件格式数据:
    Properties properties = PropertiesLoaderUtils.loadProperties(resource);
}
```

这也是 `ClassLoader` 最简单的应用。有了该对象你可以做任何事情：

```java
public class CustomClassLoader implements BeanClassLoaderAware {

    // 这里特意命名为 Bean 就是提示该类加载器是加载
    // Bean 的类加载器
    private ClassLoader beanClassLoader;

    @Override
    public void setBeanClassLoader(ClassLoader classLoader) {
        this.beanClassLoader = classLoader;
    }
}
```

## MessageSourceAware
