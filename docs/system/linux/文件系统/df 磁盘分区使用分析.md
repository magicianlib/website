## 前言

`df` 命令用于检查磁盘空间使用情况，该命令与文件系统挂在点（Mount Point）有关。

Linux 与 Windows 系统不同，它没有盘符的概念。在 Windows 中，想要查看磁盘的使用情况我们只需要打开我的电脑就能很清楚的看到各个盘符的总量以及使用情况。

但是在 Linux 中我们没法最直接实现这种效果，主要原因是 Linux 的文件系统都是挂在的概念，可以将任意一个可移动磁盘挂在到任意目录。

比如在安装操作系统的时候都会有一个分区选择环节（如下图），我们可以选择文件分区模式或者自定义分区，当安装完成后我们就可以看到 `/` 目录是挂在在 sda 设备上的。

![selected-for-partitioning-16549295524KRat6l1](https://@media/linux-media/Filesystem/df/selected-for-partitioning-16549295524KRat6l1.png)

而 `df` 命令其实就是用于观察系统对应的挂载点以及挂载点的使用情况。

## 命令说明

`df` 命令语法以及常用参数如下：

```bash
df [-a] [-h] [-B[GBK]] [-H] [-i] [-T] [-tTYPE...] [-xTYPE...] [目录或文件...]
```

参数说明：

```plaintext
-a   列出所有的文件系统，包括系统特有的 /proc 等文件系统
-h   以 GB、MB、KB 等格式显示大小
-B   以指定的单位输出文件系统, 如 -BM 以 MB 显示文件系统
-H   以 M=1000K 取代 M=1024K 的进位方式
-i   不用硬盘容量, 而以 inode 的数量来显示
-T   显示文件系统类型, 如 ext3

-t,--type=TYPE
    显示指定类型的文件系统, 如显示 ext4: -text4 或 --type=ext4

-x,--exclude-type=TYPE
    不显示指定的文件系统, 如不显示 ext4: -xext4 或 --exclude-type=ext4
```

`df` 命令在输出时主要有如下几栏数据：

```
Filesystem    [Type]    1K-blocks | Size    Used    Available    Use%    Mounted on
[--------]    [----]    [--------------]    [--]    [-------]    [--]    [--------]
    |            |             |              |         |          |          |
    |            |             |              |         |          |          +---------> 文件系统所挂载的目录
    |            |             |              |         |          +--------------------> 文件系统(存储设备)使用百分比
    |            |             |              |         +-------------------------------> 文件系统可用容量(默认单位为 KB)
    |            |             |              +-----------------------------------------> 文件系统已用容量(默认单位为 KB)
    |            |             +--------------------------------------------------------> 文件系统总容量, 默认单位为 k. 如果指定 -h 等参数会显示具体的单位
    |            +----------------------------------------------------------------------> 文件系统类型, 如 EXT4
    +-----------------------------------------------------------------------------------> 文件系统(通常成为挂载点或存储设备)
```

命令示例：

```bash
$ df
Filesystem     1K-blocks      Used Available Use% Mounted on
udev             8132404         0   8132404   0% /dev
tmpfs            1631068      1952   1629116   1% /run
/dev/sda1      228140460 170724020  45754772  79% /
tmpfs            8155336     77492   8077844   1% /dev/shm
tmpfs               5120         4      5116   1% /run/lock
/dev/loop1         66816     66816         0 100% /snap/gtk-common-themes/1519
/dev/sda2         523244      3484    519760   1% /boot/efi
/dev/loop2           128       128         0 100% /snap/bare/5
/dev/loop0         44672     44672         0 100% /snap/snapd/14978
/dev/loop3        168832    168832         0 100% /snap/gnome-3-28-1804/161
/dev/loop4         56960     56960         0 100% /snap/core18/2284
tmpfs            1631064       940   1630124   1% /run/user/1000
```

<details open>
<summary>**Filesystem**</summary>

其实就是我们的存储设备（也可以称为挂载点），比如系统的 `/` 目录就是挂载到 `/dev/sda1` 设备的。`sda1` 就是具体的存储设备，这个设备就相当于 Windwos 系统中的盘符。

有点区别是，在 Windows 系统中我们只要双击盘符就能进到。但是在 Linux 中不行（如下命令示例），我们必须将这个存储设备挂载到指定目录后才行使用，而进入这个设备的入口就是所挂载到的目录。

如果执行 `cd` 命令会看到如下结果：

```bash
$ cd /dev/sda1
bash: cd: /dev/sda1: Not a directory
```

所以现在我们就能很容易的理解 Linux 的文件系统了，Linux 中的系统目录其实就是一个进入存储设备的入口，而在这个存储设备中我们可以创建虚拟目录。比如 `/home` 目录并没有挂载到具体的设备（见上面的输出信息），它其实就是 `/` 目录下子虚拟目录。我们在 `/home` 目录存储的内容所使用的就是 `/` 目录挂载的存储设备的空间。

这样就有一个好处，因为 Linux 中的目录都是挂载的概念，所以当我们有一个新的硬盘时我们就可以将这个 `/home` 目录挂载到这个硬盘上。这样就能将 `/home` 从 `/` 中独立出来，之后再存储文件时所使用就是这个新的硬盘空间了，现在一看是不是觉得 Linux 文件系统设计的设备有哲学？

</details>

其他几个表头说明：

|**表头**|**释义**|
|:------|:--------|
|1K-blocks|文件系统大小，以 KB 容量进行输出。当我们执行 `-h` 或 `-B` 等参数时这个 `1K-blocks` 栏就会变成 `Size` 栏。|
|Used|当前使用的容量大小，单位同 `1K-blocks/Size` 一致|
|Available|当前可用的容量大小，单位同 `1K-blocks/Size` 一致|
|Use%|当前容量使用百分比|
|Mounted on|文件系统（设备）挂载到的具体目录|

### 列出所有文件系统

```bash
$ df
Filesystem     1K-blocks      Used Available Use% Mounted on
udev             8132404         0   8132404   0% /dev
tmpfs            1631068      1952   1629116   1% /run
/dev/sda1      228140460 170724020  45754772  79% /
tmpfs            8155336     77492   8077844   1% /dev/shm
tmpfs               5120         4      5116   1% /run/lock
/dev/loop1         66816     66816         0 100% /snap/gtk-common-themes/1519
/dev/sda2         523244      3484    519760   1% /boot/efi
/dev/loop2           128       128         0 100% /snap/bare/5
/dev/loop0         44672     44672         0 100% /snap/snapd/14978
/dev/loop3        168832    168832         0 100% /snap/gnome-3-28-1804/161
/dev/loop4         56960     56960         0 100% /snap/core18/2284
tmpfs            1631064       940   1630124   1% /run/user/1000
```

### 以友好的范围列出文件系统

```bash
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
udev            7.8G     0  7.8G   0% /dev
tmpfs           1.6G  2.0M  1.6G   1% /run
/dev/sda2       218G  163G   44G  79% /
tmpfs           7.8G   72M  7.8G   1% /dev/shm
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
/dev/loop1       66M   66M     0 100% /snap/gtk-common-themes/1519
/dev/sda1       511M  3.5M  508M   1% /boot/efi
/dev/loop2      128K  128K     0 100% /snap/bare/5
/dev/loop0       44M   44M     0 100% /snap/snapd/14978
/dev/loop3      165M  165M     0 100% /snap/gnome-3-28-1804/161
/dev/loop4       56M   56M     0 100% /snap/core18/2284
tmpfs           1.6G  940K  1.6G   1% /run/user/1000
```

注意看，当我们指定 `-h` 参数后输出的大小就由原来的 KB 变成 GB 了，更加可读了。

### 以指定的单位输出文件系统

比如以 MB 的单位输出：

```bash
$ df -BM
Filesystem     1M-blocks    Used Available Use% Mounted on
udev               7942M      0M     7942M   0% /dev
tmpfs              1593M      2M     1591M   1% /run
/dev/sda2        222794M 166723M    44683M  79% /
tmpfs              7965M     73M     7893M   1% /dev/shm
tmpfs                 5M      1M        5M   1% /run/lock
/dev/loop1           66M     66M        0M 100% /snap/gtk-common-themes/1519
/dev/sda1           511M      4M      508M   1% /boot/efi
/dev/loop2            1M      1M        0M 100% /snap/bare/5
/dev/loop0           44M     44M        0M 100% /snap/snapd/14978
/dev/loop3          165M    165M        0M 100% /snap/gnome-3-28-1804/161
/dev/loop4           56M     56M        0M 100% /snap/core18/2284
tmpfs              1593M      1M     1592M   1% /run/user/1000
```

### 显示文件系统 inode 使用容量

```bash
$ df -hi
Filesystem     Inodes IUsed IFree IUse% Mounted on
udev             2.0M   553  2.0M    1% /dev
tmpfs            2.0M  1.1K  2.0M    1% /run
/dev/sda2         14M  753K   14M    6% /
tmpfs            2.0M   197  2.0M    1% /dev/shm
tmpfs            2.0M     4  2.0M    1% /run/lock
/dev/loop1        64K   64K     0  100% /snap/gtk-common-themes/1519
/dev/sda1           0     0     0     - /boot/efi
/dev/loop2         29    29     0  100% /snap/bare/5
/dev/loop0        480   480     0  100% /snap/snapd/14978
/dev/loop3        28K   28K     0  100% /snap/gnome-3-28-1804/161
/dev/loop4        11K   11K     0  100% /snap/core18/2284
tmpfs            399K   167  399K    1% /run/user/1000
```

### 显示文件系统类型

```bash
$ df -T
Filesystem     Type     1K-blocks      Used Available Use% Mounted on
udev           devtmpfs   8132404         0   8132404   0% /dev
tmpfs          tmpfs      1631068      1952   1629116   1% /run
/dev/sda2      ext4     228140460 170724212  45754580  79% /
tmpfs          tmpfs      8155336     73768   8081568   1% /dev/shm
tmpfs          tmpfs         5120         4      5116   1% /run/lock
/dev/loop1     squashfs     66816     66816         0 100% /snap/gtk-common-themes/1519
/dev/sda1      vfat        523244      3484    519760   1% /boot/efi
/dev/loop2     squashfs       128       128         0 100% /snap/bare/5
/dev/loop0     squashfs     44672     44672         0 100% /snap/snapd/14978
/dev/loop3     squashfs    168832    168832         0 100% /snap/gnome-3-28-1804/161
/dev/loop4     squashfs     56960     56960         0 100% /snap/core18/2284
tmpfs          tmpfs      1631064       940   1630124   1% /run/user/1000
```

`-T` 参数会显示文件系统的类型，比如 sda1 是 vfat 文件类型，而 sd2 是 ext4 文件系统

### 显示指定类型的文件系统

只显示 ext4 和 vfat 文件系统：

```bash
$ df -text4 --type=vfat
/dev/sda2      228140460 170724308  45754484  79% /
/dev/sda1         523244      3484    519760   1% /boot/efi
```

### 不显示指定的文件系统

不显示 ext4 和 vfat 文件系统：

```bash
$ df -xext4 --exclude-type=vfat
Filesystem     1K-blocks   Used Available Use% Mounted on
udev             8132404      0   8132404   0% /dev
tmpfs            1631068   1952   1629116   1% /run
tmpfs            8155336  71404   8083932   1% /dev/shm
tmpfs               5120      4      5116   1% /run/lock
/dev/loop1         66816  66816         0 100% /snap/gtk-common-themes/1519
/dev/loop2           128    128         0 100% /snap/bare/5
/dev/loop0         44672  44672         0 100% /snap/snapd/14978
/dev/loop3        168832 168832         0 100% /snap/gnome-3-28-1804/161
/dev/loop4         56960  56960         0 100% /snap/core18/2284
tmpfs            1631064    940   1630124   1% /run/user/1000
```

### 显示指定目录或文件的文件系统

这个是我们最常用的，就是用于查看文件或目录所挂载的文件系统。比如查看 `/home` 和 `/` 所挂载的文件系统：

```bash
$ df -h /home/ /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2       218G  163G   44G  79% /
/dev/sda2       218G  163G   44G  79% /
```

从输出中可以看到， `/home` 目录也是挂载在 `/dev/sda2` 设备下的，因为 `/home` 是 `/` 的一个子虚拟目录。

## 资源链接

https://www.debian.org/releases/bullseye/amd64/ch06s03.en.html#di-partition

https://www.debian.org/releases/bullseye/amd64/apc.en.html
