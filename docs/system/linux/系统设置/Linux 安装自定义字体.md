## 前言

自抛弃 windows 拥抱 Linux 之后，起初有些不适应。因为在操作习惯上 windows 与 Linux 还是有很大的区别的。

不过使用 Linux 之后我发现一个很有意思的事情，windows 在业界诟病多年的事情字体渲染可以说是其中之一，不过在使用 Linux 之后我发现在 Linux 对字体渲染这块真的很赞。

今天呢，就说下在 Linux 中如何安装自定义字体。

在 windows 上安装自定义字体很简单，双击安装或者直接将字体（ `.ttf` ）文件直接拷贝至  `C:\Windows\Fonts` 目录下。当然 Linux 也是如此，至于为什么要写该文主要原因是 Linux 的目录结构与 windows 有些区别。当然，最最最重要的事情是使用 Linux 当然是要学习他的命令了～

## 安装自定义字体

在桌面环境这块，Debian/Ubuntu 系统可能是大多数 Linux 用户的首选，因为有着庞大的社区支持。至于 CentOS，百分之九十的用于都是用来最服务器使用。

在 Ubuntu 安装自定义字体最简单的方式就是双击安装或者右击菜单选择 `Open With Fonts` 了，不过今天使用命令行的方式。

字体就就选择 `JetBrains`  开源的 `Mono` 字体为例，可以直接进入官网：[https://www.jetbrains.com/lp/mono/](https://www.jetbrains.com/lp/mono/) 进行下载。

下载后进行解压：

![ExtractJetBrainsMonoFonts-16499894323N4hvsXu](https://media.ituknown.org/linux-media/KnowledgeNotes/CustomFonts/ExtractJetBrainsMonoFonts-16499894323N4hvsXu.png)

其实在官网已经进行了说明如何安装，只需要将解压的字体文件拷贝至 `~/.local/share/fonts`  目录或者  `/usr/share/fonts`  目录。其中前者是当前用户目录，后者是系统目录。系统目录意味着字体文件会对所有的系统用户生效，也是首选的安装方式。

不过，在安装字体笔者更喜欢将其归类。即将一个类型的字体库文件全部放置在一个文件夹下！

在 `/usr/share/fonts`  目录下创建新文件夹： `JetBrains` ：

```bash
$ cd /usr/share/fonts/
$ sudo mkdir JetBrains

# 或者

$ sudo mkdir -p /usr/share/fonts/JetBrains
```

接着将我们要安装的字体库文件全部拷贝到该目录下(当前个人下载字体放置在 `~Download/JetBrainsMono`  目录下 )：

```bash
$ ls ~/Downloads/JetBrainsMono/
JetBrainsMono-Bold-Italic.ttf       JetBrainsMono-ExtraBold.ttf      JetBrainsMono-Medium.ttf
JetBrainsMono-Bold.ttf              JetBrainsMono-Italic.ttf         JetBrainsMono-Regular.ttf
JetBrainsMono-ExtraBold-Italic.ttf  JetBrainsMono-Medium-Italic.ttf
```

现在将这些字体文件全部拷贝到新创建的 `JetBrains`  目录下：

```bash
$ sudo cp ~/DownloadJetBrains/JetBrainsMono* /usr/share/fonts/JetBrains/
```

:::info[注意]

将字体文件拷贝至 `/usr/share/fonts/JetBrains/` 目录之后通常情况下需要设置文件权限，即执行如下命令：

```bash
sudo chmod -R 744 /usr/share/fonts/JetBrains
```

表示当前用户有读写执行权限，该用户所属组及其他用户仅有读和执行权限（不过在大多数 Linux 发行版中是不需要设置）。

:::

现在还需要为其生成核心字体信息，防止 Linux 找不到 `mkfontscale` 、`mkfontdir`。进入 `/usr/share/fonts/JetBrains/` 目录执行如下命令：

```bash
$ sudo mkfontscale
$ sudo mkfontdir
```

现在，我们就可以发现在  `/usr/share/fonts/JetBrains/` 目录下生成了 `fonts.dir`  和 `fonts.scale`  文件： 

```bash
$ ls /usr/share/fonts/JetBrains/fonts*
fonts.dir  fonts.scale
```

最后，直接使用 `reboot`  重启机器命令或者直接执行如下命令使字体生效即可：

```bash
$ sudo fc-cache -fv
```

:::tip
`fc-cache`  命令是用于刷新系统字体缓存。
:::

:::info[注意]
上面的示例使用的是超级管理员（ `sudo` ）权限，如果你是普通用户切又无法获取超级管理员权限你又想使用自定义字体。

那么，你也可以直接在用户目录（ `~/.font` ）下安装该字体。该文件是个隐藏文件，如果没有需要自行创建：

```bash
mkdir -p ~/.fonts
```

之后的步骤与之前相同，将字体文件拷贝至该目录下即可！
:::

最后，安装完成后可以使用 Linux 系统查看字体的命令 `fc-list` 来验证字体文件是否安装成功：

```bash
$ fc-list | grep "JetBrains"
```

输出示例：

```
/usr/share/fonts/JetBrains/JetBrainsMono-Bold-Italic.ttf: JetBrains Mono:style=Bold Italic
/usr/share/fonts/JetBrains/JetBrainsMono-Medium-Italic.ttf: JetBrains Mono,JetBrains Mono Medium:style=Medium Italic,Italic
/usr/share/fonts/JetBrains/JetBrainsMono-ExtraBold.ttf: JetBrains Mono,JetBrains Mono ExtraBold:style=ExtraBold,Regular
/usr/share/fonts/JetBrains/JetBrainsMono-Italic.ttf: JetBrains Mono:style=Italic
/usr/share/fonts/JetBrains/JetBrainsMono-Medium.ttf: JetBrains Mono,JetBrains Mono Medium:style=Medium,Regular
/usr/share/fonts/JetBrains/JetBrainsMono-Regular.ttf: JetBrains Mono:style=Regular
/usr/share/fonts/JetBrains/JetBrainsMono-Bold.ttf: JetBrains Mono:style=Bold
/usr/share/fonts/JetBrains/JetBrainsMono-ExtraBold-Italic.ttf: JetBrains Mono,JetBrains Mono ExtraBold:style=ExtraBold Italic,Italic
```
