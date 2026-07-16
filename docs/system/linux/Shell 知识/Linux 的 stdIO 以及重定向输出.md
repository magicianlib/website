## 标准流

今天我们来聊聊 Linux 中的标准数据流：标准输入（stdin）、标准输出（stdout）和标准错误（stderr）。

我们都知道 Linux 内核是使用 C 语言编写，所以对于会 C 语言的玩家来说 Linux 中所谓的标准流不过如此，不是什么新鲜东西。所以 C 玩家请跳过 ~

在 wikipedia 上有对 standard io 的介绍（见文章最后的参考链接），其中有张图片对标准流做个很直接的概括，如下：

<img src="https://@media/linux-media/KnowledgeNotes/stdIO/stdIO-1649829063KYw06O.png" alt="stdIO-1649829063KYw06O.png" width="500px" />

标准流有三个来源，分别是键盘、程序和展示设备（通常是显示屏幕）。其中键盘输入的信息被称为标准输入流，程序在执行过程中会产生相应的输出流。程序或命令行正常执行时输出的信息被称为标准输出，程序或命令行在执行过程中产生错误（如指令不存在）时输出的信息被称为标准错误。

上面这张图对标准流做了很好的解释，从这张图中我们可以看到：

$1.$ 标准输入流产生的来源是键盘，并会被程序处理。另外，在 Linux 中万物皆文件。这里的标准流也不例外，对应为文件句柄是数字 0。所以在实际应用中我们会使用数字 0 表示标准输入流。

$2.$ 输出流是由执行程序产生，输出流有两种形态，分别是标准输出和标准错误。**注意一点：不管是标准输出还是标准错误，所产生的信息最终都会被输出到展示设备中**（通常是显示屏幕）。标准输出对应的文件句柄是数字 1，标准错误对应的文件句柄是数字 2。

如果对标准流还有什么不理解的，建议多想一下上面这张图描述的三种流之间的关系，同时多看几遍 wikipedia 上对 standard io 的介绍。

--

上面说了这些在实际中有什么用呢？别急，我们需要通过几个命令来加深下对标准流的认识。

我们在终端中输入如下名命令：

```bash
$ touch README
```

这条命令我们在 Linux 中是如何输入的？使用的是键盘，当我们点击回车键时该命令就会被程序处理。

那么程序收到的是这几个字符吗？记住，计算机只认识两个数字：0 和 1，由这两个数字组成的数据流我们通常称为二进制流。而程序收到的这个二进制就是输入流，也被称为标准输出，对应的文件句柄是数字 0。

现在我们再来执行一个命令：

```bash
$ echo "Hello World"
```

当我们这条命令执行后会在显示屏幕上输入几个字符：“Hello World”。将这几个字符输出到屏幕上的流就是输出流，那么这到底是标准输出流还是标准错误流呢？

我们可以继续在终端中执行如下命令：

```bash
$ echo $?
```

这个命令执行后，如果在屏幕上输出的是数值 0，就表示上面那条命令输出的流就是标准输出流，如果是其他数值就表示是标准错误流。

:::tip
上面的 `$?` 是 Linux 中的元字符，有兴趣的可以看下：[Linux 变量前导符 \$](./Linux%20变量前导符%20$.md)。
:::

那么什么样的流才能被称为标准错误呢？说直接点标准错误就是程序在执行过程中出了错误，并输出相应的信息。

再看下下面的示例命令：

```bash
$ echo $[1/0]
```

在这个示例中我们做了一个除法运算：1/0。想一下，0 能做被除数吗？不能，自然就是提示错误信息。上面的命令执行后会在显示设备上输出错误信息：

```bash
bash: 1/0: division by 0 (error token is "0")
```

这个输出的信息就是标准错误！！！！

不信？咱再执行下 `echo $?` 看输出什么：

```bash
$ echo $?
1
```

很显然，输出的不是 0。那么就是错误信息，所以上面这条除法命令执行后输出的流就是标准错误流！

现在我们就能很好的区分了标准输出流和标准错误流了，简单的说程序执行出了错误所输出的信息就是标准错误。

到此，相信你对标准输入流、标准输出流以及标准错误流有了基本的认识了。

趁热打铁，我们来理解下常见的输出流组合示例。

## 流的重定向问题

前面我们说了标准输出和标准错误，现在我们接着说有关这两个流的重定向问题（标准输输入重定向在实际中比较少，所以这里重点说明下输出流，如果对输出流的重定向熟悉了那么输入流自然而然的也就能够自己推导怎么玩了）。

在 Linux 系统中，标准输出流对应的文件句柄是1，标准错误对应的文件句柄是2。现在我们来深入了解下这两个流的应用。

我们先来编写一个简单的 Shell 脚本。文件名为 example.sh，Shell 内容如下：

```shell
#!/bin/bash

echo "Print Date TIme:"
date +"%Y-%m-%d %H:%M:%S"
echo $?

echo ""

echo "Run Unknown Command:"
unknown_command
echo $?
```

