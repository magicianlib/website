Debian 最新的 release 版本可以在下面这个页面中下载，该页面同时还介绍了 stable、testing 和 unstable 版本的区别：

https://www.debian.org/releases/

如果想要下载历史版本系统镜像，可以到下面这个页面。这个页面包含所有归档版本（及当前最新版本）的下载入口，点击具体的版本代号即可进入对应架构的 CD/DVD 存储界面：

https://cdimage.debian.org/cdimage/archive/

:::info[特别强调]

在 Debian 12 (Bookworm) 之前，默认的系统镜像不包含“非自由固件”，这就导致了安装完成后很多功能不能使用（比如没有网络驱动）。

因此，如果你安装的系统版本小于 Debian 12 (Bookworm)，有两种解决方案：

$1.$ 第一种（太麻烦，不推荐）

进入“非自由固态”存储界面下载对应版本的固态压缩包，解压后自行安装所需的驱动。下载地址是：

[https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/](https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/)

$2.$ 第二种（推荐方式）

直接下载内置“非自由固态”的系统镜像文件。在安装系统时会自动查找并安装所需要的驱动，一步到位解君忧。下载地址是：

[https://cdimage.debian.org/cdimage/unofficial/non-free/images-including-firmware/archive/](https://cdimage.debian.org/cdimage/unofficial/non-free/images-including-firmware/archive/)

:::