在写 Rust 时经常会遇到一个容易让人迷惑的点，那就是<u>当变量转移所有权时 mut 扮演者什么角色</u>？

:::tip[Rust 对 mut 的解释是]
mut 关键字在函数参数中并不属于函数签名（Signature）的一部分，它属于模式匹配（Pattern Binding）的一部分。
:::

我对 mut 属于模式匹配的这一部分也没疑惑，对下面个代码时也没疑惑点。因为 greeting 获取到了 name 的所有权，所以可以对变量设置 mut 模式：

```rust
fn greeting(mut name: String) { // 获取所有权之后设置 mut 模式
    name.push('!');
    println!("Hi {name}");
}

fn main() {
    let name = "Bob".to_owned();
    greeting(name); // 转移所有权
}
```

不过当我初次写 Trait self 时，出现了疑问点。比如 Trait定义如下：

```rust
trait Handler {
    fn call(self);
}
```

方法签名明确定义了会发生所有权转移，那么当实现这个 Trait 时 `self` 能重写为 `mut self` 吗？

```rust
struct MyStruct;

impl Handler for MyStruct {
    // Trait 里没写 mut，这里可以写 mut 吗
    fn call(mut self) {
    }
}
```

:::danger[答案是可以的]

因为 `self` 的核心逻辑是：<u>所有权一旦转移，对象就完全属于你了</u>。

当定义 `fn call(self)` 时，只是告诉编译器：`call` 方法会获取 `self` 的所有权。至于进入函数体后，你是打算静静地看着它，还是打算修改它，那是实现（impl）时的事情。

在定义 Trait 时，具体是选择 `self` 还是 `mut self` 还是要看个人的代码规范，不过 `mut self` 在逻辑层面通常暗示内部涉及修改操作。
:::

## 为什么借用必须明确 `&self` 或 `&mut self`？

因为借用的核心逻辑是：<u>借用检查器（Borrow Checker）需要根据契约来执行安全检查</u>。

在借用场景下，`&` 和 `&mut` 代表了完全不同的内存布局和安全约束。这不仅仅是内部实现的问题，它直接决定了调用者能做什么：

$1.$ 命名规则：
  - `&self` 遵循“共享但不修改”规则。你可以同时有多个不可变借用。
  - `&mut self` 遵循“独占且修改”规则。在同一时间，只能有一个可变借用，且不能有其他任何借用。

$2.$ 调用者的约束：

如果 Trait 定义的是 `&mut self`，而调用者手里只有个不可变引用 `&T`，编译器会直接报错。编译器必须在编译阶段就知道这个方法是否会尝试修改数据，从而保护内存安全。

$3.$ `&mut self` 是类型系统的一部分：
  - `mut self` 中的 `mut` 是模式绑定：它影响的是变量名，而不是数据本身，它只在函数体这个局部范围内有效。
  - `&mut self` 中的 `mut` 是类型系统的一部分（这是最大的不同）：它的完整类型是 `&mut Self`。它是对内存地址的描述，规定了访问这块内存的权限级别。

（下面是一张使用 Nona Banana 生成的一张 Q 版卡通画）

![Trait_&self_vs_&mut_self.jpg](https://@media/rust-media/mut/Trait_%26self_vs_%26mut_self.jpg)