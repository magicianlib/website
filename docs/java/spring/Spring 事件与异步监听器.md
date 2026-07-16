## 前言

Spring 的事件发布与监听机制的本质原理其实就是观察者模式的一种实现。

Spring 中的事件与监听器可以理解为是成对关系出现的，这个就等同于观察者模式中的被观察者和观察者之间的关系。对于监听器而言事件其实就是一个类型，每个监听器都可以监听特定类型的事件。这就很好理解监听器与事件之间的关系了，比如我们在写程序时将事件进行一次抽象，使用抽行类或接口定义一个事件：

```java
public interface Event {
}
```

对于监听器而言，它监听的是 `Event` 这个类型的事件。如果这个事件接口有多个实现类我们是不是都可以监听的到？

所以，监听器监听的是一类事件，它与事件之间的关系是一对多的关系，能够理解这点在实际中就会有很多应用。

知道 Spring 事件与监听器之间的关系之后我们就来尝试定义一组事件监听器。Spring 的事件与监听器都是配套出现，只定义一类是没有任何意义的，现在就来看下怎么定义。

## 定义事件

Spring 的事件定义都源于JDK 依赖库中内置的一个事件类： `java.util.EventObject` ：

```java
public class EventObject implements java.io.Serializable {

    protected transient Object  source;

    public EventObject(Object source) {
        if (source == null)
            throw new IllegalArgumentException("null source");

        this.source = source;
    }

    public Object getSource() {
        return source;
    }

    public String toString() {
        return getClass().getName() + "[source=" + source + "]";
    }
}
```

在 JDK 的事件对象类中定义了一个构造方法，且参数是一个 Object 类型的事件源（ `source` ）。对于这个源应该很好理解，简单的说就是从哪里来，简单粗暴。

而在 Spring 框架中官方人员对该类做了进一步扩展，看下类的继承关系图：

