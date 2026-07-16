---
slug: Ventoy-U盘启动工具
title: Ventoy U盘启动工具
date: 2024-03-24T15:27
tags: [Ventoy, 软硬件]
---

## 前言

Ventoy 是一个开源的多功能 U 盘启动工具，用于创建可引导的 USB 驱动器。与以往的刻录工具不同（一个U盘只能制作一个系统），它可以在一个U盘上存储多个操作系统安装文件、Live CD 镜像和其他实用工具，而无需重复格式化驱动器或重新制作引导镜像。

<!-- truncate -->

**最重要的是使用起来特别简单。**

首先在官网（[https://www.ventoy.net/cn/download.html](https://www.ventoy.net/cn/download.html)）或者 GitHub 发布页（[https://github.com/ventoy/Ventoy/releases](https://github.com/ventoy/Ventoy/releases)）进行下载 Ventoy。

下载完成后并解压，进入文件夹后会看到类似如下的文件结构：

```
.
├── FOR_X64_ARM.txt
├── Ventoy2Disk.exe
├── VentoyPlugson.exe
├── VentoyVlnk.exe
├── altexe
│   ├── Ventoy2Disk_ARM.exe
│   ├── Ventoy2Disk_ARM64.exe
│   ├── Ventoy2Disk_X64.exe
│   └── VentoyPlugson_X64.exe
├── boot
├── plugin
└── ventoy
```

其中，我们需要使用的就是 Ventoy2Disk.exe，直接双击运行，选择具体的U盘，就可以将Ventoy安装在U盘上。具体可以参考官网文档：[https://www.ventoy.net/cn/doc_start.html](https://www.ventoy.net/cn/doc_start.html)。

:::tip[小提示]

默认的 Ventoy2Disk.exe 是32位x86程序，同时支持最常见的32位和64位Windows系统，绝大部分情况下使用它就可以。

从1.0.58版本开始，Ventoy还同时提供了 Ventoy2Disk_X64.exe、Ventoy2Disk_ARM.exe 和 Ventoy2Disk_ARM64.exe，可以根据需要使用。

这些文件位于安装包内的 altexe 目录下，使用时需要将其拷贝到上一层目录（与Ventoy2Disk.exe同级）。
:::


安装完成后，使用起来就特简单。只需要将系统镜像（或其他工具）直接拷贝到U盘就可以了：

![copy-iso-to-ventory.png](https://@media/blog-media/Ventoy/copy-iso-to-ventory.png)

之后其使用U盘启动时就会看到类似如下界面，选择某一个系统镜像即可：

![setup-select-images.png](https://@media/blog-media/Ventoy/setup-select-images.png)

**关于镜像超过4G的问题：**

在安装Ventoy时，默认会将U盘系统类型格式化为 exFAT，该格式支持直接拷贝4G大小镜像问题，所以这个问题理论上不存在。如果你发现无法拷贝，可能的原因就是系统格式选择了FAT32。这个时候你只需要重新打开 Ventoy2Disk.exe，在 “配置选项 — 分区设置” 中指定下分区格式重新安装即可：

![setting-file-system-format.png](https://@media/blog-media/Ventoy/setting-file-system-format.png)

## Verification failed: (0X1A) Security violation

在选择U盘启动时，如果遇到 “Verification failed: (0X1A) Security violation” 错误：https://forums.ventoy.net/showthread.php?tid=2280

出现这个问题的原因是 BIOS 打开了安全启动模式。有两种解决方案：

1、直接禁用安全模式即可

2、按照官网文档说明进行操作：https://www.ventoy.net/cn/doc_secure.html

## Normal 模式 or GRUB2 模式？

在安装时，需要选择一个安装模式：normal mode 或 grub2 mode。可能有点不知道该怎么选择，直接说答案：

1、只有在默认启动方式（Normal 模式）有问题的时候才需要用到 GRUB2 模式

2、GRUB2 模式只能用来启动含有 grub2 配置文件的 Linux 系统，不能启动 Windows/WinPE/Unix 等。

具体可以看下文档说明：[https://www.ventoy.net/cn/doc_grub2boot.html](https://www.ventoy.net/cn/doc_grub2boot.html)

## 关于镜像存放问题

我们通常将镜像放在U盘的根目录，因为有 Ventoy 的加持，我们可以正常的使用U盘（比如某种学习资料）。但是如果文件非常多的话，Ventoy 启动就会很慢（因为默认情况下，Ventoy 会遍历U盘中的所有目录及其子目录以找出所有支持的镜像文件。一般情况下U盘中的文件数目都不会很多，因此这个过程比较快，几乎感觉不到。但是如果你的U盘中有非常非常多文件的话，整个搜素过程就会很慢，就会卡很久才能进入启动菜单）。

一种简单的方式是，指定 Ventoy 扫描的具体目录！比如将上面示例中的镜像全部移动到 images 目录下：

```
.
├── deb
└── images
    ├── debian-11.9.0-amd64-DVD-1.iso
    ├── ubuntu-22.04.4-desktop-amd64.iso
    ├── ubuntu-22.04.4-live-server-amd64.iso
    ├── Win10_22H2_zh_CN_x64.iso
    └── Win10_22H2_en_US_x64.iso
```

之后双击 VentoyPlugson.exe，即可自动在网页上开发控制面板。之后再左侧菜单栏找到“全局控制插件”，并找到“指定搜索目录”。在设置中指定U盘中存放系统镜像的目录即可（必须是绝对路径）：

![ventoy-plugson_control-setting.png](https://@media/blog-media/Ventoy/ventoy-plugson_control-setting.png)

之后就会在U盘中根据路中自动创建一个 ventoy 文件夹，文件夹内的就是具体的配置内容。特别强调，不要手动修改！！！

具体可以参考官网文档：

https://www.ventoy.net/cn/doc_search_path.html

https://www.ventoy.net/cn/plugin_control.html
