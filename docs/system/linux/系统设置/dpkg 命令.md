`dpkg` 命令 是 Debian 系列 Linux 系统用来安装、创建和管理软件包的工具。

## 语法

```bash
dpkg [option] [package.deb|package]
```

其中 `[option]` 指可选参数，`package.deb` 指的是离线软件包，`package` 指的是基于 `package.deb` 安装的系统软件。

下面是参数 option 说明：

```
-i,--install <package.deb>              安装离线软件包
-l,--list <package>                     列出已安装的软件(如果指定 package 则显示该软件的信息)
-L,--listfiles <package>                列出与该软件关联的文件
--confiugre <package>                   配置软件
-c,--contents <package.deb>             显示软件包文件信息
-r,--remove <package>                   卸载使用 -i 参数安装的软件, 但不删除配置数据
-P,--purge <package>                    卸载使用 -i 参数安装的软件, 同时删除配置数据
```

下面以 qq 音乐离线软件包为例做说明：

```bash
$ ls
qqmusic_1.1.3_amd64.deb
```

## 安装离线软件包

```bash
$ sudo dpkg -i qqmusic_1.1.3_amd64.deb
Selecting previously unselected package qqmusic.
(Reading database ... 173727 files and directories currently installed.)
Preparing to unpack qqmusic_1.1.3_amd64.deb ...
Unpacking qqmusic (1.1.3) ...
Setting up qqmusic (1.1.3) ...
Processing triggers for gnome-menus (3.36.0-1) ...
Processing triggers for desktop-file-utils (0.26-1) ...
Processing triggers for mailcap (3.69) ...
Processing triggers for hicolor-icon-theme (0.17-2) ...
```

## 列出已安装的软件

```bash
$ dpkg -l qqmusic
Desired=Unknown/Install/Remove/Purge/Hold
| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend
|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)
||/ Name           Version      Architecture Description
+++-==============-============-============-=================================
ii  qqmusic        1.1.3        amd64        qqmusic for linux
```

如果不指定 package 则展示系统上全部的软件信息：

```bash
$ dpkg -l
Desired=Unknown/Install/Remove/Purge/Hold
| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend
|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)
||/ Name                                   Version                         Architecture Description
+++-======================================-===============================-============-=====================================================================================>
ii  accountsservice                        0.6.55-3                        amd64        query and manipulate user account information
ii  acl                                    2.2.53-10                       amd64        access control list - utilities
ii  adduser                                3.118                           all          add and remove users and groups
ii  adwaita-icon-theme                     3.38.0-1                        all          default icon theme of GNOME
ii  alsa-topology-conf                     1.2.4-1                         all          ALSA topology configuration files
ii  alsa-ucm-conf                          1.2.4-2                         all          ALSA Use Case Manager configuration files
ii  alsa-utils                             1.2.4-1                         amd64        Utilities for configuring and using ALSA
ii  anacron                                2.3-30                          amd64        cron-like program that doesn't go by time
ii  apache2-bin                            2.4.52-1~deb11u2                amd64        Apache HTTP Server (modules and other binary files)
ii  apg                                    2.2.3.dfsg.1-5+b2               amd64        Automated Password Generator - Standalone version
ii  apparmor                               2.13.6-10                       amd64        user-space parser utility for AppArmor
ii  appstream                              0.14.4-1                        amd64        Software component metadata management
ii  apt                                    2.2.4                           amd64        commandline package manager
ii  apt-config-icons                       0.14.4-1                        all          APT configuration snippet to enable icon downloads
...
```

## 列出与软件关联的文件

某些开发相关的软件安装完成后少不了需要修改配置文件的需求，所以查找系统上与改软件相关联的文件就显得很重要了：

```bash
$ dpkg -L qqmusic
/.
/opt
/opt/qqmusic
/opt/qqmusic/v8_context_snapshot.bin
/opt/qqmusic/qqmusic
/opt/qqmusic/libvk_swiftshader.so
/opt/qqmusic/swiftshader
/opt/qqmusic/swiftshader/libGLESv2.so
/opt/qqmusic/swiftshader/libEGL.so
/opt/qqmusic/resources.pak
/opt/qqmusic/snapshot_blob.bin
/opt/qqmusic/chrome-sandbox
/opt/qqmusic/icudtl.dat
/opt/qqmusic/chrome_100_percent.pak
/opt/qqmusic/vk_swiftshader_icd.json
/opt/qqmusic/libGLESv2.so
/opt/qqmusic/chrome_200_percent.pak
/opt/qqmusic/libEGL.so
/opt/qqmusic/resources
...
```

## 配置软件

某些软件安装完成后还可以使用 `--configure` 参数做相应的配置。当然了，qq音乐是不支持的：

```bash
$ sudo dpkg --configure qqmusic
```

## 显示软件包文件信息

`.deb` 文件本身就是一种包文件，既然是打包后的文件肯定就能查看包文件信息了：

```bash
$ sudo dpkg -c qqmusic_1.1.3_amd64.deb
drwxrwxr-x 0/0               0 2022-02-08 16:28 ./
drwxr-xr-x 0/0               0 2022-02-08 16:28 ./opt/
drwxrwxr-x 0/0               0 2022-02-08 16:28 ./opt/qqmusic/
-rw-r--r-- 0/0          622528 2022-02-08 16:28 ./opt/qqmusic/v8_context_snapshot.bin
-rwxr-xr-x 0/0       116376232 2022-02-08 16:28 ./opt/qqmusic/qqmusic
-rwxr-xr-x 0/0        16596184 2022-02-08 16:28 ./opt/qqmusic/libvk_swiftshader.so
drwxrwxr-x 0/0               0 2022-02-08 16:28 ./opt/qqmusic/swiftshader/
-rwxr-xr-x 0/0         3263488 2022-02-08 16:28 ./opt/qqmusic/swiftshader/libGLESv2.so
```

## 卸载软件

软件安装后想要卸载可以使用 `-r` 参数：

```bash
$ sudo dpkg -r qqmusic
(Reading database ... 173846 files and directories currently installed.)
Removing qqmusic (1.1.3) ...
Processing triggers for hicolor-icon-theme (0.17-2) ...
Processing triggers for gnome-menus (3.36.0-1) ...
Processing triggers for desktop-file-utils (0.26-1) ...
Processing triggers for mailcap (3.69) ...
```

注意 `-r` 参数后面的 package 是使用 `-l` 参数展示的名称：

```bash
$ sudo dpkg -l qqmusic
Desired=Unknown/Install/Remove/Purge/Hold
| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend
|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)
||/ Name           Version      Architecture Description
+++-==============-============-============-=================================
iU  qqmusic        1.1.3        amd64        qqmusic for linux
```

## 删除配置文件

`-r` 参数虽然卸载的软件。但是相关的配置文件还在系统上没有被删除。因此如果想要彻底删除还要执行下下面的命令：

```bash
$ sudo dpkg -P qqmusic
(Reading database ... 173727 files and directories currently installed.)
Purging configuration files for qqmusic (1.1.3) ...
```