这个 Shell 的内容比较简单，就是打印一下当前时间和执行一个不存在的命令 unknown_command。注意看 Shell 脚本，我们在每条命令下面都使用了元字符 `$?` 用于检测命令执行状态。

前面我们说，如果程序或命令能够正常执行那么输出的内容对应的流就是标准输出（ `$?` 对应值为 0），如果执行异常那么就是标准错误（ `$?` 对应值不为 0）。

现在我们运行一下 Shell，看会在控制台输出什么：

```bash
$ sh example.sh
```

控制台中的输出内容如下：

```
Print Date TIme:
2021-10-26 21:21:39
0

Run Unknown Command:
example.sh: 10: unknown_command: not found
127
```

也就是说，在 Shell 脚本中的命令 unknown_command 输出的流是标准错误流，其他的都是标准输出流。

另外，在前面我们重点强调：**不管是标准错误还是标准输出最终都会输出到显示设备！** 所以上面 Shell 脚本中输出的内容最终都被展示到显示屏幕（或控制台），需要记住这一点，不然接下来的内容你可能会迷糊。

依然使用上面的 Shell 脚本，这回我们在控制台使用如下命令执行：

```bash
$ sh example.sh 1>print.log
```

咿？上面的 1 是什么？ `>` 符号又是什么？

这个 1 你应该知道才对，因为前面我们说在 Linux 中标准输出对应的文件句柄就是 1，所以这个 1 代表标准输出流。

而 `>` 符号有点门道，这个是输出流从定向的意思。除了 `>` 符号之外还有一个对应的 `>>` 符号，这个符号的意思是输出流追加的意思。既然有输出流重定向自然也有输入流重定向了： `<` 。

:::info[注意]
输入流没有追加符号 `<<` 。有关重定向问题这里不做过多说明，后面会有专门的章节介绍。
:::

言归正传，上面的命令我们可以分为两步解读。

第一步是执行 `sh example.sh` 命令，这个命令前面已经说了，最终会在显示设备上输出如下内容：

```
Print Date TIme:
2021-10-26 21:21:39
0

Run Unknown Command:
example.sh: 10: unknown_command: not found
127
```

而除了 Shell 中的 unknown_command 命令，其他命令输出的流都是标准输出。所以就有了第二步：

第二步：将 Shell 文件 example.sh 输出的结果中的标准输出流重定向到文件 print.log 中（print.log 不需要存在，Linux 会按需创建）。

因此，我们可以将这个命令输出的内容做如下区分。将标准输出流输出的内容重定向到 print.log 文件，标准错误流输出的内容不变，依然显示在控制台上！

现在我们看下输出结果：

```bash
$ sh example.sh 1>print.log
example.sh: 10: unknown_command: not found
```

当我们回车后会在显示终端上输出错误信息，这个是标准错误。对应的标准输出消失了，取而代之的是被输出到 print.log 文件中了：

```bash
$ cat print.log
Print Date TIme:
2021-10-26 21:43:14
0

Run Unknown Command:
127
```

现在相信你对输出流的重定向有更进一步的认识了。

下面是我使用 asciinema 工具录制的 Shell，可以看下：

