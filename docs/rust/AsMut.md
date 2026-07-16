## 前言

AsMut 属于类型转换 Trait，它的作用非常简单直接：针对可变类型 T，将内部属性对外暴露一下可变的借用（Mutable Borrow）。

:::tip
这里有个前提条件：类型 T 必须是可变的。

感觉是在说废话，因为想要获取某个类型 T 内部属性的可变借用，T 必须是 Mutable：

```rust
// t 必须是 mut
let mut t = T{ property: "hello world".to_owned() };
// 才能访问属性的可变借用
let property: &mut String = &mut t.property;
```
:::

标准库（rustc 1.92.0）定义如下：

```rust
pub const trait AsMut<T: PointeeSized>: PointeeSized {
    fn as_mut(&mut self) -> &mut T;
}
```

- `&mut self`：接受当前示例的可变引用
- `&mut T`：返回目标类型 T 的可变引用（T 通常是 self 的内部属性）

## impl AsMut

先来看一下 AsMut 如何使用，定义一个结构体：

```rust
struct DigitalImage {
    pixels: Vec<u32>,
    metadata: String,
}
```

如果我需要获取 metadata 的可变借用，就可以为该属性的类型实现一下 AsMut：

```rust
/// metadata 是 String 类型, 所以 T 就必须是 String 类型
impl AsMut<String> for DigitalImage {
    fn as_mut(&mut self) -> &mut String {
        // 返回属性的可变借用
        &mut self.metadata
    }
}
```

同样的，可以继续为 pixels 属性对外提供一个可变借用：

```rust
/// 这里 T 不应该是 Vec<u32> 吗？为什么是 [u32]
impl AsMut<[u32]> for DigitalImage {
    fn as_mut(&mut self) -> &mut [u32] {
        &mut self.pixels
    }
}
```

<details>
<summary>**为什么是 [u32]？**</summary>

这是因为 Rust 标准库已经为很多常用类型实现了 AsMut，其中：

- `[T]` 实现了 `AsMut<[T]>`
- `Vec<T>` 实现了 `AsMut<[T]>`
- `[T; n]` 实现了 `AsMut<[T]>`

所以，如果你的类型是 Slice、Vec 或者数组，只需要实现 `AsMut<[T]>` 即可~

:::danger[注意]
Option\<T> 没有直接实现 AsMut，但 Option 有一个内置的 `as_mut()` 方法。虽然不是 Trait 的实现，但逻辑相似。
:::

下图是标准库（rustc 1.92.0）中 AsMut 的所有实现：

![AsMutImpls.png](https://@media/rust-media/std/AsMut/AsMutImpls.png)
</details>

现在如果想获取属性的可变借用，只需要使用 `as_mut()` 方法即可：

```rust
let mut img = DigitalImage {
    pixels: vec![100; 10],
    metadata: String::from("hello"),
};

// 获取 metadata 的可变借用
let metadata: &mut String = img.as_mut();

// 获取 pixels 的可变借用
let pixels: &mut [u32] = img.as_mut();
```

怎么有种说不出的……鸡肋感？如果想要获取可变借用我直接使用下面方式不是更简单直接吗？何必多此一举呢？

```rust
let metadat = &mut img.metadata;
let pixels: &mut [u32] = &mut pixels[..];
```

别急，接下来才是正餐。

Trait 有两个作用：

- 第一个是 impl，给类型提供方法。
- 第二个则是类型（参数）约束。

## AsMut 约束

假设有如下业务方法，泛型 T 接受一个 u32 slice，内部逻辑是将元素归零处理：

```rust
fn zero_out<T>(container: &mut T)
where
    T: AsMut<[u32]>,
{
    for el in container.as_mut() {
        *el = 0;
    }
}
```

如果我想将 DigitalImage 中的属性 pixels 走一下这个流程该怎么做？

使用下面方式吗？

```rust
zero_out(&mut img.pixels)；
```

可以，不过还有更简单的方式：

```rust
zero_out(&mut img);
```

因为已经为 DigitalImage 实现了 `AsMut<[u32]>`，完美符合函数签名，所以可以直接将 DigitalImage 作为参数传入。

现在对 AsMut 是不是有了更清晰的认识了？如果没有继续写一个 struct，并实现 `AsMut<u32>`：

```rust
struct Array<const N: usize> {
    property: [u32; N], // 数组属性
}

impl<const N: usize> AsMut<[u32]> for Array<N> {
    fn as_mut(&mut self) -> &mut [u32] {
        &mut self.property
    }
}
```

该 struct 也实现了 `AsMut<u32>`，所以：

```rust
let mut array = Array::<5> {
    property: [1, 2, 3, 4, 5],
};

zero_out(&mut array); // 直接传入 array 即可
```

:::success[总结]
AsMut 最重要的作用是做类型约束，当做为类型约束使用时完全就是一个强大的“解耦”利器。它不需要管你的业务，你也不需要管它的数据结构。

有了这一利器，只要你的数据结构（类型）符合定义的 AsMut 约束，就可以抽离出通用的业务代码，告别恶心的 duplicated code 问题.
:::

## 扩展

### AsRef

AsMut 是可变版本，与之对应的还有不可变版本，那就是 AsRef：

```rust
pub const trait AsRef<T: PointeeSized>: PointeeSized {
    fn as_ref(&self) -> &T;
}
```

熟悉了 AsMut 之后，AsRef 就没有什么好说的了。