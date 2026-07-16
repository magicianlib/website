---
slug: 分区表-GPT-vs-MBR
title: 分区表 GPT vs MBR
date: 2023-01-14T21:57
tags: [软硬件]
---

## 关于 GPT 和 MBR

在做磁盘分区时，经常会看到类似使用 GPT 分区还是 MBR 分区的提示，对电脑不熟悉的用户来说，并不清楚 GPT 和 MBR 是什么，区别是什么，更不知道如何选择。

<!-- truncate -->

**MBR分区：**

MBR是单词 master boot record 的缩写，通常被称为主引导记录或主引导扇区。

它的运行机制存在于硬件的基础之上，是存在于磁盘驱动器开始部分的一个特殊的启动扇区。这个扇区包含了已安装的操作系统的启动信息，并用来启动系统。如果你安装了Windows，其启动信息就放在这一段代码中。

如果MBR的信息损坏或被误删，就会导致不能正常启动Windows（比如启动蓝屏）。这个时候你就需要找一个引导修复软件工具来修复它就可以了。

而在 Linux 系统中MBR通常会是GRUB加载器（比如在安装 ubuntu 时，安装到最后一步时通常会询问是否安装 GURB 引导）。

当一台电脑启动时，它会先启动主板自带的BIOS系统，bios加载MBR，MBR再启动操作系统（Windows 或 Linux），这就是mbr的启动过程。

**GPT：**

GPT的意思是GUID Partition Table，即“全局唯一标识磁盘分区表”。他是另外一种更加先进新颖的磁盘组织方式，一种使用UEFI启动的磁盘组织方式。

最开始是为了更好的兼容性，后来因为其更大的内存支持（mbr分区最多支持2T的磁盘），更多的兼容而被广泛使用，特别是苹果的MAC系统全部使用gpt分区。

gtp不在有分区的概念，所有CDEF盘都在一段信息中存储。可以简单的理解为更先进但是使用不够广泛的技术。

不过因为兼容问题，gpt其实在引导的最开始部分也有一段mbr引导，也叫做“保护引导”，为了防止设备不支持 uefi。

**优缺点：**

1）MBR分区表最多只能识别2TB左右的空间，大于2TB的容量将无法识别从而导致硬盘空间浪费；GPT分区表理论上是没有上限的。

2）MBR分区表最多只能支持4个主分区或三个主分区+1个扩展分区(逻辑分区不限制)；GPT分区表在Windows系统下可以支持128个主分区。

3）在MBR中，分区表的大小是固定的；在GPT分区表头中可自定义分区数量的最大值，也就是说GPT分区表的大小不是固定的。

**该如何选择？**

建议一：如果你对电脑不太懂，那么建议你直接使用MBR，因为大多数电脑默认都是MBR bios启动，如果你选择了gpt那么你必须在bios下设置启动项，对于一个新人来说比较复杂，每家电脑的主板还有不同无疑增加了难度。

建议二：如果你的硬盘超过2T，那么你必须选择GPT+UEFI，2t以下就无所谓了。

建议三：分区类型与主板也有关系，如果你的电脑是传统的BIOS主板，那建议继续使用MBR分区模式，若是UEFI主板的话，则推荐使用GPT。

建议四：如果需要重装系统，在重装前要了解清楚所安装的系统版本是否支持MBR或者UEFI，这就是所谓的“兼容性”（比如 win11 已经不支持 MBR 了）。

最后：如果你对电脑比较精通，建议你直接淦gpt。毕竟gpt代表了未来，可以预见早晚uefi会会替代掉bios。

总结下来就是：BIOS主板 + MBR，UEFI主板 + GPT。

## 查看操作系统是uefi启动还是bios启动

### Windows 系统

使用快捷键 win+R 打开命令提示符，输入 `msinfo32` 并点击确认：

