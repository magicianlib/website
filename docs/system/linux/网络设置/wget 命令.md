## 前言

wget 是 UNIX 下的用于网络下载的工具，功能强大且使用简单，各 Linux 发行版都可以直接使用对应的包管理器进行安装。

如 Debian 系列：

```bash
sudo apt-get install -y wget
```

如 RHEL 系列：

```bash
sudo yum install -y wget
```

安装完成之后可以使用使用 help 命令或 man 命令查看使用方式：

```bash
wget --help

# 或

man wget
```

下面简单说下：

## 下载网络文件

想要网络文件直接在 wget 后面跟相应的文件链接即可：

```bash
wget $url
```

如下载 mysql 软件包：

```bash
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

**注意：** wget 不仅能够下载网络文件还能下载网页，即如果 `$url` 是普通的网页的话，wget 会将网页下载到本地。

示例：

```bash
wget baidu.com

...
index.html  100%[========================================================>]  81  --.-KB/s  in 0s

2021-10-21 20:56:46 (6.20 MB/s) - ‘index.html’ saved [81/81]
```


## 下载网络文件并重命名

默认情况下，wget 下载到本地后的文件名是网络文件名。如下面的链接，下载到本地后的文件名是 mysql-8.0.27-linux-glibc2.12-i686.tar.xz。

```
https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

我们可以使用 `-O` 参数进行重命名文件，如下：

```bash
wget -O $output_file_name $url
```

如下载 mysql 软件包并重命名：

```bash
wget -O mysql-8.0.27.tar.xz https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

## 下载网络文件到指定目录

默认情况下，wget 命令会将网络文件下载到当前目录（即执行 wget 命令所在的目录）。

如果想要将网络文件下载到指定目录，我们可以使用 `-P` 参数。如下：

```bash
wget -P $DIR $url
```

如下载 mysql 软件到到 /opt 目录下：

```bash
wget -P /opt https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

## 下载网络文件到指定目录并重命名

`wget` 的 `-P` 和 `-O` 不能同时使用，即你想将文件下载到指定目录并重命名，这个是行不通的。

比如上面的示例链接：[https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz](https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz)

默认情况下下载到本地后的文件名是 mysql-8.0.27-linux-glibc2.12-i686.tar.xz。如果你想将该文件重命名为 mysql.tar.xz 直接使用 -O 参数指定即可：

```bash
wget -O mysql.tar.xz https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

但是如果你同时使用 -P 参数将该文件下载到 /opt 目录下是行不通的，即如下命令是不行的：

```bash
wget -O mysql.tar.xz -P /opt https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

那该怎么办呢？修改成如下即可：

```bash
wget -O /opt/mysql.tar.xz https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz
```

使用 -O 参数不仅可以直接重命名文件还可以指定下载到指定的目录。

## 指定用户名密码

有些时候下载的网络文件可能需要一定的认证权限才能够下载。最典型的就是 FTP 服务器文件，下载这类协议的文件时一般需要指定用户名密码。

命令如下：

```bash
wget --user=$username --password=$password $url
```

这个命令适用于 http 协议和 ftp 协议。另外，wget 还专门提供了一个用于 ftp 协议使用的用户名密码参数，如下：

```bash
wget --ftp-user=$username --ftp-password=$password $url
```

在实际使用中还是推荐使用第一种方式。因为第一种方式同时适用于 http 和 ftp，简单方便。

比如有个私人的 ftp 服务器，我想要下载某个文件，地址是：ftp://ip:port/software/os/ubuntu12.04/ubuntu-12.04.1-server-amd64.iso

在下载时需要认证，那么 wget 命令如下：

```bash
wget --ftp-user=${username} --ftp-password=${password} ftp://ip:port/software/os/ubuntu12.04/ubuntu-12.04.1-server-amd64.iso

## 或

wget --ftp-password=${password} ftp://${username}@ip:port/software/os/ubuntu12.04/ubuntu-12.04.1-server-amd64.iso
```

**注意：** 示例中` ${username}` 和 `${password}` 是你的用户名密码。

## 断点续传/下载

这个功能就特别实用了，当你正在下载某个软件时，由于网速很慢需要等待很长时间，但你又急着干其他事情，该怎么办？

没事，终止下载即可，之后想要重新下载时实用断点续传参数就会接着上次继续下载了~

断点续传需要使用 `-c` 参数，表示接着上次下载。

如我想要下载 mysql 软件包：

```bash
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz

...
Saving to: ‘mysql-8.0.27-linux-glibc2.12-i686.tar.xz’

glibc2.12-i686.tar.xz             28%[===============>                                         ] 302.14M  6.25MB/s    eta 2m 11s ^
```

当我下载到一半后我终止了该任务（ctrl + c）。之后如果想要接着下载，重新输入下载命令并加上 `-c` 参数即可：

```bash
wget -c https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.27-linux-glibc2.12-i686.tar.xz

...
Saving to: ‘mysql-8.0.27-linux-glibc2.12-i686.tar.xz’

glibc2.12-i686.tar.xz             34%[++++++++++++++++==>                                      ] 362.82M  5.16MB/s    eta 2m 15s ^
```

**注意：** 断点续传下次继续下载的前提是文件名相同。如果第一次执行命令下载的文件和之后继续下载的文件名不通是没法继续下载的，会从头开始。需要注意这点。

下面是断点续传的演示示例

[![asciicast](https://asciinema.org/a/443989.svg)](https://asciinema.org/a/443989)