![EventObject.png](https://@media/spring-media/EventListener/EventObject.png)

`ApplicationEvent` 抽象类是 Spring 对 `java.util.EventObject` 做的初步扩展，该类没有其他实际意义，仅仅只是在其基础上增加了事件创建时间属性：

```java
public abstract class ApplicationEvent extends EventObject {

	private final long timestamp;

	public ApplicationEvent(Object source) {
		super(source);
		this.timestamp = System.currentTimeMillis();
	}

	public final long getTimestamp() {
		return this.timestamp;
	}
}
```

而且，对于构造方法中的事件源参数 `source` 似乎也不太好理解（如果不知道 `java.util.EventObject` 的话）。所以，在实际使用中我们还是以 `ApplicationContextEvent` 抽行类为主：

```java
public abstract class ApplicationContextEvent extends ApplicationEvent {

	public ApplicationContextEvent(ApplicationContext source) {
		super(source);
	}

	public final ApplicationContext getApplicationContext() {
		return (ApplicationContext) getSource();
	}
}
```

这个抽象类与 `ApplicationEvent` 在功能上没有任何区别。要说区别的话可能就是在构造方法中限定了事件源 `source` 对象类型为 `ApplicationContext` 。作为 Spring 框架的搬运工大家对这个接口并不陌生，因为它是 Spring 工厂的高级容器接口。使用该类就可以显示的告诉所有程序对象事件源来自于 Spring 容器，全权由 Spring 管理。所以，在实际使用中还是应该以 `ApplicationContextEvent` 类为主。

现在就基于该类定义一个事件，在直播网站中如果某个用户进入直播间通常都会有一个标语：欢迎xx进入直播间，一起走波小礼物~

那我们就定义一个上线的事件类： `OnlineApplicationEvent` ：

```java
public class OnlineApplicationEvent extends ApplicationContextEvent {

	private final String nickname;

	public OnlineApplicationEvent(ApplicationContext source, String nickname) {
		super(source);
		this.nickname = nickname;
	}

	public String getNickname() {
		return this.nickname;
	}
}
```

这里只是演示使用，所以只是简单的再构造方法中将用户的名称传递过来，并赋给属性 `nickname` 。

现在事件类定义好了，我们就需要定义一个该时间对应的监听器了。

:::info[注意]
事件是一个对象，每发布一个事件就需要创建一个新的事件对象，所以我们不应该将事件类注册为 Bean 交给 Spring 容器管理。
:::

## 定义事件监听器

既然 JDK 定义了事件对象肯定就有相应的监听器类，这个监听器是一个接口类： `java.util.EventListener` ，其内部没有定义任何方法，是个空壳接口类。所有的一切都有程序员自行扩展：

```java
public interface EventListener {
}
```

而 Spring 的事件监听器也继承自该类，Spring 内部定义的基础事件监听器类是 `ApplicationListener` ：

```java
@FunctionalInterface
public interface ApplicationListener<E extends ApplicationEvent> extends EventListener {

	void onApplicationEvent(E event);
}
```

看到这个类我们唯一需要注意的是该类指定的泛型： `E extends ApplicationEvent` 。也就是说，该监听器只监听 `org.springframework.context.ApplicationEvent` 类型的事件。现在再回头看下我们在之前定义事件的过程，是不是推荐使用 `ApplicationContextEvent` 事件类？而该类又继承自 `ApplicationEvent` 。

另一点需要注意的是内部定义的抽象方法 `onApplicationEvent(E event)` 。这个参数就是我们在发布事件时的事件对象，比如我们要发布用户上线事件，那该参数类型是不是就是 `OnlineApplicationEvent` 了？

现在就来定义一个监听器类 `OnlineApplicationListener` :

```java
@Component
public class OnlineApplicationListener implements ApplicationListener<OnlineApplicationEvent> {
	@Override
	public void onApplicationEvent(OnlineApplicationEvent event) {
		System.out.println(Thread.currentThread().getName() + "线程通知事件: " + event.getNickname() + "上线了, 欢迎进入直播间~");
	}
}
```

我们定义的上线事件监听类 `OnlineApplicationListener` 实现了 `ApplicationListener` 接口类，因为我们需要监听 `OnlineApplicationEvent` 类型的事件，所以我们将泛型定义为我们需要监听的事件即可。

在重写的方法中我们打印了一句话：线程名 + 上线用户，在之后的示例中要注意下这个线程名，以便更容易理解之后的异步事件监听器的使用。

:::info[注意]
由于事件监听器监听的是一组事件，所以我们应该将事件监听器注册为 Bean 交于 Spring 容器管理。
:::

现在就来运行一下程序看下效果：

```java
public static void main(String[] args) {

    AnnotationConfigApplicationContext applicationContext = new AnnotationConfigApplicationContext();
    applicationContext.register(OnlineApplicationListener.class);
    applicationContext.refresh();

    System.out.println("-----------------");
    OnlineApplicationEvent applicationEvent = new OnlineApplicationEvent(applicationContext, "抹茶大大");
    applicationContext.publishEvent(applicationEvent);
    System.out.println("-----------------");
}
```

打印结果如下：

```
-----------------
main线程通知事件: 抹茶大大上线了, 欢迎进入直播间~
-----------------
```

## 事件监听器扩展

定义事件监听器除了上面的方法之外还有其他两种方法：

通过 `SmartApplicationListener` 实现事件监听器，该类同样是一个接口，且继承自 `ApplicationListener` 接口类，看下源码：

```java
public interface SmartApplicationListener extends ApplicationListener<ApplicationEvent>, Ordered {

	boolean supportsEventType(Class<? extends ApplicationEvent> eventType);

	default boolean supportsSourceType(@Nullable Class<?> sourceType) {
		return true;
	}

	@Override
	default int getOrder() {
		return LOWEST_PRECEDENCE;
	}
}
```

该接口类的特点是取消了泛型取而代之的是使用 `supportsEventType` 方法进行确定事件类型。除此之外还额外实现了 `Ordered` 接口类定义了监听器执行顺序。当然，使用之前的方式同样可以实现顺序功能的，所以觉得该类有点鸡肋。看下这个类怎么使用吧：

```java
@Component
public class SmartOnlineApplicationListener implements SmartApplicationListener {

	@Override
	public boolean supportsEventType(Class<? extends ApplicationEvent> eventType) {
		return eventType.isAssignableFrom(OnlineApplicationEvent.class);
	}

	@Override
	public void onApplicationEvent(ApplicationEvent event) {
		OnlineApplicationEvent applicationEvent = (OnlineApplicationEvent) event;
		System.out.println(Thread.currentThread().getName() + "线程通知事件: " + applicationEvent.getNickname() + "上线了, 欢迎进入直播间~");
	}
}
```

似乎也没有什么区别，唯一的区别就是多了 `supportsEventType` 方法。该方法与泛型是等效效果，当该方法的返回值为 true 时才会继续执行 `onApplicationEvent` 监听器方法。所以在实际使用中根据个人喜好选择即可~

还有一种更简单的基于注解的事件监听器，该注解就是 `@EventListener` ：

```java
@Target({ElementType.METHOD, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface EventListener {

	@AliasFor("classes")
	Class<?>[] value() default {};

	@AliasFor("value")
	Class<?>[] classes() default {};

	String condition() default "";

}
```

看下该类 `@Target` 定义的值，是不是表示可以用于方法或者 Class 类？而内部定义的参数根据实际需要选择即可，看下怎么使用该类达到与上面两种同样的效果：

```java
@Component
public class SimpleEventListener {

	@Order(-1)
	@EventListener
	public void listenerOnlineEvent(OnlineApplicationEvent event) {
		System.out.println(Thread.currentThread().getName() + "线程通知事件: " + event.getNickname() + "上线了, 欢迎进入直播间~");
	}
}
```

emm.... 似乎简单了不少，需要注意的是，如果监听器方法的参数，这个参数就是需要监听的事件的类型。

## 异步事件监听器

上面定义的事件监听器都是非常简单的同步事件监听器（还记得上面打印的线程名称吗）。我们试想一下，事件监听器是否应该影响业务？比如注册了新用户，我们需要发送短信或者发送邮件填写验证码激活。而这个通知结果实际上是不应该影响实际业务的，如果本次用户没有收到短信或者邮件只需要用户重新点击再次发送即可。

而上面的同步事件监听器存在的问题是：如果在监听器中抛出了一个异常就会影响实际的业务流程。

比如我们将事件监听器改成如下：

```java
@Component
public class OnlineApplicationListener implements ApplicationListener<OnlineApplicationEvent> {

	@Override
	public void onApplicationEvent(OnlineApplicationEvent event) {
		System.out.println(Thread.currentThread().getName() + "线程通知事件: " + event.getNickname() + "上线了, 欢迎进入直播间~");
		System.out.println(1 / 0);
	}
}
```

我们只是在监听器中打印 `1/0` 的结果，0 是不能做被除数的，所以这里肯定会抛出异常的。看下启动程序：

```java
public static void main(String[] args) {

    AnnotationConfigApplicationContext applicationContext = new AnnotationConfigApplicationContext();
    applicationContext.register(OnlineApplicationListener.class);
    applicationContext.refresh();

    System.out.println("-----------------");
    OnlineApplicationEvent applicationEvent = new OnlineApplicationEvent(applicationContext, "抹茶大大");
    applicationContext.publishEvent(applicationEvent);
    System.out.println("-----------------");
}
```

当运行这段程序时“理想情况下”是不是应该打印如下结果：

```
-----------------
main线程通知事件: 抹茶大大上线了, 欢迎进入直播间~
Exception in thread "main" java.lang.ArithmeticException: / by zero
-----------------
```

而实际情况却是：

```
-----------------
main线程通知事件: 抹茶大大上线了, 欢迎进入直播间~
Exception in thread "main" java.lang.ArithmeticException: / by zero
	at io.gitee.ituknown.event.OnlineApplicationListener.onApplicationEvent(OnlineApplicationListener.java:18)
	at io.gitee.ituknown.event.OnlineApplicationListener.onApplicationEvent(OnlineApplicationListener.java:12)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.doInvokeListener(SimpleApplicationEventMulticaster.java:172)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.invokeListener(SimpleApplicationEventMulticaster.java:165)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.multicastEvent(SimpleApplicationEventMulticaster.java:139)
	at org.springframework.context.support.AbstractApplicationContext.publishEvent(AbstractApplicationContext.java:382)
	at org.springframework.context.support.AbstractApplicationContext.publishEvent(AbstractApplicationContext.java:339)
	at io.gitee.ituknown.ItuknownApplication.main(ItuknownApplication.java:22)
```

只打印了一条 `-----------------` ，同样需要注意下执行事件监听器的线程是 `main` ，这似乎就影响到实际业务了。

那到底该怎么配置异步监听器呢？这就需要看源码进行解决了。

### 异步监听器原理源码解析

对 Spring 初始化流程有点了解的应该知道容器初始化是从 `AbstractApplicationContext#refresh()` 这个方法开始的，在这个方法中有三个与事件发布与监听的方法，如下：

```java
public abstract class AbstractApplicationContext extends DefaultResourceLoader
      implements ConfigurableApplicationContext {

   @Override
   public void refresh() throws BeansException, IllegalStateException {
      synchronized (this.startupShutdownMonitor) {

        // ...

         try {

            // 初始化事件分发器 Bean(也叫事件管理器)
            initApplicationEventMulticaster();

            // 支持事件监听器, 将Spring容器中的监听器注册到事件分发器容器对象中
            registerListeners();

            // 容器初始化最后一步: 注册容器生命周期回调 Lifecycle.
            // 事件发布
            finishRefresh();
         } catch (BeansException ex) {
           // ...
         } finally {
           // ...
         }
      }
   }
}
```

`initApplicationEventMulticaster()` 方法主要适用于初始化事件分发器。看下这个方法的源码：

```java
private ApplicationEventMulticaster applicationEventMulticaster;

public static final String APPLICATION_EVENT_MULTICASTER_BEAN_NAME = "applicationEventMulticaster";

protected void initApplicationEventMulticaster() {

   // 首先获取容器
   ConfigurableListableBeanFactory beanFactory = getBeanFactory();

   // 注意这个判断
   if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {

      this.applicationEventMulticaster =
            beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);

   } else {

      // 默认初始化的事件管理器
      this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
      beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
   }
}
```

在这个方法中有一个判断：判断容器中是否有一个名称叫做 `applicationEventMulticaster` 的 Bean。如果有就直接使用，如果没有就初始化一个 `SimpleApplicationEventMulticaster` 对象作为事件分发器。

这似乎是一个切入点，继续看下 `registerListeners()` 方法，这个方法是用于注册监听器使用的。看下这个方法的源码：

```java
private ApplicationEventMulticaster applicationEventMulticaster;

protected void registerListeners() {

   // 注意下面的 getApplicationEventMulticaster() 方法

   for (ApplicationListener<?> listener : getApplicationListeners()) {
      getApplicationEventMulticaster().addApplicationListener(listener);
   }

   String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
   for (String listenerBeanName : listenerBeanNames) {
      getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
   }

   Set<ApplicationEvent> earlyEventsToProcess = this.earlyApplicationEvents;
   this.earlyApplicationEvents = null;
   if (earlyEventsToProcess != null) {
      for (ApplicationEvent earlyEvent : earlyEventsToProcess) {
         getApplicationEventMulticaster().multicastEvent(earlyEvent);
      }
   }
}

ApplicationEventMulticaster getApplicationEventMulticaster() throws IllegalStateException {
   return this.applicationEventMulticaster;
}
```

具体逻辑先不管，但是我们很明显能看出一点的就是注册监听器与 `initApplicationEventMulticaster()` 方法中注册的事件分发器有关，因为在 `getApplicationEventMulticaster()` 方法中获取的事件分发器就是在上一步中注册的事件分发器。

而之后的 `finishRefresh()` 方法主要执行的业务就是发布事件，也就是与该类中的 `getApplicationEventMulticaster().multicastEvent(earlyEvent)` 逻辑相同。

而 `getApplicationEventMulticaster()` 获取的对象是不是就是第一步默认注册的 `SimpleApplicationEventMulticaster` 对象？那么我们就需要关注 `SimpleApplicationEventMulticaster` 类中的 `multicastEvent` 方法：

```java
public class SimpleApplicationEventMulticaster extends AbstractApplicationEventMulticaster {

	@Nullable
	private Executor taskExecutor;

	@Nullable
	private ErrorHandler errorHandler;

	public SimpleApplicationEventMulticaster() {
	}

	public SimpleApplicationEventMulticaster(BeanFactory beanFactory) {
		setBeanFactory(beanFactory);
	}

	public void setTaskExecutor(@Nullable Executor taskExecutor) {
		this.taskExecutor = taskExecutor;
	}

	@Nullable
	protected Executor getTaskExecutor() {
		return this.taskExecutor;
	}

	@Override
	public void multicastEvent(final ApplicationEvent event, @Nullable ResolvableType eventType) {
		ResolvableType type = (eventType != null ? eventType : resolveDefaultEventType(event));
		Executor executor = getTaskExecutor();
		for (ApplicationListener<?> listener : getApplicationListeners(event, type)) {
			if (executor != null) {
				executor.execute(() -> invokeListener(listener, event));
			}
			else {
				invokeListener(listener, event);
			}
		}
	}
}
```

上面是 `SimpleApplicationEventMulticaster` 简化后的源码，我们注意看下 `multicastEvent` 方法。来一起读一下该方法中的内容：

第一步调用 `resolveDefaultEventType` 方法进行解析事件的类型得到 `ResolvableType` 对象（这个不需要关心）。

第二步重点来了，执行 `getTaskExecutor()` 方法获取线程池。想一下，我们没有自定义过事件分发器。而这个事件分发器是 Spring 默认初始化的，在上面的源码中默认注册的事件管理器是直接调用构造方法初始化之后就直接赋值应用了：

```java
this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
```

从头到尾都没有去设置这个线程池，所以这个线程池值为 null。再来看下下面的 `Foreach` 循环，是不是循环监听器，之后去判断如果有线程池的话就直接使用线程池调用，如果没有就直接调用。

这里的线程池调用是不是就是异步执行？直接调用是不是就是同步执行？至于内部调用的 `invokeListener()` 方法我们一点都不需要关心，无非就是做一些判断之后回调事件监听器的 `onApplicationEvent` 方法。

好了，源头找到了。现在就来看到底该怎么进行配置吧~

### 定义异步事件监听器

在定义异步事件监听器之前我们还是需要关心一下 `initApplicationEventMulticaster()` 方法中的 `this.applicationEventMulticaster` 引用。因为最后赋值对象就是该引用，关心什么呢？当然是关心这个对象的类型！

类型定义如下：

```java
private ApplicationEventMulticaster applicationEventMulticaster;
```

`ApplicationEventMulticaster` 类是一个接口类 `org.springframework.context.event.ApplicationEventMulticaster` 。而我们需要定义一个该类型的事件分发器，之后你会发现 Spring 中对于该接口只定义了一个实现类 `SimpleApplicationEventMulticaster` 。这样，我们直接使用该类即可（当然你也可以自行扩展）。

定义一个配置类，在内部注册 `ApplicationEventMulticaster` 类型的 Bean。

:::info[一定要注意 Bean 的名称]
在注册事件分发器 `initApplicationEventMulticaster()` 方法中判断容器中是否有名称为 `applicationEventMulticaster` 的 Bean。

所以，在自定义事件分发器时定义的 Bean 的名称一定要是 `applicationEventMulticaster` 。
:::

好了，现在就定义一个配置类声明一个 Bean：

```java
@Configuration
@ComponentScan("io.gitee.ituknown")
public class Config {

	@Bean
	public SimpleApplicationEventMulticaster applicationEventMulticaster(BeanFactory beanFactory) {
		SimpleApplicationEventMulticaster eventMulticaster = new SimpleApplicationEventMulticaster();
		eventMulticaster.setBeanFactory(beanFactory);
		return eventMulticaster;
	}
}
```

这样就行了吗？似乎还不行。在想一下，想要异步执行是不是要保证 `getTaskExecutor()` 方法的返回值不能为 null：

```java
public class SimpleApplicationEventMulticaster extends AbstractApplicationEventMulticaster {

	@Nullable
	private Executor taskExecutor;

	@Nullable
	private ErrorHandler errorHandler;

	public SimpleApplicationEventMulticaster() {
	}

	public SimpleApplicationEventMulticaster(BeanFactory beanFactory) {
		setBeanFactory(beanFactory);
	}

	public void setTaskExecutor(@Nullable Executor taskExecutor) {
		this.taskExecutor = taskExecutor;
	}

	@Nullable
	protected Executor getTaskExecutor() {
		return this.taskExecutor;
	}
}
```

所以，我们还要调用 `setTaskExecutor()` 方法设置一个线程池：

```java
@Configuration
@ComponentScan("io.gitee.ituknown")
public class Config {

    private static int AVAILABLE_PROCESSORS;

    static {
        AVAILABLE_PROCESSORS = Runtime.getRuntime().availableProcessors();
    }

    @Bean
    public Executor executor() {
        ThreadPoolTaskExecutor taskExecutor = new ThreadPoolTaskExecutor();
        taskExecutor.setCorePoolSize(AVAILABLE_PROCESSORS);
        taskExecutor.setMaxPoolSize(AVAILABLE_PROCESSORS * 2);
        taskExecutor.setQueueCapacity(999);
        taskExecutor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        taskExecutor.setWaitForTasksToCompleteOnShutdown(true);
        // 线程名前缀, 注意这个线程名称
        taskExecutor.setThreadNamePrefix("async-task-thread-");
        // 一定要初始化线程池
        taskExecutor.initialize();
        return taskExecutor;
    }

    @Bean
    public SimpleApplicationEventMulticaster applicationEventMulticaster(BeanFactory beanFactory) {
        SimpleApplicationEventMulticaster eventMulticaster = new SimpleApplicationEventMulticaster();
        eventMulticaster.setBeanFactory(beanFactory);

        // 设置线程池
        eventMulticaster.setTaskExecutor(executor());
        return eventMulticaster;
    }
}
```

这样，异步监听器就配置完成了。现在再来执行以下方法：

```java
public static void main(String[] args) {

    AnnotationConfigApplicationContext applicationContext = new AnnotationConfigApplicationContext();
    applicationContext.register(Config.class);
    applicationContext.refresh();

    System.out.println("-----------------");
    OnlineApplicationEvent applicationEvent = new OnlineApplicationEvent(applicationContext, "抹茶大大");
    applicationContext.publishEvent(applicationEvent);
    System.out.println("-----------------");
}
```

执行结果如下：

```
-----------------
-----------------
async-task-thread-1线程通知事件: 抹茶大大上线了, 欢迎进入直播间~
Exception in thread "async-task-thread-1" java.lang.ArithmeticException: / by zero
	at io.gitee.ituknown.event.OnlineApplicationListener.onApplicationEvent(OnlineApplicationListener.java:18)
	at io.gitee.ituknown.event.OnlineApplicationListener.onApplicationEvent(OnlineApplicationListener.java:12)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.doInvokeListener(SimpleApplicationEventMulticaster.java:172)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.invokeListener(SimpleApplicationEventMulticaster.java:165)
	at org.springframework.context.event.SimpleApplicationEventMulticaster.lambda$multicastEvent$0(SimpleApplicationEventMulticaster.java:136)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)
```

通过打印结果是不是就能看出区别了？

两个 `-----------------` 都正常打印了，而且执行监听器的线程名是 `async-task-thread-1` 而不是之前的 `main` 线程。

到此，异步事件监听器就配置完成了。

## 观察者模式

Spring 中的事件监听器就是观察者模式的一种实现，这个在文章开始的时候也说过了。只不过，Spring 中的事件监听器将观察者模式又进进行了一步抽象，再穿插着 Spring 本身的源码来看，显得就特别不易懂。所以，在文章最后再说下观察者模式，以便理解 Spring 的事件监听器的实现原理。

观察者模式的特点是：被观察者持有观察者的引用。另一个特点是两个对象存在依赖关系，这种依赖关系是一堆多的，且当一个对象的状态发生改变时，所有依赖于它的对象都得到通知并被自动更新。

多说无意，直接看下实例代码（这个实例来自于[菜鸟教程](https://www.runoob.com/design-pattern/observer-pattern.html)，因为笔者觉得这个实例很简单易懂所以直接拷贝过来使用，并没有冒犯原作者的意思）。

观察者模式使用三个类 Subject、Observer 和 Client。Subject 对象带有绑定观察者到 Client 对象和从 Client 对象解绑观察者的方法。我们创建 *Subject* 类、*Observer* 抽象类和扩展了抽象类 *Observer* 的实体类。

创建 `Subject.java`

```java
import java.util.ArrayList;
import java.util.List;

public class Subject {

   private int state;
   private List<Observer> observers = new ArrayList<Observer>();

   public int getState() {
      return state;
   }

   public void setState(int state) {
      this.state = state;
      notifyAllObservers();
   }

   public void attach(Observer observer){
      observers.add(observer);
   }

   public void remove(Observer observer){
      observers.remove(observer);
   }

   public void notifyAllObservers(){
      for (Observer observer : observers) {
         observer.update();
      }
   }
}
```

这个类我们就可以理解为是被观察者，这个类有持有观察者的引用（ `observers` ），且被观察者还能管理观察者（能够增加和删除观察者）。最后，当被观察者状态改变时能够通知所有的观察者（ `notifyAllObservers` ）。

再来看下观察者 `Observer` :

```java
public abstract class Observer {
   protected Subject subject;
   public abstract void update();
}
```

观察者通常抖定义为抽象类或接口，因为观察者应该具有多种实现，这也就是多台的应用。看下具体三个实现：

$1.$ 二进制实现类

```java
public class BinaryObserver extends Observer{
   public BinaryObserver(Subject subject){
      this.subject = subject;
      this.subject.attach(this);
   }

   @Override
   public void update() {
      System.out.println( "Binary String: "
      + Integer.toBinaryString( subject.getState() ) );
   }
}
```

$2.$ 十进制实现类

```java
public class OctalObserver extends Observer{
   public OctalObserver(Subject subject){
      this.subject = subject;
      this.subject.attach(this);
   }

   @Override
   public void update() {
     System.out.println( "Octal String: "
     + Integer.toOctalString( subject.getState() ) );
   }
}
```

$3.$ 十六进制实现类

```java
public class HexObserver extends Observer{
   public HexObserver(Subject subject){
      this.subject = subject;
      this.subject.attach(this);
   }

   @Override
   public void update() {
      System.out.println( "Hex String: "
      + Integer.toHexString( subject.getState() ).toUpperCase() );
   }
}
```

现在，也应该能够理解观察者模式的特点了。这就有点类似广播的意思，当被观察者的状态改变时就通知该被观察者持有的所有观察者引用。

最后创建测试类：

```java
public class ObserverPatternDemo {
   public static void main(String[] args) {
      Subject subject = new Subject();

      new HexObserver(subject);
      new OctalObserver(subject);
      new BinaryObserver(subject);

      System.out.println("First state change: 15");
      subject.setState(15);
      System.out.println("Second state change: 10");
      subject.setState(10);
   }
}
```

打印结果为：

```
First state change: 15
Hex String: F
Octal String: 17
Binary String: 1111
Second state change: 10
Hex String: A
Octal String: 12
Binary String: 1010
```

这么看来观察者模式是不是就很简单了？这个实例理解之后那对于 Spring 的事件监听器是不是就想撒撒水一样简单了～
