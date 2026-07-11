## 前言
`ifconfig`命令是 Linux 网络管理工具，该命令是 interface configuration（即接口配置） 的缩写。该工具主要用于配置和查看网络接口的状态，在日常使用中，我们可以利用 `ifconfig` 命令分配一个新网络、启动或禁用网卡以及管理 ARP 缓存，甚至可以实现路由管理等等。

:::info[NOTE]
`ifconfig` 命令的作用是一次性生效的，即修改之后重启机器就失效了。想要永久修改需要去编辑 /etc 目录下的网络配置文件。
:::

## 命令安装

`ifconfig` 命令通常不是各Linux发行版自带的系统命令，如果你输入 `ifconfig` 命令后提示 “ifconfig: command not found” 即表示当前系统默认没有集成该工具包，想要使用该命令需要先安装工具包 `net-tools`。

特别说明的一点是：在新的 Linux 发行版中，已经不推荐使用 `ifconfig` 命令进行网络管理，取而代之的是使用系统自带的 [ip](./IP%20命令.md) 命令。

在 Debian/Ubuntu 发行版中安装 `net-tools` 工具直接执行下面的命令即可：

```bash
sudo apt-get install -y net-tools
```

在 RHEL/CentOS 发行版中安装 `net-tools` 工具执行下面的命令即可：

```bash
sudo yum install -y net-tools
```

或者使用 `dnf` 软件管理包安装：

```bash
sudo dnf install net-tools -y
```

## ifconfig 命令的使用

`ifconfig` 命令的基本语法如下：

```bash
ifconfig [-a] [-v] [-s] <interface> [[<AF>] <address>]
```

`<interface>` 指的是网卡名称，比如直接运行 `ifconfig` 命令输出示例：

```bash
docker0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 172.17.0.1  netmask 255.255.0.0  broadcast 172.17.255.255
        ether 02:42:bf:ef:97:98  txqueuelen 0  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.124  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 00:15:5d:01:79:00  txqueuelen 1000  (Ethernet)
        RX packets 8992  bytes 1032157 (1007.9 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 2135  bytes 218114 (213.0 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 522  bytes 51544 (50.3 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 522  bytes 51544 (50.3 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

其中 `docker0`、`eth0` 和 `lo` 就是网卡名称，上面列出的是全部的网卡信息，如果只想要列出某一个网卡信息(比如 `eth0` 网卡)使用如下命令即可：

```bash
ifconfig eth0
```

输出示例：

```bash
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.124  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 00:15:5d:01:79:00  txqueuelen 1000  (Ethernet)
        RX packets 9060  bytes 1038699 (1014.3 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 2175  bytes 224276 (219.0 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

## 在网卡上分配一个IP地址和子网掩码

`ifconfig` 命令还可以在指定的网卡上分配一个 IP 地址和子网掩码。

命令格式如下：

```bash
ifconfig [interface-name] [ip-address] netmask [subnet-mask]
```

比如给 eth0 网卡分配一个指定的 IP `192.168.1.122` 和子网掩码 `255.255.255.0`：

```bash
ifconfig eth0 192.168.1.122 netmask 255.255.255.0
```

再次查看 eth0 网卡信息就会发现网络 IP 被改变了：

```bash
$ ifconfig eth0
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.122  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 00:15:5d:01:79:00  txqueuelen 1000  (Ethernet)
        RX packets 9296  bytes 1062890 (1.0 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 2312  bytes 241510 (235.8 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

并且，我们还可以接着给 eth0 网卡分配第二个 IP：

```bash
ifconfig eth0:0 192.168.1.121 netmask 255.255.0.0
```

查看网卡信息：

```bash
$ ifconfig eth0:0
eth0:0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.121  netmask 255.255.0.0  broadcast 192.168.255.255
        ether 00:15:5d:01:79:00  txqueuelen 1000  (Ethernet)
```

## 启用禁用网卡

有时，我们可能需要重置网络接口。在这种情况下，可以使用 ifconfig 命令来启用或禁用网络接口。

要禁用活动网络接口，直接指定网卡然后输入 `down` 标志即可，比如禁用 eth0 网卡：

```bash
ifconfig eth0 down
```

相应的，启用网卡使用 `up`：

```bash
ifconfig eth0 up
```

## 启用禁用 Promiscuous Mode

要想网络接口访问和查看网络中的所有数据包。我们还可以使用 ifconfig 命令在特定网络设备上启用和禁用 Promiscuous。

想要在网卡上启用该模式只需要在网卡后传递 `promisc` 参数即可：

```bash
ifconfig eth0 promisc
```

禁用传递 `-promisc` 参数即可：

```bash
ifconfig eth0 -promisc
```

## 修改 MTU

MTU 全称是 Maximum Transmission Unit，即限制在指定网络接口上传递的数据包大小。

语法是：

```bash
ifconfig [interface-name] mtu [mtu-value]
```

例如，将网络接口eth0的MTU值设置为500，运行以下命令：

```bash
ifconfig eth0 mtu 500
```

## 修改 MAC 地址

MAC “Media Access Control” 是唯一标识网络上设备的物理地址。

想要修改网络接口的 MAC 地址，只需要使用 `hw ether` 标志位设置新的 MAC 地址即可，如：

```bash
ifconfig eth0 hw ether 00:00:2d:3a:2a:28
```