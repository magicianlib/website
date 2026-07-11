## 前言

我们知道，Linux 系统中的每个进程（第一个进程除外）都有一个父进程，因此如果你将系统中的所有进程按层次梳理并展示的话你会发现 Linux 系统中的所有进程都是从一个点向外辐射，最终呈现出来的会是一个树形结构。

Linux 在任何时候都非常懂你，知道你有这样的需求，所以就为你提供一个 pstree 工具，可用于将系统中的所有进程以树状结构进行展示，展示的结果我们通常称之为进程树。

当我们在日常工作排查进程问题时，将进程显示在树结构中，你会发现排查起来就会变得特别容易。

这里就记录下 pstree 工具常用方式，下面是实验环境：

```
 Static hostname: vm
       Icon name: computer-vm
         Chassis: vm
      Machine ID: b3c1182cacf348919e4543c31f12c52f
         Boot ID: d79c9bb2baa64907ae2bb9aaf6c0f532
  Virtualization: vmware
Operating System: Debian GNU/Linux 10 (buster)
          Kernel: Linux 4.19.0-18-amd64
    Architecture: x86-64
```

## pstree 基本使用

pstree   语法如下：

```bash
$ pstree [option] [PID | USER]
```

具体参数可以使用 `man pstree` 或 `pstree --help` 命令查看，下面只介绍在日常中常用的命令！

** pstree 最简单最基本的用法就是直接使用不加任何参数**，如下：

```bash
$ pstree
```

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree.png" alt="pstree" height="300px"/>

它会列出默认的树形结构，另外你会看到某些进程有折叠的情况。如 ModemManager 进程并没有显示子进程树而是显示 `2*[{ModemManager}]` ，说明它还有 2 个子进程但默认被折叠了，等下会具体说明。

## 显示进程的命令参数

默认情况下，pstree 展示的进程树是不带进程的启动参数的，不过我们可以使用 `-a` 参数显示进程的启动参数：

```bash
$ pstree -a
```

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-a.png" alt="pstree-a" height="300px"/>

现在可以看到 pstree 命令输出树状结构时还额外显示一些进程的命令行选项。如 aria2c 进程，它在启动时额外指定了运行参数 `--conf-path=/opt/aria2/aria2.conf` 。

## 展示子进程树

还是以上面输出的进程树为例，ModemManager 进程还有 2 个子进程，但默认被隐藏了，我们可以使用 `-c` 参数强制显示所有的子进程树：

```bash
$ pstree -c
```

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-c.png" alt="pstree-c" height="300px"/>

现在就将所有的子进程显示出来了~

## 显示进程的 PID

上面演示的进程时显示的都只是干巴巴的进程命令，实际上并不利于我们排查问题，排查问题怎么能少的了 PID（进程号）呢？所以我们可以使用 `-p` 参数显示进程的 PID：

```bash
$ pstree -p
```

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-p.png" alt="pstree-p" height="300px"/>

现在你会发现进程树的每个进程都显示了进程的 PID，最显眼的 root 进程 systemd 的 PID 为 1，这是 Linux 系统的所有进程的祖宗！

## 高亮显示进程

Linux 系统进程这么多，直接使用 pstree 命令的话咋一看很难识别到自己想要的进程。比如我们在做进程排查时使用了 `ps` 命令查找到了某个进程的 PID，我想要看下这个进程在进程树中的层次怎么办呢？使用 `-H PID` 参数即可！

先使用 ps 命令查找 aria2 进程的 PID：

```bash
$ ps -ef | grep aria2
root        4740       1  0 09:58 ?        00:00:01 /usr/bin/aria2c --conf-path=/opt/aria2/aria2.conf
zlbr        5244    5135  0 13:33 pts/0    00:00:00 grep --color=auto aria2
```

得到 aria2 的 PID 后在进程树中使用 -H 参数来高亮显示我们的进程：

```bash
$ pstree -H 4740
```

:::info[NOTE]
`-H` 参数后面跟的是进程的 PID，不能省略！
:::

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-H.png" alt="pstree-H" height="300px"/>

## 只显示指定进程的进程树

上面输出的进程时显示的是系统的全部进程，只想显示指定进程的树怎么办？使用 `-s` 参数即可！

还是以前面查找的 aria2 进程 PID 4740 为例：

```bash
$ pstree -s 4740

systemd───aria2c # 输出
```

这回你会看到，直接使用 `-s` 输出的比较简单，想要更详细的输出我们可以额外增加前面介绍的参数，如 `-c` 、 `-a` 、 `-p` 等。

## 显示进程的线程名

pstree 显示的进程树默认是不显示线程名的，不过有时候线程名非常重要，因为大多时候排查问题通过看线程名叫什么就基本知道啥问题了。 pstree 显示进程的线程名使用 `-t` 参数，如下：

```bash
$ pstree -t
```

输出示例：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-t.png" alt="pstree-t" height="300px"/>

## 显示指定用户的进程树

还是老话，上面显示的是 Linux 系统所有的进程树。那只想要显示指定用户的进程树咋办？直接在 pstree 命令后面指定用户即可：

```bash
$ pstree $user_name
```

这里以 root 用户为例：

```bash
$ pstree root
```

输出结果：

<img src="https://media.ituknown.org/linux-media/SrvAndProcess/pstree/pstree-u-root.png" alt="pstree-u-root" height="300px"/>

--

[https://en.wikipedia.org/wiki/Pstree](https://en.wikipedia.org/wiki/Pstree)

[https://www.howtoforge.com/linux-pstree-command/](https://www.howtoforge.com/linux-pstree-command/)

[https://stackoverflow.com/questions/tagged/pstree](https://stackoverflow.com/questions/tagged/pstree)

[https://unix.stackexchange.com/questions/tagged/pstree](https://unix.stackexchange.com/questions/tagged/pstree)