![msinfo32-1673242441xDDNU8SPCS.png](https://@media/blog-media/GPTvsMBR/msinfo32-1673242441xDDNU8SPCS.png)

然后在右侧找到 “BIOS模式” 行，查看其是 “传统” 还是 “UEFI”（传统表示的就是 BIOS）。

UEFI 示例：

![sysinfo-uefi-1673319414qK0cbuV5.png](https://@media/blog-media/GPTvsMBR/sysinfo-uefi-1673319414qK0cbuV5.png)

传统BIOS 示例：

![sysinfo-bios-1673242395plN1tppTTo.png](https://@media/blog-media/GPTvsMBR/sysinfo-bios-1673242395plN1tppTTo.png)

:::info[NOTE]
也可以直接在 Windows 搜索栏中输入“系统信息”快速打开。
:::

### Linux 系统

在直接 Terminal 中运行以下命令即可，查看系统是 BIOS 引导还是 UEFI 引导：

```bash
[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS
```

:::info[NOTE]
`-d` 判断目录是否存在，存在为真不存在为假。
:::

## 查看磁盘分区类型

### Windows 系统

使用快捷键 win+R 打开命令提示符，输入 `diskpart` 并点击确认来启动 diskpart 实用程序命令行工具：

![diskpart-16732558517qAstK6w.png](https://@media/blog-media/GPTvsMBR/diskpart-16732558517qAstK6w.png)

然后，在命令行中键入 `list disk` 命令，然后按 Enter：

![wincmd-list-disk-1673319250sP9z52y4.png](https://@media/blog-media/GPTvsMBR/wincmd-list-disk-1673319250sP9z52y4.png)

在上面的示例中，注意看“Gpt”列信息。如果有符号 `*` 则表示该行对应的磁盘使用的是 GPT 分区类型，否者就是 MBR。比如我这里有符号 `*` 就表示 GPT 分区类型。

### Linux 系统

查看所有磁盘分区类型：

```bash
$ sudo parted -l
Model: ATA MXPG2D80-240GH (scsi)
Disk /dev/sda: 240GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt                         ## 分区类型 GPT, 如果是 MBR 这里显示的就是 msdos 或 dos
Disk Flags:

Number  Start   End    Size   File system  Name                  Flags
 1      1049kB  538MB  537MB  fat32        EFI System Partition  boot, esp
 2      538MB   240GB  240GB  ext4
```

也可以查看指定磁盘的分区类型（以 /dev/sda 为例）：

```bash
$ sudo parted /dev/sda print
```

## 修改分区类型

### Windows 系统

使用快捷键 win+R 打开命令提示符，输入 `diskpart` 并点击确认来启动 diskpart 实用程序命令行工具：

![diskpart-16732558517qAstK6w.png](https://@media/blog-media/GPTvsMBR/diskpart-16732558517qAstK6w.png)

使用 `list disk` 命令确认下当前磁盘分区（比如我这里是 GPT）：

![wincmd-list-disk-1673319250sP9z52y4.png](https://@media/blog-media/GPTvsMBR/wincmd-list-disk-1673319250sP9z52y4.png)

想要修改磁盘分区只需使用 `convert` 命令修改为目标分区即可。

转换成 MBR 分区：

```bash
convert mbr
```

转换成 GPT 分区：

```bash
convert gpt
```

![win-convert-disktable-1673704205sR286tjh.png](https://@media/blog-media/GPTvsMBR/win-convert-disktable-1673704205sR286tjh.png)

因为演示，我这里就不去真正的执行了~

### Linux 系统

在 Linux 上，修改分区类型一般都使用 `parted` 命令。以 `/dev/sda` 为例：

```bash
$ sudo parted /dev/sda
GNU Parted 3.3
Using /dev/sda
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted)
```

如果不知道该怎么使用，可以通过输入 help 命令来获取帮助。

使用 `mktable` 命令将磁盘分区类型修改为 msdos：

```bash
(parted) mktable
New disk label type? msdos
Warning: The existing disk label on /dev/sda will be destroyed and all data on this disk will be lost. Do you want to continue?
Yes/No? yes
```

**特别说明：** 按照习惯来说MBR格式在 Linux 下通常称作dos，如果在“New disk label type?”后输入dos或者mbr会提示无效命令，这时候要用 `help mktable` 查看帮助信息来确认MBR分区在 parted 命令中具体的名称，示例：

```bash
(parted) help mktable
  mklabel,mktable LABEL-TYPE               create a new disklabel (partition table)

LABEL-TYPE is one of: aix, amiga, bsd, dvh, gpt, mac, msdos, pc98, sun, atari, loop
```
