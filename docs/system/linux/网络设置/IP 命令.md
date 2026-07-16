## 前言

`ip` 命令和 `ifconfig` 一样，都是很强大的网络管理工具，而且它功能丝毫不逊色与 `ifconfig` 命令。当然最主要的是 `ip` 命令是 Linux 自带的网络管理工具，开箱即用，不像 `ifconfig` 还需要安装额外的工具。而且当你简单的了解 `ip` 命令后，你会发现该命令被设计的特别人性化。

我们可以通过 `ip` 命令管理网络接口启用和禁用、分配或删除指定网络接口的 IP 地址、路由查看以及管理 ARP 缓存。当然这也仅仅是 `ip` 命令的部分功能，也是我们常用的主要功能。

需要特别说明的是， `ip` 命令虽然可以用来管理网络，但更多的是用于查询使用。因为使用 `ip` 命令修改的信息是不会保存到系统配置文件中的，当你重启机器后所有的修改也就失效了。另外，当我们使用 `ip` 命令执行修改操作时需要使用超级管理员用户（ `root` ）或具有超级管理员权限（ `sudo` ）的用户，要记住这点！

## 如何使用 ip 命令

再次说明一下， `ip` 命令是 Linux 发行版自带的网络管理工具，是 `iproute2` 包的一部分，无需安装任何额外的工具，开箱即用。这也是为什么推荐大家使用 `ip` 命令去替代 `ifconfig` 命令的原因。

`ip` 命令语法如下：

```bash
ip [ OPTIONS ] OBJECT { COMMAND | help }
```

另外也可以直接在 Terminal 中输入 `ip` 或 `ip help` 命令查看详细使用信息，如下：

