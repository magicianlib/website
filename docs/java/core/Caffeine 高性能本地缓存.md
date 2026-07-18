## 前言

GitHub 仓库地址：https://github.com/ben-manes/caffeine

Maven 坐标：

```xml
<dependency>
   <groupId>com.github.ben-manes.caffeine</groupId>
   <artifactId>caffeine</artifactId>
   <version>${latest-version}</version>
</dependency>
```

Caffeine Cache 提供了三种缓存填充策略：手动、同步加载和异步加载。

## 缓存策略

### 手动加载

在每次查询缓存时指定一个同步函数，如果key不存在就调用这个函数生成一个值。

```java
Cache<Object, Object> cache = Caffeine.newBuilder().build();

// 如果缓存不存在，则执行指定方法生成 value
Object value = cache.get(key, new Function<Object, Object>() {
    @Override
    public Object apply(Object o) {
        // 生成 value
        return null;
    }
});

// 放入缓存
cache.put(key, value);

// 移除一个 key
cache.invalidate(key);

// 查询缓存数据，如果不存在则返回 null
Object value = cache.getIfPresent("");
```

### 同步加载

构造 Cache 时在 build 方法中传入一个 com.github.benmanes.caffeine.cache.CacheLoader 实现类。在 load 方法中通过 key 加载 value：

```java
LoadingCache<String, Object> cache = Caffeine.newBuilder()
        .build(new CacheLoader<String, Object>() {
            @Override
            public @Nullable Object load(@NonNull String key) throws Exception {
                // 加载 value
                return null;
            }
        });

// 刷新缓存
cache.refresh(key);
```

### 异步加载

异步加载缓存使用了响应式编程模型，内部使用Executor去调用方法并返回一个 CompletableFuture。

构造 Cache 时不再使用 build 方法，取而代之的是 buildAsync 方法。并传入一个 com.github.benmanes.caffeine.cache.AsyncCacheLoader 或 com.github.benmanes.caffeine.cache.CacheLoader 的实现类（CacheLoader 继承自 AsyncCacheLoader）。

不过这两个实现类并没什么区别，因为返回的对象都是 com.github.benmanes.caffeine.cache.AsyncLoadingCache。

示例：


```java
// 使用 com.github.benmanes.caffeine.cache.CacheLoader
AsyncLoadingCache<String, Object> cache = Caffeine.newBuilder()
        .buildAsync(new CacheLoader<String, Object>() {
            @Override
            public @Nullable Object load(@NonNull String key) throws Exception {
                // 加载 value
                return null;
            }
        });

// 使用 com.github.benmanes.caffeine.cache.AsyncCacheLoader
AsyncLoadingCache<String, Object> cache = Caffeine.newBuilder()
        .buildAsync(new AsyncCacheLoader<String, Object>() {
            @Override
            public @NonNull CompletableFuture<Object> asyncLoad(@NonNull String key, @NonNull Executor executor) {
                // 加载 value
                return null;
            }
        });
```


## 回收策略

Caffeine 提供了 3 种回收策略：基于大小回收，基于时间回收，基于引用回收。

基于大小的过期方式

基于大小的回收策略有两种方式：一种是基于缓存大小，一种是基于权重。

```java

// 根据大小进行驱逐
LoadingCache<String, Object> cache = Caffeine.newBuilder()
        .maximumSize(10000)
        .build(new CacheLoader<String, Object>() {
            @Override
            public @Nullable Object load(@NonNull String key) {
                // 加载 value
                return null;
            }
        });

// 根据权重来进行驱逐（权重只是用于确定缓存大小，不会用于决定该缓存是否被驱逐）
LoadingCache<String, Object> cache = Caffeine.newBuilder()
        .maximumWeight(10000)
        .weigher(new Weigher<String, Object>() {
            @Override
            public @NonNegative int weigh(@NonNull String key, @NonNull Object value) {
                // 设置缓存权重
                return 0;
            }
        }).build(new CacheLoader<String, Object>() {
            @Override
            public @Nullable Object load(@NonNull String key) {
                // 加载 value
                return null;
            }
        });
```

:::tip[NOTE]
maximumWeight 和 maximumSize 不可以同时使用
:::

```java
LoadingCache<String, Object> cache = Caffeine.newBuilder()
        .expireAfterWrite(2, TimeUnit.MINUTES)
        .expireAfterAccess(2, TimeUnit.MINUTES)
        .build(new CacheLoader<String, Object>() {
            @Override
            public @Nullable Object load(@NonNull String key) {
                // 加载 value
                return null;
            }
        });
```

expireAfterAccess：在最后一次访问或者写入后开始计时，在指定的时间后过期。假如一直有请求访问该 key，那么这个缓存将一直不会过期。

expireAfterWrite：在最后一次写入缓存后开始计时，在指定的时间后过期。

另外还有一个 expireAfter(Expiry) 自定义策略，过期时间由 Expiry 实现独自计算。


[https://www.cnblogs.com/rickiyang/p/11074158.html](https://www.cnblogs.com/rickiyang/p/11074158.html)