## 前言

Debian 系统在安装后经常会遇到无法连接网络的问题，这个原因是因为缺少网络驱动模块。Debian 系统的 ISO 文件虽然包含很多 deb 软件包，但都属于官方软件，而大多数的驱动模块都属于非官方软件包。很不巧，网络驱动模块属于非官方软件。

笔记本也还，台式机也好。对于不包含网络驱动的 ISO 系统文件，在安装时到网络配置这块通常会提醒缺少网络驱动模块（如下图）。如果在安装之前不做任何准备的话这里只能点击 **No** 进行跳过，这就安装之后没有网络驱动的原因。

![hw-detect_load_firmware_0-1642308292i75tY4](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/hw-detect-load-firmware-0=MTcxMTM2MzI5Mgo====.png)

我这里以 Debian 11（代号为 bullseye），小版本 11.0 为例。在安装是就因为没有网络驱动模块而直接跳过，导致安装后无法上网。尤其是在笔记本上，通常都是使用 WI-FI 连接网络遇到这种问题就直接歇逼了（如下图）。直接提示你没有 Adapter，你说气不气？

![show-setting-wifi-164225356031Ch2u](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/=MTcxMTM2MzM0MAo====.png)

解决方式也很简单，安装驱动即可！那怎么找网络驱动呢？

## 获取网络驱动

其实在 Debian 的软件库中有一个叫非官方软件的软件仓库，对应的地址是：[https://cdimage.debian.org/cdimage/unofficial/](https://cdimage.debian.org/cdimage/unofficial/)。这里面收录了许多非 Debian 官方的软件包，比如网络驱动就不属于官方软件包，所以如果你想要什么驱动的话就到这个仓库下找即可，如果真的找不到再去驱动官网去找。

Debian 将所有的驱动模块都打包成 firmware 文件，即固件的意思。因此我们需要到 Debian 的固件目录下下载，地址是：[https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/](https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/)。

在该目录下会有对应的操作系统版本，文件夹的名称是对应版本的代号。比如 Debian11 的代号是 bullseye，所以我到该目录下下载即可。需要特别强调的是，虽然 Debian 的每个版本都有自己的代号，但是这个大版本下会有许多小版本，比如 11.0、11.1。所以在 firmware 目录下通常还会分具体的小版本。我们找某个软件包应该优先到具体的小版本下找，如果没有找到需要的软件包再考虑去其他小版本下找，防止存在兼容性问题。

Debian 的驱动程序都被打包到一个 firmware 文件中（这个包里面有许多驱动，但并不是所有的驱动都在里面，如果没有你需要的驱动可以去驱动官网下载）。比如我的 bullseye 小版本是 11.0 我就到该目录下找 firmware 包文件即可：

![debian-bullseye-firmware-dir-16423088910P8cjX](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/debian-bullseye-firmware-dir=MTcxMTM2MzQwNAo====.png)

我这里直接选择 zip 压缩文件（gz、tar.gz 和 zip 都是压缩包文件，没有任何区别），对应的地址是 [https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/bullseye/11.0.0/firmware.zip](https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/bullseye/11.0.0/firmware.zip)，下载即可。

下载完成后进行解压，就会看到里面有许多的 deb 驱动软件包：

![firmware-pkg-1642309156YqwRRi](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/firmware-pkg=MTcxMTM2MzQ1MQo====.png)

之后有两种使用方式：

## 在安装系统时直接安装网络驱动

如果你要想在系统安装是就安装网络驱动，需要另外准备一个可移动介质（如 U 盘），将 firmware.zip 解压后的文件全部拷贝到可移动介质中（注意，这些 deb 文件必须放在根目录或 /firmware 目录下。推荐的方式是将可移动介质格式化后，直接将压缩后的 deb 包文件直接拷贝进去）。在安装系统时到配置网络模块这一步选择 **Yes**（如下图）：

![hw-detect_load_firmware_0-1642308292i75tY4](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/hw-detect-load-firmware-0=MTcxMTM2MzI5Mgo====.png)

然后将可移动介质插入到电脑上，之后点击 **Continue** 就会自动找可移动介质里面的网络驱动进行安装了。正常的话会进入下面的界面，如果有多个网卡的情况下还会让你选择主要网卡：

![netcfg_choose_interface_0-1642309532flKbr1](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/netcfg-choose-interface-0=MTcxMTM2Mzc0NAo====.png)

因为我的是笔记本就直接选择 Wireless 了，然后耐心等待吧。安装完成后就会看到网络模块正常了：

![show-desktop-after-install-driver-16422558589Wybrr](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/show-desktop-after-install-driver=MTcxMTM2Mzc4Mgo====.png)

<details open>
<summary>**Debian 官网文档原话如下**</summary>

Official installation images do not include non-free firmware. The most common method to load such firmware is from some removable medium such as a USB stick. Alternatively, unofficial installation images containing non-free firmware can be found at https://cdimage.debian.org/cdimage/unofficial/non-free/cd-including-firmware/. To prepare a USB stick (or other medium like a hard drive partition), <u>*the firmware files or packages must be placed in either the root directory or a directory named /firmware of the file system on the medium*</u>. The recommended file system to use is FAT as that is most certain to be supported during the early stages of the installation.
</details>

## 在系统安装后安装网络驱动

另一种方式只能是在系统安装后再去安装网络驱动了。将下载好的 firmware.zip 进行解压，解压后会看到许多 deb 软件包，不需要全部安装。我们只需要找我们需要的驱动程序即可，执行下面的命令来确定我们的网络驱动信息：

```bash
$ lspci | egrep -i 'Ethernet|Network'
```

输出信息如下：

```
02:00.0 Ethernet controller: Realtek Semiconductor Co., Ltd. RTL8111/8168/8411 PCI Express Gigabit Ethernet Controller (rev 0c)
03:00.0 Network controller: Intel Corporation Wireless 3165 (rev 81)
```

因此我需要的网卡是驱动是 Inet 的 Realtek，另外还需要一个 WI-FI 驱动模块，解压 firmware.zip 后找到我自己需要的软件包即可，比如我这里需要的是 `firmware-realtek_20210315-3_all.deb` 和 `firmware-iwlwifi_20210315-3_all.deb` ：

![firmware-driver-list-16422556713Fzxyk](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/firmware-driver-list=MTcxMTM2Mzg0Nwo====.png)

之后将这两个 deb 软件包拷贝到系统的临时目录，然后双击安装就好了（需要超级管理员权限）。

另外也可以直接使用 `dpkg` 命令进行安装安装：

```bash
$ sudo dpkg -i firmware-realtek_20210315-3_all.deb firmware-iwlwifi_20210315-3_all.deb
```

安装完成后重启，就可以看到 WI-FI 正常了：

![show-desktop-after-install-driver-16422558589Wybrr](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/show-desktop-after-install-driver=MTcxMTM2Mzc4Mgo====.png)

或者到 Setting 里面看到 WI-FI 显示信息：

![show-setting-wifi-after-install-driver-1642255884SXZ9pe](https://@media/linux-media/NetworkManager/Debian-NoNetworkDriver/show-setting-wifi-after-install-driver=MTcxMTM2MzkyMgo====.png)

这就大功告成了~

--

参考与资源链接：

https://www.debian.org/releases/bullseye/amd64/ch06s04.en.html#idm2828

https://cdimage.debian.org/cdimage/unofficial/non-free/firmware/

https://www.reddit.com/r/debian/comments/d4xz53/how_to_install_wifi_drivers_on_debian

https://wiki.debian.org/WiFi#Availability_of_compatible_WiFi_chipsets
