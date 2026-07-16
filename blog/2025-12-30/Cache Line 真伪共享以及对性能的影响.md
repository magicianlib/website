---
slug: Cache-Line-真伪共享以及对性能的影响
title: Cache Line 真伪共享以及对性能的影响
date: 2025-12-30T21:36
tags: [性能]
---

## 缓存行

在多核编程中，真共享（True Sharing）和伪共享（False Sharing）是影响并发性能的两个核心概念，它们都与 CPU 数据交换的最小单位——缓存行（Cache Line）密切相关。

<!-- truncate -->

CPU 从主内存（DRAM）读取数据（到 CPU 缓存）不是按单个字节或变量读取，而是以“块”为单位加载，这个块就是 Cache Line。Cache Line 大小主要由 CPU 架构决定， 现代主流（Intel/AMD 处理器）的 CPU 架构（x86_64/ARM64）多为 ‌64 字节（<u>所以接下来都以 64 字节为例说明</u>）。

当 CPU 需要从主内存读取数据时，它不会只读取单个字节或单个字（word），而是一次性读取 Cache Line 大小到 CPU 缓存中。这表示即使你只需要一个 4 字节的整数（int32），CPU 也会把其相邻的 60 字节一并加载到缓存中。

:::info[Note]
决定 Cache Line 大小的是 CPU 架构，不是操作系统（OS）位数，这两者没有任何关联关系。Cache Line 大小是硬件（CPU 缓存）固定的，OS 位数只影响地址空间和指针大小。

在 Linux 上可以使用下面的命令查看 Cache Line 大小：

```bash
getconf LEVEL1_DCACHE_LINESIZE
```

示例：

```bash
$ uname -a
Linux debian 6.1.0-41-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.158-1 (2025-11-09) x86_64 GNU/Linux

$ getconf LEVEL1_DCACHE_LINESIZE
64
```
:::

比如有如下结构体：

```rust
struct Data {
    a: i64, // 8 字节
    b: i64, // 8 字节
}
```

因为 CPU 每次读取一“行”数据（64 字节），编译器并不保证结构体中的字段在内存中连续性，但如果 a 和 b 在内存中是连续的（或距离很近），那么在读取 a 时，b 极大概率会被同时加载进 CPU Cache Line 中：

<img src="https://@media/blog-media/CpuCacheLine/CpuLoadCacheLine.png" width="80%" alt="CpuLoadCacheLine.png" />

一次将两个数据都加载到同一个 CPU Cache Line 中，这带来一个好处：当需要访问 b 时不需要再次访问主内存，减少了 CPU 缓存与主内存的数据交换频率，可提高性能。

但如果是在多线程情况下，可能就是性能杀手。由于 a 和 b 都在同一“行”，分别被加载到 CPU 的不同核心：

- 当核心 1 修改 a，由于缓存一致性协议（MESI），一个核心修改了该变量，必须通知其他核心将对应的缓存行失效
- 所以当其他核心读取 b 时，会发现该 Cache Line 已失效（即使 b 的值根本没变），就会重新从主内存中加载该“行”数据
- 反过来，当其他核心修改 b。由于缓存一致性（MESI），同样会导致核心 1 的 Cache Line 失效。如果后续核心 1 不需要访问 a 还好，一旦需要读写就需要重新从主内存中加载最新数据

在多线程场景下，这种频繁的 MESI 通信就是拖慢程序性能的罪魁祸首（如下图）

<img src="https://@media/blog-media/CpuCacheLine/CacheLineMESI.png" width="70%" alt="CacheLineMESI.png" />

这就是真伪共享的问题。

## 真共享

真共享是多个线程（核心）访问和修改同一个变量。

为了保证缓存一致性，缓存一致性协议（MESI 协议）会强制一个核心修改后，其他核心的缓存行失效，需要重新从内存或上级缓存加载。频繁的缓存同步，虽然逻辑上没错，但性能会大幅下降。

这是不可避免的，属于程序逻辑上的真实数据共享，只能通过减少共享或使用锁/无锁机制缓解。

## 伪共享

伪共享是多个线程（核心）访问不同的变量，但这些变量<u>恰好</u>位于同一个缓存行内。其中一个线程修改自己的变量，会导致整个缓存行在其他核心上失效（MESI 协议），即使其他线程访问的变量并未真正改变。

伪共享被称为“缓存行乒乓”（Cache Line Ping-Pong），会导致 CPU 性能大幅下降，甚至比单线程还慢。

## 如何解决伪共享

解决伪共享的核心思路是：空间换时间。也就是通过填充，让不同的变量位于不同的缓存行。

如下 Rust 结构体：

```rust
/// 存在伪共享
struct FalseSharing {
    a: AtomicU64, // 8byte
    b: AtomicU64, // 8byte
}
```

编译器虽然不保证属性 a 和 b 在内存中的连续性，但是当 CPU 加载 a 时，b 极大概率也会被加载到同一缓存行中（因为 $a + b$ 占用的总字节数只有 16，远远小于缓存行 64 字节）。

为了保证 a 和 b 不被加载到同一 Cache Line，通常的做法是在 a 之后填充（Padding）一下无意义的字节，使其独占一个缓存行，这样 b 如果被加载，也是在新的 Cache Line 中。