![ip-help-1637489799GoJYS5](https://@media/linux-media/NetworkManager/ip-command/ip-help-1637489799GoJYS5.png)

`[ OPTIONS ]` 是可选参数（如上截图），常用的参数有如下：

```
-h : 以人类容易阅读的格式输出（常用）
-c : 将 IP 信息使用颜色标出（常用）
-4 : 只输出 IPv4 信息（常用）
-6 : 只输出 IPv6 信息（常用）
-s : 统计网络数据（常用）
-j : 以 JSON 的数据格式数据，我们可以利用这个参数将输出的信息导出到 JSON 文件中，可用于特殊处理
-p : 这个参数配合 -j 参数使用，将 JSON 输出格式化输出
```

而 `OBJECT` 就是我们想要管理的对象类型，这个就是我们使用的目标。最常用的对象有如下（括号中的字符是对象缩写的意思）：

```
link(l) : 展示或修改网络接口信息，即网卡
address(a | addr) : 展示或修改 IP 地址信息
route(r) : 展示和修改路由表信息
neigh(n) : 展示或管理 ARP(Address Resolution Protocol) 表
```

在使用时， `OBJECT` 可以以完整或缩写（简称）形式编写。如果想要查看某个对象该如何使用，可以使用 `ip OBJECT help` 命令，如： `neigh` ：

```bash
$ ip neigh help
Usage: ip neigh { add | del | change | replace }
		{ ADDR [ lladdr LLADDR ] [ nud STATE ] | proxy ADDR } [ dev DEV ]
		[ router ] [ extern_learn ] [ protocol PROTO ]

	ip neigh { show | flush } [ proxy ] [ to PREFIX ] [ dev DEV ] [ nud STATE ]
				  [ vrf NAME ]
	ip neigh get { ADDR | proxy ADDR } dev DEV

STATE := { permanent | noarp | stale | reachable | none |
           incomplete | delay | probe | failed }
```

再次说明， `ip` 命令更多的适用于输出展示。如果想要做修改操作需要有超级管理员权限，最重要的是使用 `ip` 所做的修改操作是不会写到系统配置文件的，重启系统后所做的修改也就失效了。

## 网络 IP 管理

管理网络 IP 使用的是 address 对象，或者直接使用缩写 addr 或 a。下面是该对象的命令语法：

```bash
ip addr [ COMMAND [ ADDRESS ] ] [ dev [ INTERFACE ] ]
```

addr 对象使用最频繁的命令（ `COMMAND` ）有三个：

```
show : 展示网络 IP 信息
add  : 添加一个 IP 地址(ADDRESS)
del  : 删除指定 IP 地址(ADDRESS)
```

而 `INTERFACE` 指的就是你的网络接口，即网卡。

### 显示所有 IP 信息

展示系统的所有 IP 信息使用下面的命令：

```bash
$ ip addr show
```

不过，当我们使用 `ip` 命令用于信息输出时，推荐加上 `-c` 参数。这样输出的 IP 会使用不通的颜色进行高亮显示：

```bash
$ ip -c addr show
```

下面是输出示例：

![ip-addr-show-1637491949IdhydV](https://@media/linux-media/NetworkManager/ip-command/ip-addr-show-1637491949IdhydV.png)

| **说明**                                                     |
| :----------------------------------------------------------- |
| 当用于展示输出时， `show` 参数可以忽略。即使用 `ip -c addr` 也能得到上面一样的输出。 |

### 只显示 IPv4 或 IPv6

前面的示例中输出的 IP 信息包含 IPv4 和 IPv6，但如果你只想输出 IPv4 或 IPv6 使用 `-4` 或 `-6` 参数即可：

只输出 IPv4：

```bash
$ ip -c -4 addr show
```

只输出 IPv6：

```bash
$ ip -c -6 addr show
```

下面是只展示 IPv4 的示例：

![ip-addr-show-v4-1637492302ZUowIy](https://@media/linux-media/NetworkManager/ip-command/ip-addr-show-v4-1637492302ZUowIy.png)

### 只显示指定网卡信息

使用 `ip addr show` 默认会输出所有的网络接口信息，也就是我们常说的网卡信息。比如示例中你会发现输出一大箩筐的 IP 信息，主要原因是我使用了 Docker 和 VMware 虚拟机的原因，这些都是这些服务利用软件桥接技术创建的虚拟网络接口。

实际上真正的网络接口是 `wlp3s0` ，所以当我们知道网络接口后可以只输出指定的网络接口的信息，命令格式为：

```bash
ip addr show dev [ INTERFACE ]
```

其中 `[ INTERFACE ]` 就是你的网络接口，比如我只想输出 `wlp3s0` 的网络接口直接使用如下命令即可：

```bash
$ ip -c addr show dev wlp3s0
```

输出示例：

![ip-addr-show-dev-1637492786OyUZDK](https://@media/linux-media/NetworkManager/ip-command/ip-addr-show-dev-1637492786OyUZDK.png)

当然了，这个输出的是网络接口 `wlp3s0` 的所有信息，即同时包含了 IPv4 和 IPv6。如果你只想输出指定的网络协议输出，加上 `-4` 或 `-6` 参数即可。

### 给网络接口分配新的 IP 地址

我们可以给指定的网络接口分配一个新的 IP，前提是这个 IP 在你的局域网内没有配占用。语法如下：

```bash
ip addr add ADDRESS dev INTERFACE
```

其中 ADDRESS 是你指定要分配的新的 IP 地址，而 INTERFACE 就是你的网络接口。

比如我当前网络接口 `wlp3s0` 的 IPv4 地址是 `192.168.1.5` ，子网掩码是 24。我想要分配一个新的 IP 地址 `192.168.1.100` ，子网掩码为 24。对应的命令就为：

```bash
$ sudo ip addr add 192.168.1.100/24 dev wlp3s0
```

| **注意**                                                     |
| :----------------------------------------------------------- |
| 想要执行上面的命令，你需要使用超级管理员用户（ `root` ）或具有超级管理员权限（ `sudo` ）的用户。否则会给你提示错误信息： `RTNETLINK answers: Operation not permitted` |

当执行成功后，再次查看网络接口信息你就会发现多出了一个新的 IP 地址，这个地址就是你之前分配的：

![ip-addr-add-1637493376QfNxUr](https://@media/linux-media/NetworkManager/ip-command/ip-addr-add-1637493376QfNxUr.png)

从上面的输出你也能够看出来，一个网络接口可以同时分配多个 IP 地址，也就是说你现在还可以继续分配。

:::tip
使用 `ip` 命令做的修改操作是一次性的，当你重启系统后就失效了。
:::

### 删除网络接口的 IP 地址

既然能够分配肯定也就能够删除了，语法如下：

```bash
ip addr del ADDRESS dev INTERFACE
```

比如现在想要将之前分配给 wlp3s0 的网络接口的 IP `192.168.1.100/24` 删除掉：

```bash
$ ip addr del 192.168.1.100/24 dev wlp3s0
```

这里就不做输出展示了~

## 网络接口管理

网络接口也就是网卡，它的语法与用于管理 IP 的语法一样。这里你就会发现 `ip` 命令的共通性及人性化：

```bash
ip link [ COMMAND ] [ dev [ INTERFACE ] ] [ up | down ]
```

addr 对象使用最频繁的命令（ `COMMAND` ）有四个：

```
show : 展示网络接口信息
add  : 添加网络接口
del  : 删除网络接口
set  : 启用或禁用网络接口, 需要配合后面的 up 和 down 参数使用
```

### 显示网络接口信息

显示网络接口信息直接使用 show 命令即可，与 IP 命令一样：

```bash
$ ip -c link show
```

这个命令会输出系统的所有网络接口信息，示例如下：

![ip-link-show-1637494262HOkOvE](https://@media/linux-media/NetworkManager/ip-command/ip-link-show-1637494262HOkOvE.png)

### 显示指定网络接口信息

同样的，我们可以只显示指定的网络接口信息。比如我只想展示名为 `wlp3s0` 的网络接口信息：

```bash
$ ip link show dev wlp3s0
```

:::tip
其实 `dev` 参数是可以忽略的，即： `ip link show wlp3s0` 。但是为了容易理解，所以从最开始就一直没有忽略。
:::

### 启用禁用指定网络接口

这个功能是很有用的，因为系统的 IP 其实就是与网络接口绑定的。所以在实际上经常需要做 IP 测试就需要管理它的启用和禁用。

当你禁用某个网络接口，也就表示给该网络接口上的 IP 禁用了，这样就无法通过这个 IP 进行通信了。

它的语法如下：

```bash
ip link set INTERFACE { up | down }
```

`INTERFACE` 就是你的网络接口，而 `up` 和 `down` 就是用来控制启用和禁用的。

比如我想要禁用 `wlp3s0` 网络接口：

```bash
$ ip link set wlp3s0 down
```

:::info[Note]
 因为我使用的是 SSH 连接的，就不做演示的，否则就断线无法使用 SSH 连接了~
:::

## 路由表管理

管理路由表使用的是 `route` 对象。语法如下：

```
ip route [ COMMAND ] [ SELECTOR ]
```

最常用的 `[ COMMAND ]` 有： `list` 、 `add` 和 `del` 。

### 显示路由表信息

获取路由表信息可以使用下面的命令：

```bash
ip route
ip route list
ip route list SELECTOR
```

当不指定 `SELECTOR` 时展示的就是系统的所有路由表信息：

```bash
$ ip -c route list
```

输出示例：

![ip-route-list-1637495453gRZuvr](https://@media/linux-media/NetworkManager/ip-command/ip-route-list-1637495453gRZuvr.png)

其中第一条 `default` 信息也就是我们常说的网关信息，也就是说我当前系统的 IP 网关为： `192.168.1.1` 。

### 显示指定路由表信息

这个在实际中用处貌似不太大，我更多是用于查询网关信息。命令为：

```bash
ip route list SELECTOR
```

其中 `SELECTOR` 就是你要指定的路由表条目，也就是 `ip route list` 输出的最前面的信息，除了第一条是 default 外，其他的都是具体的 IP。

所以，我通常会使用该命令查看我的网关信息：

```bash
$ ip -c route list default
```

或者查看指定条目的路由信息（以前面截图信息为例）：

```bash
$ ip -c route list 169.254.0.0/16
```

### 添加路由表信息

好吧，我实在不知道添加路由白有什么用，毕竟我还没遇到过这样的需求，添加路由表使用 `ip route add` 命令。

比如给我当前网关 `192.168.1.1` 添加一个新的路由信息，对应的 IP 地址为 `192.168.121.0/24` ：

```bash
$ sudo ip route add 192.168.121.0/24 via 192.168.1.1
```

之后就会看到多了一条路由表信息：

```bash
$ ip -c route list
default via 192.168.1.1 dev wlp3s0 proto dhcp metric 600
169.254.0.0/16 dev wlp3s0 scope link metric 1000
172.16.110.0/24 dev vmnet8 proto kernel scope link src 172.16.110.1
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
192.168.1.0/24 dev wlp3s0 proto kernel scope link src 192.168.1.5 metric 600
192.168.121.0/24 via 192.168.1.1 dev wlp3s0  <== 注意看这里
192.168.123.0/24 dev vmnet1 proto kernel scope link src 192.168.123.1
```

### 删除路由表信息

删除语法与新增语法一样，使用 `del` 即可。

删除默认路由表：

```bash
$ ip route del default
```

删除网关 `192.168.1.1` 上的指定路由表：

```bash
$ ip route add 192.168.121.0/24 via 192.168.1.1
```

--

https://linuxize.com/post/linux-ip-command/
