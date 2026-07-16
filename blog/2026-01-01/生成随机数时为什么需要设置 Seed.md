---
slug: 生成随机数时为什么需要设置-Seed
title: 生成随机数时为什么需要设置 Seed
date: 2026-01-01T14:06
tags: [加密]
---

在计算机中，算法层面并不存在真正的随机数，凡是使用算法生成的随机数都是伪随机数（[Pseudo-Random Numbers, PRNG](https://en.wikipedia.org/wiki/Pseudorandom_number_generator)）。

在编程中用到的各种 random 库，都是通过算法进行一系列复杂的运算生成的序列。每次生成的结果其实都是可预测的，并不是真正的随机数。

<!-- truncate -->

真随机数（也被称为[硬件随机数](https://en.wikipedia.org/wiki/Hardware_random_number_generator)）是那种不依赖于任何逻辑算法，仅依赖于物理世界的不可预测性。计算机通过硬件捕捉真实环境中的熵（如热噪声、光电效应、放射性衰变等），转换得到的数字序列才是真随机数。各种编程语言提供的真随机数生成器（如 C++ 的 `std::random_device`），本质都是 CPU 提供的真随机数指令（如 Intel 的 RDRAND 指令）驱动硬件捕捉物理噪声源（电路上的电热噪声来产生熵）实现的。

算法生成伪随机数就是一次计算 $f(x)$ 值的过程，正态分布（[std::normal_distribution](https://cplusplus.com/reference/random/normal_distribution/)）、均匀离散分布（[std::uniform_int_distribution](https://cplusplus.com/reference/random/uniform_int_distribution/)）和伯努利分布（[std::binomial_distribution](https://cplusplus.com/reference/random/binomial_distribution/)）这些复杂的算法可能不懂，但是简单的还是能轻松拿捏的，比如二次函数：

$$
{\Large f(x) = ax^2 + b }
$$

你不要在意 $ax^2+b$，你需要将该函数想象为是一个正态分布函数，当输入 $x$ 通过该函数能计算出一个“随机数”。之后将该“随机数”继续执行 $f(x)$ 计算，又能得到一个新的“随机数”。然后无限套娃：

$$
{\LARGE f(} {\Large f(} f(x){\Large )} {\LARGE )}
$$

这就是通过算法（数学公式）生成伪随机数的基本原理，每次计算的结果都是一个随机数，每一个随机数又是下一个随机数的输入值（也就是 seed）。只不过为了保证数字平均分布，实现的数学公式计算过程更加复杂而已。

到这里也能看出使用算法生成的的特点：<u>只要初始值相同，后续计算出来的序列就完全相同，也就是说伪随机数具有可预测（可复现）性（其中初始值就是 random 库中的 seed，即种子）</u>。

实际在使用时，为了让计算的序列表现的像“真随机”一样，在设置 seed 时都很有讲究。因为<u>伪随机数算法本质就是确定性算法，所以想让结果不确定就需要尽可能的保证 seed 不容易被预测</u>。常见的做法是选择当前系统的毫秒级（或微秒级）时间作为随机数的 seed，有些程序可能会使用进程ID作为 seed。

<img src="https://@media/blog-media/PRNG/PRNG_f(x)_sketch.jpeg" width="95%" alt="PRNG_f(x)_sketch.jpeg" />

另外，伪随机数生成器的可复现性在游戏和科研领域特别重要。比如游戏中除了角色之外就是 NPC，而这个 NPC 就是通过伪随机数生成的。在玩游戏时你会发现，特定的关卡不管重开多少次，NPC 出现的时间、场景以及动作总是固定的。作为玩家，可以根据游戏场景出专属攻略。如果游戏出现 bug，作为开发者也可以通过相同的 seed 复现场景解决 bug。

<details open>
<summary>为什么有些 random 库不需要设置 seed？</summary>

比如 Python 获取随机数 `random.random()`，在没有设置 Seed 的情况下依然得到了不同的随机数，这是为什么？

这是因为标准库帮开发者处理了，它内部会自动使用当前系统时间（精确到微秒或纳秒）作为默认 Seed。这样每次运行程序的时间几乎不可能完全相同，看起来像是真正的随机。不过如果出现bug了，也无法复现运行结果~
</details>