[![](https://asciinema.org/a/444695.svg#id=LZfba&originHeight=823&originWidth=1417&originalType=binary&ratio=1&status=done&style=none)](https://asciinema.org/a/444695)

那现在，我想将标准错误重定向到 print.log 文件中该怎么办？那还不简单，标准错误对应的文件描述符句柄是 2，将之前命令中的 1 改成 2 不就结了：

```bash
$ sh example.sh 2>print.log
```

Prefect~

你以为这么简单就完了？我现在还有一个新想法！

我想将标准输出和标准错误都重定向到 print.log 又该怎么办？

聪明的小伙伴马上就想出来了：

```bash
$ sh example.sh 1>print.log 2>print.log
```

![toyoungtosimple-1649829220qI7j9i](https://@media/linux-media/KnowledgeNotes/stdIO/toyoungtosimple-1649829220qI7j9i.jpg)

当我们执行完该命令后，显示终端确实没有任何输出信息了（输出流都被我们重定向了），但是 print.log 文件中的内容：

```bash
$ cat print.log
example.sh: 10: unknown_command: not found
 Unknown Command:
127
```

这... 与我们想象的差别似乎有点大啊！

这个就不得不说重定向符号 `>` 的问题了，这个重定向符号的意思是覆盖追加。意思是说，如果文件中有内容的话会先全部擦除，然后再追加。

我们来理一下，上面的命令我们依然可以分三步操作：

第一步：执行 `sh example.sh` 命令，这个就不说了。
第二步：执行 `1>print.log` 标准输出流重定向，也没什么问题。
第二步：执行 `2>print.log` 标准错误流重定向，也没什么问题。

这三步分开看似乎都没问题，但是现在我们将第二步和第三步合起来就有问题了。该怎么说了，我们可以换一种说法，第二步和第三步都可以看做是一个线程（打个比方，实际不是的）。这两个线程同时操作 print.log 文件就会产生 “竞态”问题，所以我们会看到每次重新执行上面的命令后 print.log 文件中的内容都会不一样，原因就在这里！

有什么解决方法吗？有啊，使用输出流追加不就可以了吗？如下：

```bash
$ sh example.sh  1>>print.log 2>>print.log
```

看下输出内容：

```
Print Date TIme:
2021-10-26 22:11:40
0

Run Unknown Command:
example.sh: 10: unknown_command: not found
127
```

这能够达到我们的要求，但缺点也很明显...

现在我们有更好的方法去解决该问题：

## 输出流重定向：1>file 2>&1

既然标准输出和标准错误否能够被重定向，那我们能不能将标准错误重定向到标准输出或者将标准输出重定向到标准错误呢？

Good Idea~

我们将一个流重定向到另一个流简直太完美了，这也解决了前面的问题。那该怎么去重定向呢？

在 C 语言中有个 `&` 符号，意为取址的意思。即如下的 C 代码：

```c
int a = 10;
printf(&a);
```

这个 printf 函数输出的会是 10 吗？不是啊，而是变量 a 的对应的内存地址！

而 Linux 完美的继承了 C 的特性（毕竟 Linux 内核都是 C 编写的~），所以对于一个文件句柄我们同样可以使用 `&` 符号。

比如标准输出流的文件句柄的地址： `&1` ，标准错误的文件的句柄： `&2` 。

现在就能够解决上面的问题了，命令如下：

```bash
$ sh example.sh 1>print.log 2>&1
```

来解读下这个命令，看下这个命令可以分几步呢？

第一步：执行 `sh example.sh` 脚本，并输出对应的内容。
第二步：执行 `1>print.log` ，将第一步执行输出的标准输出流重定向到文件 print.log。
第三步：执行 `2>&1` ，将标准错误重定向输出到标准输出。注意，此时的标准输出已经被重定向到文件 print.log 中了。所以：标准错误最终也被重定向到文件 print.log！

来，一起看下 print.log 文件内容：

```
Print Date TIme:
2021-10-26 22:25:44
0

Run Unknown Command:
example.sh: 10: unknown_command: not found
127
```

这简直太完美了！

那现在我们将 2>&1 换到前面行吗？来看下：

## 输出流重定向：2>&1 1>file

命令如下：

```bash
$ sh example.sh 2>&1 1>file
```

先不看输出结果，我们先来分析一个这个命令会怎样执行：

第一步：执行 `sh example.sh` 脚本，并输出对应的内容。
第二步：执行 `2>&1` ，将标准错误重定向输出到标准输出。但是啊，标准输出的目的地是哪里？是展示设备啊！所以，标准错误会被输出到显示设备上！
第三步：执行 `1>print.log` ，将第一步执行输出的标准输出流重定向到文件 print.log。

所以我们可以得到结论：标准错误输出到显示终端，标准输出被重定向到 print.log 文件、

为了方便，这里我继续使用 asciinema 录制：

[![](https://asciinema.org/a/444705.svg#id=BbFe2&originHeight=823&originWidth=1417&originalType=binary&ratio=1&status=done&style=none)](https://asciinema.org/a/444705)

现在，相信对流的重定向有了彻底的认识了。

最后呢，我们再来说个在实际上经常使用的命令：

## 重新理解 1>/dev/null 2>&1 命令

如果你经常写 Shell 标本的话对这个命令一定不陌生。/dev/null 是 Linux 的空设备，可以理解为 Windows 的垃圾桶。反正就是所有的内容都将被丢弃不输出。

现在我们来看下这个命令的含义：

标准输出被重定向到空设备，所有的内容都将被丢弃。而标准错误又被重定向到标准输出，而标准输出已经被重定向到空设备了，所以最终标准错误的内容也将被丢弃！

另外，在实际应用中。在流的重定向符号 `>` 时，默认为标准输出流。所以这个命令的前面的标准输出文件句柄可以不写，即：

```bash
>/dev/null 2>&1
```

现在我们来使用前面的 Shell 验证下：

```bash
$ sh example.sh >/dev/null 2>&1

$ ls
example.sh
```

可以看到控制台没有任何输出，且也没产生任何新文件~

好了，关于 Linux 标准流就介绍这么多，这些已经足够我们日常使用了~

完结，撒花~

--

参考链接：

[https://en.wikipedia.org/wiki/Standard_streams](https://en.wikipedia.org/wiki/Standard_streams)

[https://stackoverflow.com/questions/10508843/what-is-dev-null-21](https://stackoverflow.com/questions/10508843/what-is-dev-null-21)

[https://www.digitalocean.com/community/tutorials/an-introduction-to-linux-i-o-redirection](https://www.digitalocean.com/community/tutorials/an-introduction-to-linux-i-o-redirection)
