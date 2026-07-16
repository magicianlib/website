## 前言

Linux 主要有两种运行模式，分别是命令行模式和 X11 图形界面模式。这两种运行模式大家都不陌生，如我们使用的 Linux 服务器，为了追求绝对的稳定性就会使用命令行模式。另外，作为一个开发者，日常使用的 Linux 操作系统基本上都是带 GUI 图形界面的 Linux 发行版（即 X11），比较典型的就是桌面版 [Ubuntu](https://ubuntu.com/)。

实际上，不管服务器也还、个人桌面版也好，使用的运行模式其实都是 Linux 的某种运行级别。Linux 一共有七种运行级别，分别涉及命令行运行模式和X11运行模式，下面就来聊下：

## 七种运行级别

| 运行级别(Runlevels) | 模式 |描述|
| :---| :--------------- |:-----|
| 0   | 关机模式         | 关机 |
| 1   | 命令行单用户模式 | 只允许超级管理员用户 root 使用。没有网络且不运行守护进程，属于自救模式。|
| 2   | 命令行多用户模式 | 同样没有网络且不运行守护进程，允许多用户同时登录使用。 |
| 3   | 命令行多用户模式 | **这就就是我们服务器使用的多用户模式。**    |
| 4   | 自定义           | 该模式完全由用户自己去定义，除非是超级高高高手，否者没人会使用该模式。 |
| 5   | X11模式          | 这个就是 **桌面版 GUI 图形模式**，也是桌面版 Ubuntu 及其他桌面版默认的运行模式。 |
| 6   | 重启模式         | 这个是重启模式，注意是无限重启！除非你非常熟悉 Linux，否者不要使用该模式。|

上面表格中每一种级别都有具体的说明，而我们经常使用的命令行模式其实就是 Linux 的 `runleve3` ，而桌面版 GUI 其实就是 Linux 的 `runlevel5` 。

## 查看当前系统运行级别

我们可以在终端中输入如下命令查看当前机器的运行级别：

```bash
$ runlevel
```

下面是桌面版 Ubuntu 输出示例：
​

![Ubuntu-Desktop-Default-Runlevel-1637546756qbfbg0](https://@media/linux-media/SystemManager/runlevels/Ubuntu-Desktop-Default-Runlevel-1637546756qbfbg0.png)

注意看截图中的输出：

```
N 5
```

“N” 是 “none” 的缩写，表示系统当前没有处于其他任何不同的运行级别。而 “5” 表示我们的系统当前正处于的运行级别 ，即 X11 图形界面。

:::info[注意]
运行级在 Debian 和 Ubuntu  上的工作方式有所不同。例如，Debian/Ubuntu 即使不启动 GUI，系统的运行级别也会启动到 5。这个是系统设定，并不影响，但是需要知道这点！
:::

## 修改当前用户的运行级别

我们当前系统的运行级别是 5，即 X11 图形模式。那如何修改当前用户的运行级别呢？使用 `telinit` 命令即可。
​
如我想将当前用户的运行级别修改为 3（多用户命令行模式），在终端中输入如下命令即可：
​

```bash
$ sudo telinit 3
```

:::info[注意]
修改当前用户的运行级别需要使用具有超级管理员角色，即使用 root 用户或者当前用户具有 `sudo` 命令权限。
:::

还是以我们当前的 GUI Ubuntu 为例，如下：

![Ubuntu-Desktop-Change-Runlevel-1637546811zSwqNT](https://@media/linux-media/SystemManager/runlevels/Ubuntu-Desktop-Change-Runlevel-1637546811zSwqNT.png)

当我们输入密码回车确认后就会立即进入命令行模式（即 Runleve3）：

![linux-runlevel3-loginpage-1637546889GRM14C](https://@media/linux-media/SystemManager/runlevels/linux-runlevel3-loginpage-1637546889GRM14C.png)

之后登录到系统，再次输入 `runlevel` 命令查看运行级别，你会得到如下输出：
​

![linux-runlevel3-show-1637546934N1rSC4](https://@media/linux-media/SystemManager/runlevels/linux-runlevel3-show-1637546934N1rSC4.png)

你看，这回不是 `N 3` 而是 `5  3` 了。记住，前面一个表示当前系统具有其他运行级别，后面一个表示当前用户的运行级别。另外，这仅仅是修改当前登录用户的运行级别，也就是说当我们重启（ `reboot` ）后就失效了~
​
:::tip
如果你按照上面的示例操作输入 `telinit 3` 后，你的屏幕变成空白而不是切入到命令行模式。是因为你处于一现在是 TTY。只需要在键盘上按住 Alt+F1 组合键（或其他功能键）就可以进入命令终端了。
:::

## initd 和 Systemd

现在大多数 Linux 发行版都使用 systemd 代替 initd 来实现系统管理。尽管如此，Linux 仍保留着 initd 的工作方式。另外，在 systemd 中都是以单元来进行管理系统。所以运行级别也不例外，也是被明明为一个个的单元文件。
​
<details open>
<summary>**关于 initd 和 systemd 的 Linux 发行版**</summary>

当前几乎所有的 Linux 发行版都采用 systemd 进行管理系统，但是比较老的 Linux 发行版依然是使用 initd 来管理。

比如 CentOS6 和 Debian7 使用的就是 initd，在这两个发行版之后的版本都采用 systemd 来做系统服务管理（现在 Debian 都已经到 11、CentOS 都到 8 了）。
</details>

## Systemd 管理运行级别

Systemd 内置了许多工具，可用于我们做服务管理的是 `systemctl` 。 `systemctl` 可用于控制服务运行、停止及关系服务运行状态等，当然也可以用于管理系统运行级别了。

`Systemd` 管理系统都是以单元的形式，也就是说 Linux 的每种运行级别都对应着 `Systemd` 的一个单元文件。但实际上 `Systemd` 在运行级别上只有五个单元，对应关系如下：

| 运行级别（Runlevels） | Systemctl 控制单元  |
| :-------------------- | :------------------ |
| 0                     | `poweroff.target` |
| 1                     | `rescue.target` |
| 2                     | `multi-user.target` |
| 3                     | `multi-user.target` |
| 4                     | `multi-user.target` |
| 5                     | `graphical.target` |
| 6                     | `reboot.target` |

也就是说， `Systemd` 单元与 Linux 七种运行级别是一种兼容模式。比如  Runlevel2、Runlevel3、Runlevel4 都对应着 `Systemd` 的 `multi-user.target` 单元，即多用户命令行模式。而 X11 图形界面模式对应着 `Systemd` 的 `graphical.target` ，这点需要注意。
​
:::tip
systemd 本身就是一个服务，如果使用 pstree 命令查看进程树的话你会发现该服务的进程ID 是 1，是所有进程的祖宗。另外，真正可用于服务管理的是 systemd 提供的工具：systemctl。
:::

前面表格列出的是 Linux 运行级别与 systemd 单元文件的对照关系，实际上我们也可以直接使用下面的命令查看：
​

```bash
$ ls -l /usr/lib/systemd/system/runlevel*
## 或
$ ls -l /lib/systemd/system/runlevel*
```

:::tip
`/usr/lib/systemd` 是 systemd 系统服务才有的目录，如果你的发行版使用的不是 systemd 作为系统管理工具可能没有该目录，不过现在基本上所有的 Linux 发行版使用的都是 systemd 作为管理工具，毕竟 initd 已经过时了！
:::

输出示例如下，你会发现 `runlevel[2-4].target` 都指向 `multi-user.target` ：

```log
lrwxrwxrwx 1 root root   15 Jul  8 21:03 /lib/systemd/system/runlevel0.target -> poweroff.target
lrwxrwxrwx 1 root root   13 Jul  8 21:03 /lib/systemd/system/runlevel1.target -> rescue.target
lrwxrwxrwx 1 root root   17 Jul  8 21:03 /lib/systemd/system/runlevel2.target -> multi-user.target
lrwxrwxrwx 1 root root   17 Jul  8 21:03 /lib/systemd/system/runlevel3.target -> multi-user.target
lrwxrwxrwx 1 root root   17 Jul  8 21:03 /lib/systemd/system/runlevel4.target -> multi-user.target
lrwxrwxrwx 1 root root   16 Jul  8 21:03 /lib/systemd/system/runlevel5.target -> graphical.target
lrwxrwxrwx 1 root root   13 Jul  8 21:03 /lib/systemd/system/runlevel6.target -> reboot.target
```

### 使用 systemctl 查看运行级别

既然 systemd 有自己的运行单元了，那么我们查看 “运行级别” 就不要直接使用 `runlevel` 命令了。
​
`systemd` 查看运行级别比较简单，使用下面的命令即可：

```bash
$ systemctl get-default
```

这个命令就会输出自己的运行单元，下面是桌面版 Ubuntu 输出示例：

![systemctl-getdefault-1637547018eANBA9](https://@media/linux-media/SystemManager/runlevels/systemctl-getdefault-1637547018eANBA9.png)

会发现当前系统默认的运行级别对应着 systemd 的 graphical.target 单元，也就是图形界面。

### systemctl 修改运行级别

`systemctl` 修改运行级别直接使用 `set-default` 命令即可，比如我想将当前桌面版 Ubuntu 修改为多用户命令行模式（ `multi-user.target` ），那么直接在命令行中输入如下命令即可（需要超级管理员角色）：

```bash
 $ sudo systemctl set-default multi-user.target
```

除了使用 `systemctl` 命令外我们也可以通过创建软链接的方式设置运行模式：
​

```bash
$ sudo ln -sf /lib/systemd/system/multi-user.target /etc/systemd/system/default.target
```

下面是 Ubuntu 桌面版执行示例：

![systemctl-changeto-multiuser-1637547106uxVfrX](https://@media/linux-media/SystemManager/runlevels/systemctl-changeto-multiuser-1637547106uxVfrX.png)

​
之后重启（ `reboot` ）重新登录就会发现编程了命令行模式了（注意看灰色框标识的命令）：

![systemctl-multiuser-show-1637547120HUymZa](https://@media/linux-media/SystemManager/runlevels/systemctl-multiuser-show-1637547120HUymZa.png)

## initd 管理运行级别

initd 系统管理工具已经被慢慢的淘汰了，目前使用该管理工具的 Linux 发行版都比较老，比如 CentOS6、Debian7 等。

所有使用 initd 作为系统管理的 Linux 发行版在 `/etc` 目录下都会有一个 `inittab` 配置文件即可，修改文件最后一行的 `id:` 配置即可：
​

```properties
# inittab is only used by upstart for the default runlevel.
#
# ADDING OTHER CONFIGURATION HERE WILL HAVE NO EFFECT ON YOUR SYSTEM.
#
# System initialization is started by /etc/init/rcS.conf
#
# Individual runlevels are started by /etc/init/rc.conf
#
# Ctrl-Alt-Delete is handled by /etc/init/control-alt-delete.conf
# Terminal gettys are handled by /etc/init/tty.conf and /etc/init/serial.conf,
# with configuration in /etc/sysconfig/init.
#
# For information on how to write upstart event handlers, or how
# upstart works, see init(5), init(8), and initctl(8).
#
# Default runlevel. The runlevels used are:
# 0 - halt (Do NOT set initdefault to this)
# 1 - Single user mode
# 2 - Multiuser, without NFS (The same as 3, if you do not have networking)
# 3 - Full multiuser mode
# 4 - unused
# 5 - X11
# 6 - reboot (Do NOT set initdefault to this)
#

id:5:initdefault:   <== 注意这里
```

如果想要使用 X11 模式就选择 runlevel5，对应的值为：
​

```
id:5:initdefault:
```

如果想要使用服务器使用的多用户命令行模式就选择 runlevel3 即可：
​

```
id:3:initdefault:
```

最后保存重启就可以了~

## 资源链接

[https://en.wikipedia.org/wiki/Runlevel](https://en.wikipedia.org/wiki/Runlevel)
​
[https://en.wikipedia.org/wiki/Systemd](https://en.wikipedia.org/wiki/Systemd)
​
[https://likegeeks.com/linux-runlevels](https://likegeeks.com/linux-runlevels/)
​
[https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/6/html/installation_guide/s1-boot-init-shutdown-sysv](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/6/html/installation_guide/s1-boot-init-shutdown-sysv)

[https://likegeeks.com/linux-runlevels](https://likegeeks.com/linux-runlevels/)
