## 下载安装

首先在 VMware 官网页面下载 VMware Workstation Linux 版虚拟机，下载地址是：[https://www.vmware.com/products/workstation-pro/workstation-pro-evaluation.html](https://www.vmware.com/products/workstation-pro/workstation-pro-evaluation.html)。

当前最新版本是 16，官网界面如下：

![vmware-official-16445474351SIyF2](https://@media/linux-media/VirtualMachine/VMware/vmware-official-16445474351SIyF2.png)

将软件包下载后任意目录下，比如我放在当前用户目录下的 VMware 目录下：

```bash
$ ls ~/VMware
VMware-Workstation-Full-16.2.1-18811642.x86_64.bundle
```

VMware 官网提供的 Linux 安装版是一个 `.bundle` 文件，也就是将所有需要的运行环境统统打在这一个包里面了。我们只需要给该文件一个可执行权限就可以运行了：

$1.$ 添加可执行权限（默认是所属用户）：

```bash
sudo +x VMware-Workstation-Full-16.2.1-18811642.x86_64.bundle
```

$2.$ 安装并运行：

```bash
sudo ./VMware-Workstation-Full-16.2.1-18811642.x86_64.bundle
```

当这个命令执行完成后就表示安装成功了！你使用 `Windows + A` 组合键盘就可以搜索到 VMware 相关软件了，示例如下：

![vm-install-done-16445475393KyDbk](https://@media/linux-media/VirtualMachine/VMware/vm-install-done-16445475393KyDbk.png)

## Before you can run VMware, several modules must be compiled and loaded into the running kernel?

第一次运行 VMware 时可能会遇到 VMware Kernel Module Updater的错误：

「VMware Kernel Module Updater
Before you can run VMware, several modules must be compiled and loaded into the running kernel.」

截图如下：

![faq-vmware-kernel-module-updater-1644646722bjpQXWdg](https://@media/linux-media/VirtualMachine/VMware/faq-vmware-kernel-module-updater-1644646722bjpQXWdg.png)

解决方式很简单，只需要淡定的关闭窗口，然后在命令终端执行如下命令：

```bash
sudo apt-get update
sudo apt-get install g++
sudo apt-get install build-essential linux-headers-$(uname -r)
```

命令正常执行后重新打开 VMware，此时还会有 VMware Kernel Module Updater 提示。我们只需要继续点击安装编译即可：

![vmware-kernel-mudule-update-install-1644647072n0piQ0Va](https://@media/linux-media/VirtualMachine/VMware/vmware-kernel-mudule-update-install-1644647072n0piQ0Va.png)

然后静待编译完成就好了：

![vmware-kernel-mudule-update-compiling-1644647353yNpEJPoG](https://@media/linux-media/VirtualMachine/VMware/vmware-kernel-mudule-update-compiling-1644647353yNpEJPoG.png)

## Could not open /dev/vmmon: No such file or directory？

我使用的是 Ubuntu 20.04LTS 发行版，当我创建一个虚拟机准备运行时时却给我一个错误的弹窗提示：

![create-debian-vm-16445476404CUKn6](https://@media/linux-media/VirtualMachine/VMware/create-debian-vm-16445476404CUKn6.png)

点击 **Start up this guest operating system** 后提示：

![faq-vmmon-is-loaded-1644547714RLrBjn](https://@media/linux-media/VirtualMachine/VMware/faq-vmmon-is-loaded-1644547714RLrBjn.png)

弹窗的内容是：

| Could not open /dev/vmmon: No such file or directory. Please make sure that the kernel module `vmmon' is loaded |
| :--- |

于是我试着在 [Askubuntu](https://askubuntu.com/) 上尝试搜索解决办法，没想到还真有人提这个问题，并且有一个解决方案。

在 askubuntu 上提出的问题是：[VMWare 15 Error on Ubuntu 18.4 - Could not open /dev/vmmon: No such file or directory](https://askubuntu.com/questions/1096052/vmware-15-error-on-ubuntu-18-4-could-not-open-dev-vmmon-no-such-file-or-dire)

链接是：[https://askubuntu.com/questions/1096052/vmware-15-error-on-ubuntu-18-4-could-not-open-dev-vmmon-no-such-file-or-dire](https://askubuntu.com/questions/1096052/vmware-15-error-on-ubuntu-18-4-could-not-open-dev-vmmon-no-such-file-or-dire)

所以接下来的内容非原创，而是 askubuntu 上大佬们回答的解决方案，我只是摘抄下来简单的翻译下：

### Askubuntu Answers

这个问题的发生本质上是因为安全启动不允许内核模块在没有使用受信任证书进行数字签名的情况下加载。 所以我们需要创建一个可信的密钥，并用它来对新编译的模块 `vmmon` 和 `vmnet` 进行签名。

:::tip
题主使用的是 Ubuntu18.04 & VMWare 15，不过我按照他的回答在 Ubuntu20.04 & VMWare 16 上也是通过的，所以可以放心食用~
:::

接下来是具体步骤：

**1）首先运行下面的命令：**

```bash
sudo vmware-modconfig --console --install-all
```

这个命令运行完成后你会看到提示说 **显示器** 和 **网络** 有问题，淡定！接着往下走。

**2）使用 openssl 生成一个 KEY：**

```bash
openssl req -new -x509 -newkey rsa:2048 -keyout VMWARE16.priv -outform DER -out VMWARE16.der -nodes -days 36500 -subj "/CN=VMWARE/"
```

**注意：** 上面命令执行完成后会在当前目录下生成两个文件（ `VMWARE16.priv` 和 `VMWARE16.der` ），这两个文件名是随意指定的。

**3）然后使用我们刚刚生成的密钥对 Linux 的两个内核模块进行签名：**

```bash
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./VMWARE16.priv ./VMWARE16.der $(sudo modinfo -n vmmon)
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./VMWARE16.priv ./VMWARE16.der $(sudo modinfo -n vmnet)
```

同样的，这个命令使用的 `VMWARE16.priv` 和 `VMWARE16.der` 文件是你在上一步生成的，如果你在上一步修改了文件名这里也要做相应的修改，不要做拿来主义！

**4）检查签名是否正确：**

```bash
tail $(sudo modinfo -n vmmon) | grep "Module signature appended"
```

不出意外地话你会得到一个提示： `Binary file (standard input) matches` 。

**5）现在，我们通过使用下面的命令将其导入机器所有者密钥 (MOK) 管理系统来使该密钥受信任。**

有关 MOK 在 Linux 中的详细信息可以查看：[What exactly is MOK in Linux for?](https://unix.stackexchange.com/questions/535434/what-exactly-is-mok-in-linux-for)

```bash
sudo mokutil --import VMWARE16.der
```

还是那句话， `VMWARE16.der` 是你之前生成的文件！

一定要注意：这个命令指定完成后会提示你输入密码，这个密码就是你生成的文件使用的密码，需要连续输入两边。**这个密码很重要，之后需要使用**！！！

**6）重点来了！**

重启机器，在重启时你应该会进入一个蓝屏界面，在这个界面会有四个选项（如下图）。选择第二个 **Enroll MOK**，然后按照提示输入你在第五步时设置的密码！千万别整错了，这个蓝屏界面只会出现这一次，如果整错了那你只能重新执行上面的操作了。

![restart-enroll-mok-1644547762PwL3Kn](https://@media/linux-media/VirtualMachine/VMware/restart-enroll-mok-1644547762PwL3Kn.png)

**7）测试模块**

重启后我们可以使用下面的命令测试下驱动模块是否正常（注意 `VMWARE16.der` 文件名）：

```bash
mokutil --test-key VMWARE16.der
```

如果一切都 OK 你会得到类似这样是输出： `VMWARE16.der is already enrolled` ！

之后 VMware 就能正常使用了~

--

[https://askubuntu.com/questions/1096052/vmware-15-error-on-ubuntu-18-4-could-not-open-dev-vmmon-no-such-file-or-dire](https://askubuntu.com/questions/1096052/vmware-15-error-on-ubuntu-18-4-could-not-open-dev-vmmon-no-such-file-or-dire)

[https://unix.stackexchange.com/questions/535434/what-exactly-is-mok-in-linux-for](https://unix.stackexchange.com/questions/535434/what-exactly-is-mok-in-linux-for)
