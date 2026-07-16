## 前言

对 Linux 系统来说，最重要的莫过于文件系统挂载了。我们的所有数据都是存储在磁盘中，而磁盘对 Linux 来说就是一个抽象的文件设备。

比如我们都经常会看到在 `/dev` 目录下会有类似 `sd*` 的文件（如下），这些文件其实就是 Linux 給我们抽象出来的的磁盘设备。

```bash
$ ls /dev/ | grep sd
sda
sda1
sda2
sda3
sdb
sdb1
sdb2
sdb3
```

这些抽象的文件我们是无法直接使用的。比如正常来说，既然 `sda` 是一块磁盘设备，那我我应该能够 `cd` 进入到该设备的，结果提示 `“Not a directory”` ：

```bash
$ cd /dev/sda
-bash: cd: /dev/sda: Not a directory
```

我们可以使用 `ls -l` 命令看下该文件类型：

```bash
$ ls -l /dev/sda
brw-rw---- 1 root disk 8, 0 Jun 25 10:00 /dev/sda
-
|
+--------------------------------> 标记为 block 块
```

现在，我们就可以看出来 Linux 的文件系统和 Windows 有很大的区别，正常来说 `/dev/sda` 就是 Windows 里面的盘符，但是却无法直接使用。

那既然都被抽象成为文件设备那么 Linux 又是如何使用这些磁盘的呢？这里就涉及到了 “文件系统挂载” 的东西了！

我们可以使用 `lsblk` 命令看下我当前的 Linux 系统与磁盘设备是如何挂载的：

```bash
$ sudo lsblk -lp

NAME       MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
/dev/sda     8:0    0 223.6G  0 disk
/dev/sda1    8:1    0   512M  0 part /boot/efi
/dev/sda2    8:2    0 222.1G  0 part /
/dev/sda3    8:3    0   976M  0 part [SWAP]
/dev/sdb     8:16   0 931.5G  0 disk
/dev/sdb1    8:17   0    20G  0 part
...
```

现在可以很清晰的可以看到 Linux 的根目录 `/` 是挂载到 `/dev/sda2` 磁盘分区的，并且除了 `/boot/efi` 外没有其他任何目录再挂载磁盘设备。而 `/` 是所有目录的根目录，也就是说，其实我们的所有文件都是存储在 `/dev/sda2` 磁盘分区的。

之所以会这样是因为我在安装系统时在分区这一步我选择了 `“All files in one partition”` ，每个人在这一步可能都会选择不同的分区模式所以可能都有些不一样。

