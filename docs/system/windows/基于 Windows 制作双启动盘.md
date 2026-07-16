## 前言

平时开发呢，喜欢使用 Linux 环境。但是比较坑的一点是大多数日常办公软件都只提供 Windows/MacOS 系统的发行版，这就很难受了....

所以我就觉得还不如搞个双启动盘（dual boot）来的舒服，这样想用哪个环境只需要重启切换就好，感觉还算挺方便的（至于为什么不直接使用虚拟机，当然是虚拟环境操作不够丝滑了）。

所以本文就记录下，如何基于已有的 Windows 系统再制作 Linux 启动盘。

:::danger[特别强调]
如果想在同一台机器上制作 Linux/Windows 双启动盘（dual boot），那么第一个要安装的操作系统必须是 Windows！只有 Windows 安装完成之后才能继续安装 Linux，你不能先安装 Linux 再安装 Windows！

这是由于两个操作系统的启动流程特性决定的，但如果你要安装的是 Linux 双启动就没这个问题。有关这点可以阅读下 [《鸟哥的Linux私房菜：Linux启动流程分析》](http://cn.linux.vbird.org/linux_basic/0510osloader.php)
:::

## 为安装 Linux 预留磁盘空间

为了安装 Linux，我们首先要做的就是先为 Linux 准备一定的磁盘空间。

**1. 打开我的电脑（This PC），可以看到我当前只有一个磁盘，总空间的 225G：**

![this-pc.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/this-pc.png)

**2. 右键我的电脑点击管理（Manage），进入管理界面：**

![pc-manage](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/pc-manage.png)

**3. 之后点击磁盘管理（Disk Management）就能看到当前磁盘信息了：**

![win-disk-management](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/win-disk-management.png)

因为我只有一个磁盘，所以我就选择在这个 C 盘上进行压缩空间以便于安装 Linux。

**4. 右键 C 盘，点击压缩卷（Shrink Volume）：**

![win-choose-shrink-volume.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/win-choose-shrink-volume.png)

之后就会有个压缩卷的弹窗，显示总空间以及当前分配的空间：

![original-volume-space.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/original-volume-space.png)

**5. 因为 Windows 很少使用，所以我就保留 100000M 的空间给 Windows，剩下的全部用于 Linux 系统：**

![reallocated-volume-space.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/reallocated-volume-space.png)

**6. 压缩完成之后就能看到有近 100G 未分配的空间，这部分就是用于之后安装 Linux 使用的预留空间：**

![win-disk-after-reallocated.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/win-disk-after-reallocated.png)

## 安装Linux，分区管理

之后就是安装系统的流程（进入 bios 设置界面设置 U 盘启动等等），这里就不做额外介绍。

**这里唯一要注意的是，在设置磁盘分区步骤一定要选择手动（Manual）！！！！**

这里以 Debian 系统为例，下面是截图示例：

![init_partition_disk.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/init_partition_disk.png)

不过在某些发行版上，该步骤叫安装类型（Installation Type），在这类发行版上要选择 **Something else！**

![installation_type_something_else.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/installation_type_something_else.png)

之后就进入了分区信息界面，在这一步要选择 **FREE SPACE！** 注意看，该空间大小就是我们之前压缩出来的未分配的空间，目的就是留给 Linux 使用：

![manual_partition_choose_free_space.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/manual_partition_choose_free_space.png)

之后点击 Continue 就进入 **FREE SPACE** 的空间分配界面了，这里可以根据个人喜好选择定制化分区或直接使用自动分区，这里我为了方便就直接选择自动分区了（Automatically partition the free space）：

![automatically_partition_free_space.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/automatically_partition_free_space.png)

分区完成之后就继续正常安装即可！

## 关于启动问题

如果一切正常的话，在启动时就会进入启动选择界面：

* **Debian GNU/Linux：** 启动 Linux 系统。
* **Windows Boot Manager：** 启动 Windows 系统。

所以想要切换操作系统只需要在启动时选择即可，截图如下：

![gnu_grub_select_boot.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/gnu_grub_select_boot.png)

但是！在某些机器上是没有这个界面的，会直接进入 Windows 系统。这个与主板有关，所以如果你无法进入这个界面要先进入 bios 设置界面：

在 **Boot Option #1** 中可以看到首选项还是 Windows，并不存在 Debian 启动项：

![bios_boot_option1_win.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/bios_boot_option1_win.png)

所以我们要进入 **UEFI Hard Disk Drive BBS Priorities** 中进行设置：

![bios_boot_priorities.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/bios_boot_priorities.png)

只需要将 **Boot Options #1** 设置为 Debian，**Boot Options #2** 设置为 Windows 即可：

![bios_boot_priorities_options.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/bios_boot_priorities_options.png)

设置完成之后再看启动首选项，就会发现变成 debian 启动了：

![bios_boot_option1_debian.png](https://@media/windows-media/dual_boot/InstallLinuxAlongSideWindows10/bios_boot_option1_debian.png)

之后保存重启系统就可以进入操作系统选择界面了~

--

[http://cn.linux.vbird.org/linux_basic/0510osloader.php](http://cn.linux.vbird.org/linux_basic/0510osloader.php)

[https://linux.vbird.org/linux_basic/centos7/0510osloader.php](https://linux.vbird.org/linux_basic/centos7/0510osloader.php)

[https://www.youtube.com/c/Itsfoss/search?query=dual](https://www.youtube.com/c/Itsfoss/search?query=dual)

[https://www.youtube.com/watch?v=u5QyjHIYwTQ&t=51s](https://www.youtube.com/watch?v=u5QyjHIYwTQ&t=51s)

[https://www.youtube.com/watch?v=yIh37HQDF-w&t=613s](https://www.youtube.com/watch?v=yIh37HQDF-w&t=613s)