Rust 中最直接的方式是使用 `#[repr(align(64))]` 强制一个结构体或其中的字段按照 64 字节内存对齐：

```rust
/// 自动填充 64 字节，消除伪共享
#[repr(align(64))]
struct Aligned<T>(T);

struct TureSharing {
    a: Aligned<AtomicU64>,
    b: Aligned<AtomicU64>,
}
```

:::tip
如果需要编写具有平台移植性的代码，推荐使用 [crossbeam-utils](https://crates.io/crates/crossbeam-utils) 库提供的 `CachePadded<T>` 包装类，它会自动根据目标平台的特性增加填充（CachePadded 会自动判断是 64 字节还是 128 字节）。
:::

效果如下：

![CacheLineSharing.png](https://@media/blog-media/CpuCacheLine/CacheLineSharing.png)

<details>
<summary>一个不专业的 Rust 测试例子</summary>

硬件信息：

```
Microsoft Windows 10 Professional
13th Gen Intel(R) Core(TM) i7-13700KF
rustc 1.92.0 (ded5c06cf 2025-12-08)
```

输出结果：

```bash
$ RUSTFLAGS="-C target-cpu=native" cargo run --release

伪共享地址差: 0x6000037a51b0 vs 0x6000037a51b8 = 8 字节
伪共享 (False Sharing): 4.414882127s

对齐后地址差: 0x7f91448040c0 vs 0x7f9144804100 = 64字节
非伪共享 (No False Sharing): 502.600092ms
```

可以看到，性能夸张的提升了 88.62%：

$$
\frac{T_{4.414882127s} - T_{502.600092ms}}{T_{4.414882127s}} \times 100\% \approx  88.62\%
$$

当然这只是极端测试用例，不能代表真实业务场景。下面是用例代码：

```rust
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::Instant;

/// 存在伪共享
struct FalseSharing {
    a: AtomicU64,
    b: AtomicU64,
}

/// 使用对其消除伪共享
#[repr(align(64))]
struct Aligned<T>(T);

struct TureSharing {
    a: Aligned<AtomicU64>,
    b: Aligned<AtomicU64>,
}

fn run_benchmark<F>(name: &str, f: Arc<F>)
where
    F: Fn(usize) + Send + Sync + 'static,
{
    let start = Instant::now();
    let mut threads = Vec::new();
    for i in 0..2 {
        let func = Arc::clone(&f);
        threads.push(thread::spawn(move || {
            for _ in 0..100_000_000 {
                func(i);
            }
        }))
    }

    for t in threads {
        t.join().unwrap();
    }

    println!("{}: {:?}", name, start.elapsed());
}

fn main() {
    let fs = Arc::new(FalseSharing {
        a: AtomicU64::new(0),
        b: AtomicU64::new(0),
    });
    println!(
        "伪共享地址差: {:p} vs {:p} = {} 字节",
        &fs.a,
        &fs.b,
        (&fs.b as *const _ as usize) - (&fs.a as *const _ as usize)
    );

    run_benchmark(
        "伪共享 (False Sharing)",
        Arc::new(move |i| {
            if i == 0 {
                // 强制 CPU 执行更严格的缓存一致性同步，放大伪共享延迟
                fs.a.fetch_add(1, Ordering::SeqCst);
            } else {
                fs.b.fetch_add(1, Ordering::SeqCst);
            }
        }),
    );

    let ts = Arc::new(TureSharing {
        a: Aligned(AtomicU64::new(0)),
        b: Aligned(AtomicU64::new(0)),
    });
    println!(
        "\n对齐后地址差: {:p} vs {:p} = {}字节",
        &ts.a,
        &ts.b,
        (&ts.b as *const _ as usize) - (&ts.a as *const _ as usize)
    );

    run_benchmark(
        "非伪共享 (No False Sharing)",
        Arc::new(move |i| {
            if i == 0 {
                ts.a.0.fetch_add(1, Ordering::SeqCst);
            } else {
                ts.b.0.fetch_add(1, Ordering::SeqCst);
            }
        }),
    );
}
```

开启最激进的优化指令：

```toml title="Cargo.toml"
[profile.release]
opt-level = 3          # 确保是最高等级优化
lto = true             # 开启链接时优化 (Link Time Optimization)，跨模块优化
codegen-units = 1      # 限制并行编译单元，允许编译器进行更全局的优化
panic = 'abort'        # 去掉异常处理栈追踪，减小二进制体积并提速
```
</details>

:::danger[什么时候需要考虑伪共享问题？]
除非你的业务场景是「高并发写 + IO 性能已经到瓶颈 + CPU 占用很高」，才真正需要考虑 Cache Line 的伪共享问题。

最典型的就是高并发场景下的计数器（状态位）：

```rust
struct Stats {
    count_a: i64,
    count_b: i64,
}
```

如果只是些Web接口、DB查询、MQ通信、文件操作以及网络IO之类的业务，完全不需要考虑伪共享问题。对于这些业务，你需要优化的是IO延迟问题，Cache Line 再怎么抖，也不及IO延迟的万分之一。
:::