![selected-for-partitioning-1656123276fzofeK](https://@media/linux-media/Filesystem/mount/selected-for-partitioning-1656123276fzofeK.png)

那么现在来想一下，Linux 系统为什么要这么设计？这么设计有什么好处吗？

我们可以想一个问题，因为 Linux 文件系统都是挂载的概念，我们是不是可以将磁盘设备与任何一个系统目录进行挂载呢？比如说当前 Linux 的根目录 `/` 是挂载到 `/dev/sda2` 分区的，那么我现在是不是可以将 `/home` 目录挂载到 `/dev/sdb1` 分区上。这样似乎就达到了将 `/home` 目录与 `/` 目录分离的效果，并且完全使用了两块不同的磁盘设备（如下）。

```
/dev/sda2    8:18   0 222.1G  0 part /
/dev/sdb1    8:1    0   200G  0 part /home
```

事实上确实如此，而这就是文件挂载的终极意义，并且对于目前的 Windows 系统来说，完全无法实现这种效果。

那么现在知道了文件系统挂载 “为什么” 就可以来看下如何实现挂载了，在 Linux 中实现文件系统挂载可以使用到 `mount` 命令和 `/etc/fstab` 文件。

现在来分区介绍：

## mount 命令语法

`mount` 命令用于动态的文件挂载，随时用随时挂载。优点是简单快捷，而缺点就是当系统重启后挂载就失效了🤣~

来看下 `mount` 命令的主要语法：

```bash
mount [options] <source> <directory>
```

`mount` 命令所表示的含义就是将 `<source>` 挂载到 `<directory>` ，我们可以理解为 `<directory>` 就是进入 `<source>` 的入口。

来看下 `<source>` 可以有哪些：

```bash
LABEL=<label>           文件设备的 LABEL

UUID=<uuid>             文件设备的 UUID

PARTLABEL=<label>       文件设备的 PARTLABEL

PARTUUID=<uuid>         文件设备的 PARTUUID

<device>                设备(如 /dev/sda1)

-L,--label <label>      同 LABEL=<label>
-U,--uuid <uuid>        同 UUID=<uuid>
```

`<device>` 很好理解，关键的是 `LABEL` 、 `UUID` 这些是什么？

其实 `UUID` 、 `LABEL` 等就是磁盘文件设备的一些属性数据（可以参考下 [磁盘分区管理](磁盘分区管理.md)），我们可以使用 `blkid` 命令查看：

```bash
$ sudo blkid

/dev/sdb1: UUID="ffb03157-d8d9-4c3e-b76f-21a1ff5cbece" BLOCK_SIZE="4096" TYPE="ext4" PARTLABEL="Linux filesystem" PARTUUID="8806aed9-986e-4877-a768-507ffbbbe703"
...
/dev/sda1: UUID="D8C7-8235" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="8591882f-1b8b-44ed-a33b-f539f356e802"
/dev/sda2: UUID="042055c6-546b-4889-8d3f-3b7aec794412" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="016e491b-23c1-45f0-99a4-7a6d440e1aac"
/dev/sda3: UUID="660f3d0e-0a77-4d60-8532-b867c3a9e0d8" TYPE="swap" PARTUUID="35cd0ea7-73db-463e-aad9-136e916b01c9"
...
```

可以看到，当我们使用 `blkid` 命令查看磁盘分区表时就会显示分区表对应的 UUID、LABEL、PARTUUID 以及 PARTLABEL。在实际中根据自己喜好选择，个人更喜欢使用分区表的 `PARTUUID` 。

再来看下常用的 `[options]` 有哪些：

```bash
Options:

 -a, --all               依照配置文件 /etc/fstab 的数据将所有未挂载的磁盘全部都挂载起来

 -l, --show-labels       单纯的输入 mount 命令会显示当前挂载的信息, 加上该参数可增加显示 LABEL 名称

 -n, --no-mtab           在默认情况下, 系统会将实际挂载的情况即时写入到 /etc/mtab 文件中, 以便于其他程序运行.
                         加上该参数可以指定禁止写入

 -t, --types <list>      指定要挂载的文件系统类型, 如 EXT3、EXT4

 -o, --options <list>    用于增加一些额外参数, 如挂载点读写权限、账号密码等. 如果指定多个权限需要使用 , 做分隔

 -w, --rw, --read-write  以读写的形式挂载文件系统(默认, 与 -o rw 等效)
 -r, --read-only         以只读的形式挂载文件系统(与 -o ro)

 -v, --verbose           显示执行信息
```

`[options]` 里面最重要的就是 `-o` 选项了，来看下 `-o` 选项主要有哪些：

```bash
-o 额外参数如下:

  async,sync          所有的 I/O 读写=操作都以异步方式执行(默认 async)

  atime,noatime       是否修改文件的读取时间, 默认 atime
  diratime,nodiratime 同 atime/noatime, 只不过该参数针对的是目录

  ro                  以只读的方式挂载文件系统(不能执行写操作)
  rw                  以读写的方式挂载文件系统

  nouser              不允许任何用户对此文件系统执行 mount, 默认只有 root 有权限
  users               允许任何用户对此文件系统执行 mount

  exec,noexec         是否允许执行文件系统上的二进制文件

  dev,nodev           是否允许在此文件系统上建立设备文件

  auto,noauto         是否允许此文件系统被 mount -a 自动挂载

  remount             重新挂载文件系统, 更新挂载参数或系统出错时可以使用该参数

  defaults            默认值为: rw,suid,dev,exec,auto,nouser,async
```

## mount 使用实例

只看 `mount` 语法是没用的，重要的还是要练习，毕竟熟能生巧嘛~

在我当前的文件系统中有一块 `/dev/sdb` 设备，该设备下只有一个分区并且都没有做过挂载：

```bash
$ sudo lsblk -lp /dev/sdb
NAME      MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
/dev/sdb    8:16   0 931.5G  0 disk
/dev/sdb1   8:17   0    20G  0 part
```

可以看到 `/dev/sdb1` 分区大小为 20G，现在我们就来演示下各种挂载操作：

### 以只读的方式挂载文件系统：ro

我现在将该分区以 **只读** 的方式挂载到我当前用户目录下的 `Volume` 文件夹上：

```bash
$ sudo mount -o ro /dev/sdb1 ~/Volume
```

现在再来看下磁盘挂载情况：

```bash
$ sudo lsblk -lp

NAME       MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
/dev/sda     8:0    0 223.6G  0 disk
/dev/sda1    8:1    0   512M  0 part /boot/efi
/dev/sda2    8:2    0 222.1G  0 part /
/dev/sda3    8:3    0   976M  0 part [SWAP]
/dev/sdb     8:16   0 931.5G  0 disk
/dev/sdb1    8:17   0    20G  0 part /home/ituknown/Volume
...
```

可以看到，现在 `/home/ituknown/Volume` 目录从原来的根目录 `/` 下面独立出来了。现在目录 `~/Volume` 就与 `/dev/sda2` 磁盘分区没有任何关系了。

如果我们使用 `df` 命令看起来就更加的明显了：

```bash
$ df -h

Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2       218G  197G   11G  95% /
/dev/sda1       511M  3.5M  508M   1% /boot/efi
/dev/sdb1        20G   24K   19G   1% /home/ituknown/Volume
...
```

### 重新挂载文件系统：remount

现在如果如果向 `~/Volume` 目录中写入一些数据会怎样？来看下：

```bash
$ echo "hello" > ~/Volume/hello.txt
-bash: /home/ituknown/Volume/hello.txt: Read-only file system
```

结果提示 `~/Volume` 是个只读的文件系统，原因是因为我们在挂载时指定了以只读（ `ro` ）的方式挂载该文件系统。那现在该怎么办呢？

有两种方式：

1：取消挂载后再以读写的方式重新挂载
2：直接使用 `remount` 修改下挂载参数

怎么看都是使用 `remount` 比较方便不是？现在来将之前的只读修改为读写：

```bash
$ sudo mount -o remount,rw ~/Volume
# 或
$ sudo mount -o remount,rw /dev/sdb1
```

现在再来看下能不能写入文件：

```bash
$ echo "hello" > ~/Volume/hello.txt

$ cat ~/Volume/hello.txt
hello
```

现在就一切正常了~

### 取消挂载 umount

既然能够挂载肯定就能够取消挂载，如果想要取消挂载可以使用 `umount` 命令，取消挂载的主要语法如下：

```bash
umount {directory|device}
```

`directory` 指的就是我们的挂载的具体目录，而 `device` 则是具体的设备。

以上面的 `/dev/sdb1` 为例，如果想要取消挂载可以使用下面的两种形式：

```bash
$ sudo umount /dev/sdb1
# 或
$ sudo umount ~/Volume
```

### 以读写的方式挂载文件系统：rw

前面我们是以只读的形式挂载，其实在挂载时默认情况下会以读写的方式进行挂载。也就是说如果想要读写权限使用下面的任意一种形式挂载即可：

```bash
$ sudo mount /dev/sdb1 ~/Volume
# 或
$ sudo mount -o rw /dev/sdb1 ~/Volume
```

### 指定设备 source 进行挂载

上面我们都是以具体的设备来进行挂载的，在最开始的时候也说了， `<source>` 其实可以是设备的 `UUID` 、 `LABEL` 甚至是具体的目录，而在实际使用中我更推荐使用 `UUID` 。

我们先使用 `blkid` 看下设备的属性信息：

```bash
$ sudo blkid

/dev/sdb1: UUID="ffb03157-d8d9-4c3e-b76f-21a1ff5cbece" BLOCK_SIZE="4096" TYPE="ext4" PARTLABEL="Linux filesystem" PARTUUID="8806aed9-986e-4877-a768-507ffbbbe703"
...
/dev/sda1: UUID="D8C7-8235" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="8591882f-1b8b-44ed-a33b-f539f356e802"
/dev/sda2: UUID="042055c6-546b-4889-8d3f-3b7aec794412" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="016e491b-23c1-45f0-99a4-7a6d440e1aac"
/dev/sda3: UUID="660f3d0e-0a77-4d60-8532-b867c3a9e0d8" TYPE="swap" PARTUUID="35cd0ea7-73db-463e-aad9-136e916b01c9"
....
```

可以看到我们的 `/dev/sdb1` 有 UUID、PARTUUID，现在我们可以使用这两个属性来完成与之前一样等效的挂载：

```bash
$ sudo mount UUID="ffb03157-d8d9-4c3e-b76f-21a1ff5cbece" ~/Volume
# 或
$ sudo mount PARTUUID="8806aed9-986e-4877-a768-507ffbbbe703" ~/Volume
```

怎么样，看起来是不是很简单？

## 启动挂载 /etc/fstab

`mount` 命令用起来虽然很简单，但是当系统重启后使用 `mount` 命令挂载的文件系统就自动失效了。

如果每次在系统重启都要重新执行一遍挂载会不会很麻烦？有没有办法解决这个问题呢？

当然可以了，将需要挂载的设备信息写到 `/etc/fstab` 文件即可。这样系统重启时就会自动读取 `/etc/fstab` 中配置并自动执行挂载了~

先来看下 `/etc/fstab` 配置文件数据格式：

```
<file system>  <mount point>  <type>  <options>  <dump>  <pass>
[-----------]  [-----------]  [----]  [-------]  [----]  [----]
     |               |          |         |         |       |
     |               |          |         |         |       +------------> 是否以 fsck 检查扇区
     |               |          |         |         +--------------------> 是否被 dump 备份命令作用
     |               |          |         +------------------------------> 挂载参数, 如 ro、rw、defaults
     |               |          +----------------------------------------> 文件系统类型, 如 ext4
     |               +---------------------------------------------------> 挂载点, 即文件系统目录
     +-------------------------------------------------------------------> 磁盘设备文件名/UUID/LABEL
```

上面的信息一目了然就不需要介绍了，唯一要说的可能就是 `<dump>` 和 `<pass>` 了：

`dump` 是一个用于数据备份的命令，话说现在备份的方案有这么多，还需要继续使用 `dump` 命令？需要吗？不需要吗？（不需要请填 0）。

`<pass>` 表示的是是否使用 `fsck` 检查扇区，这个根据自己需要填写即可，不需要给填 0 就好~

好了，现在想知道的信息都知道了，那就来进行挂载吧！

先看下设备信息：

```bash
$ sudo blkid

/dev/sda1: UUID="D8C7-8235" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="8591882f-1b8b-44ed-a33b-f539f356e802"
/dev/sda2: UUID="042055c6-546b-4889-8d3f-3b7aec794412" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="016e491b-23c1-45f0-99a4-7a6d440e1aac"
/dev/sda3: UUID="660f3d0e-0a77-4d60-8532-b867c3a9e0d8" TYPE="swap" PARTUUID="35cd0ea7-73db-463e-aad9-136e916b01c9"
...
/dev/sdb1: UUID="ad4fbc0e-5281-4400-86c3-742a9395e5b1" BLOCK_SIZE="4096" TYPE="ext4" PARTLABEL="Linux filesystem" PARTUUID="c50f5d15-4336-4b2e-84d1-ea10aff6dd82"
/dev/sdb2: UUID="89B3-A6C0" BLOCK_SIZE="512" TYPE="vfat" PARTLABEL="Linux filesystem" PARTUUID="a607c2b5-5cf5-411a-87fb-ec8a9a8d9212"

....
```

我们需要将 `/dev/sdb1` 挂载到 `ituknown` 用户下的 `Volume1` 目录，将 `/dev/sdb2` 挂载到 `ituknown` 用户下的 `Volume2` 目录。

只需要将下面的内容添加到 `/etc/fstab` 配置文件中即可：

```bash
# 使用设备UUID
UUID="ad4fbc0e-5281-4400-86c3-742a9395e5b1" /home/ituknown/Volume1 ext4 defaults 0 0

# 使用设备地址
/dev/sdb2 /home/ituknown/Volume2 vfat rw 0 0
```

这个内容中的文件系统我分别使用文件系统的 UUID 和 文件系统的设备地址，权限我分别使用了 `defaults` 和 `rw` ，也是为了告诉大家这里与 `mount` 命令如出一辙！

**最后，很重要的一点！当配置写好之后不要忘记使用 `mount` 命令做测试，看下是否挂载成功。如果 `/etc/fstab` 文件的挂载配置有问题可能会导致无法正常启动！！！**

怎么测试呢？还记不记得 `mount` 命令有个 `-a` 参数：

```bash
-a, --all               依照配置文件 /etc/fstab 的数据将所有未挂载的磁盘全部都挂载起来
```

所以，我们只需要简单的执行下 `mount` 命令并看下磁盘挂载信息即可：

```bash
$ sudo mount -a

$ sudo lsblk -lp

NAME       MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
/dev/sda     8:0    0 223.6G  0 disk
/dev/sda1    8:1    0   512M  0 part /boot/efi
/dev/sda2    8:2    0 222.1G  0 part /
/dev/sda3    8:3    0   976M  0 part [SWAP]
...
/dev/sdb     8:16   0 931.5G  0 disk
/dev/sdb1    8:17   0    10G  0 part /home/ituknown/Volume1   ## 看, 有了
/dev/sdb2    8:18   0    10G  0 part /home/ituknown/Volume2

....
```

使用 `lsblk` 能够正常看到挂载点信息就表示 `/etc/fstab` 配置文件 ok 了~

现在，是不是就可以随意玩自己的 Linux 系统了？

--

https://serverfault.com/questions/948408/mount-wrong-fs-type-bad-option-bad-superblock-on-dev-xvdf1-missing-codepage

https://unix.stackexchange.com/questions/315063/mount-wrong-fs-type-bad-option-bad-superblock

https://askubuntu.com/questions/525243/why-do-i-get-wrong-fs-type-bad-option-bad-superblock-error
