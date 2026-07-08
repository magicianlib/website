## 前言

在日常开发中经常会遇到需要根据进程 PID 查询端口或者根据指定端口查询进程 PID 的需求，下面就来总结一下。

在 Linux 系统上一切皆文件，所以每一个端口、每一个进程其实都是 Linux 上的一个个文件，而我们要查询端口或者进程本质上就是打开一个文件。在 Linux 系统中就有一款工具 `lsof` 就是就是用于打开当前系统上文件，该工具全称是 **list open files**。

在 Linux 环境下，任何事物都以文件的形式存在，通过文件不仅仅可以访问常规数据，还可以访问网络连接和硬件。所以如传输控制协议 (TCP) 和用户数据报协议 (UDP) 套接字等，系统在后台都为该应用程序分配了一个文件描述符，无论这个文件的本质如何，该文件描述符为应用程序与基础操作系统之间的交互提供了通用接口。因为应用程序打开文件的描述符列表提供了大量关于这个应用程序本身的信息，因此通过 `lsof` 工具能够查看这个列表对系统监测以及排错将是很有帮助的。

## 基本使用

在终端下输入 `lsof` 即可显示系统打开的文件，因为 `lsof` 需要访问核心内存和各种文件，所以往往需要以 `root` 用户的身份运行它才能够充分地发挥其功能。

直接输入 `lsof` 部分输出为：

```bash
$ lsof | more -5

COMMAND     PID     USER   FD      TYPE             DEVICE  SIZE/OFF                NODE NAME
loginwind   138 ituknown  cwd       DIR                1,4       640                   2 /
loginwind   138 ituknown  txt       REG                1,4   2672336 1152921500312203572 /System/Library/CoreServices/loginwindow.app/Contents/MacOS/loginwindow
loginwind   138 ituknown  txt       REG                1,4     36508            24528289 /Library/Preferences/Logging/.plist-cache.meviJjSd
loginwind   138 ituknown  txt       REG                1,4     64950            24528495 /private/var/db/analyticsd/events.whitelist
loginwind   138 ituknown  txt       REG                1,4      7496            24530800 /Library/Application Support/CrashReporter/SubmitDiagInfo.domains
loginwind   138 ituknown  txt       REG                1,4    306080 1152921500312376508 /System/Library/LoginPlugins/DisplayServices.loginPlugin/Contents/MacOS/DisplayServices
loginwind   138 ituknown  txt       REG                1,4    196672 1152921500312376559 /System/Library/LoginPlugins/FSDisconnect.loginPlugin/Contents/MacOS/FSDisconnect
loginwind   138 ituknown  txt       REG                1,4    240512            19663561 /private/var/db/timezone/tz/2021a.1.0/icutz/icutz44l.dat
loginwind   138 ituknown  txt       REG                1,4    136152 1152921500312198778 /System/Library/CoreServices/SystemAppearance.bundle/Contents/Resources/SystemAppearance.car
loginwind   138 ituknown  txt       REG                1,4    268144 1152921500312778108 /usr/lib/libobjc-trampolines.dylib
loginwind   138 ituknown  txt       REG                1,4    228968 1152921500312198772 /System/Library/CoreServices/SystemAppearance.bundle/Contents/Resources/FunctionRowAppearance.car
```

**说明：** 由于直接使用 `lsof` 打开的文件过多，所以通过 `more` 命令进行分页查看。这里每行显示一个打开的文件，若不指定条件默认将显示所有进程打开的所有文件。

下面是 lsof 输出各列信息的意义：

|**表头**|**释义**|
|:-------|:------|
|COMMAND|进程名称|
|PID|进程ID|
|PPID|父进程ID（前提要指定 `-R` 参数才能看到该栏）|
|USER|进程所有者|
|FD|文件描述符，应用程序通过文件描述符识别文件|

其他信息也不做过多介绍，有兴趣的话可以使用 `man lsof` 命令进行查看。

下面就来看看 `lsof` 是如何实现网络管理的~

## 列出所有进程信息

使用 `lsof` 工具时使用最多的参数就是 `-nP`，在实际使用中建议都要加上这两个参数：

1. `-n`：列出没有主机的文件
2. `-P`：列出没有端口的文件

使用示例：

```bash
$ lsof -nP

COMMAND     PID     USER   FD      TYPE             DEVICE  SIZE/OFF                NODE NAME
loginwind   138 ituknown  cwd       DIR                1,4       640                   2 /
loginwind   138 ituknown  txt       REG                1,4   2672336 1152921500312203572 /System/Library/CoreServices/loginwindow.app/Contents/MacOS/loginwindow
loginwind   138 ituknown  txt       REG                1,4     36508            24528289 /Library/Preferences/Logging/.plist-cache.meviJjSd
loginwind   138 ituknown  txt       REG                1,4     64950            24528495 /private/var/db/analyticsd/events.whitelist
loginwind   138 ituknown  txt       REG                1,4      7496            24530800 /Library/Application Support/CrashReporter/SubmitDiagInfo.domains
loginwind   138 ituknown  txt       REG                1,4    306080 1152921500312376508 /System/Library/LoginPlugins/DisplayServices.loginPlugin/Contents/MacOS/DisplayServices
loginwind   138 ituknown  txt       REG                1,4    196672 1152921500312376559 /System/Library/LoginPlugins/FSDisconnect.loginPlugin/Contents/MacOS/FSDisconnect
loginwind   138 ituknown  txt       REG                1,4    240512            19663561 /private/var/db/timezone/tz/2021a.1.0/icutz/icutz44l.dat
loginwind   138 ituknown  txt       REG                1,4    136152 1152921500312198778 /System/Library/CoreServices/SystemAppearance.bundle/Contents/Resources/SystemAppearance.car
```

另外，还有一个参数 `-l`，该参数含义是列出用户的 `UID`。看上面的输出示例中 `USER` 栏信息，默认展示的是用户名，如果加上 `-l` 参数输出的就会是用户的 `UID`：

```bash
$ lsof -lnP

COMMAND     PID     USER   FD      TYPE             DEVICE  SIZE/OFF                NODE NAME
loginwind   138      501  cwd       DIR                1,4       640                   2 /
loginwind   138      501  txt       REG                1,4   2672336 1152921500312203572 /System/Library/CoreServices/loginwindow.app/Contents/MacOS/loginwindow
loginwind   138      501  txt       REG                1,4     36508            24528289 /Library/Preferences/Logging/.plist-cache.meviJjSd
loginwind   138      501  txt       REG                1,4     64950            24528495 /private/var/db/analyticsd/events.whitelist
loginwind   138      501  txt       REG                1,4      7496            24530800 /Library/Application Support/CrashReporter/SubmitDiagInfo.domains
loginwind   138      501  txt       REG                1,4    306080 1152921500312376508 /System/Library/LoginPlugins/DisplayServices.loginPlugin/Contents/MacOS/DisplayServices
loginwind   138      501  txt       REG                1,4    196672 1152921500312376559 /System/Library/LoginPlugins/FSDisconnect.loginPlugin/Contents/MacOS/FSDisconnect
loginwind   138      501  txt       REG                1,4    240512            19663561 /private/var/db/timezone/tz/2021a.1.0/icutz/icutz44l.dat
loginwind   138      501  txt       REG                1,4    136152 1152921500312198778 /System/Library/CoreServices/SystemAppearance.bundle/Contents/Resources/SystemAppearance.car
```

## 根据进程查看端口信息

查看指定进程可以使用 `-p` 进行指定进程 `PID`。比如我当前有几个 JAVA 进程：

```bash
$ jps -l

738
31042 org.jetbrains.jps.cmdline.Launcher
31043 com.itumate.docker.DockerWebApplication
27815 org.jetbrains.idea.maven.server.RemoteMavenServer36
28267 org.jetbrains.jps.cmdline.Launcher
718
10034 org.jetbrains.idea.maven.server.RemoteMavenServer36
10035 org.jetbrains.idea.maven.server.RemoteMavenServer36
10036 org.jetbrains.idea.maven.server.RemoteMavenServer36
10037 org.jetbrains.idea.maven.server.RemoteMavenServer36
27291 org.jetbrains.idea.maven.server.RemoteMavenServer36
27292 org.jetbrains.idea.maven.server.RemoteMavenServer36
12029 org.gradle.launcher.daemon.bootstrap.GradleDaemon
32893 sun.tools.jps.Jps
23102 org.jetbrains.idea.maven.server.RemoteMavenServer36
11807 org.jetbrains.idea.maven.server.RemoteMavenServer36
```

我要查看 JAVA 进程 `PID` 为 31043 的占用信息：

```bash
$ lsof -nP -p 31043

COMMAND   PID     USER   FD     TYPE             DEVICE SIZE/OFF                NODE NAME
java    31043 ituknown  cwd      DIR                1,4      256            18515583 /Users/ituknown/JetBrains/Docker/docker-web
java    31043 ituknown  txt      REG                1,4   113360              531910 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/bin/java
java    31043 ituknown  txt      REG                1,4    49480              532093 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/jre/lib/libverify.dylib
java    31043 ituknown  txt      REG                1,4   217140              532059 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/jre/lib/libjava.dylib
java    31043 ituknown  txt      REG                1,4   142140              532054 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/jre/lib/libinstrument.dylib
java    31043 ituknown  txt      REG                1,4    32768            24570955 /private/var/folders/mq/y1gb7qh53rl32lr089tbdrlm0000gn/T/hsperfdata_ituknown/31043
java    31043 ituknown  txt      REG                1,4    36680              532094 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/jre/lib/libzip.dylib
java    31043 ituknown  txt      REG                1,4    36508            24528289 /Library/Preferences/Logging/.plist-cache.meviJjSd
java    31043 ituknown  txt      REG                1,4  3135615              531978 /Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home/jre/lib/charsets.jar
```

另外，还可以继续借助 `grep` 查看所有的 `LISTEN` 连接：

```bash
$ lsof -nP -p 31043 | grep LISTEN

java    31043 ituknown   83u    IPv6 0x3986139a36e6cbf9      0t0                 TCP *:49370 (LISTEN)
java    31043 ituknown   90u    IPv6 0x3986139a36e63bf9      0t0                 TCP *:8080 (LISTEN)
```

**这样我们就实现了通过进程查询对应的网络端口信息了~**

## 根据端口反查进程信息

`lsof` 工具不仅能通过进程查询端口占用信息，而且还能通过端口反查进程占用信息，只需要使用 `-i` 指定端口即可。比如上面的 JAVA 进程中端口是 8080：

```bash
$ lsof -nP -i :8080

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
  x81     1869 ituknown    27u  IPv4 0x3986139a3657d6d1      0t0  TCP 192.168.1.109:64919->121.51.139.161:8080 (ESTABLISHED)
  x81     1869 ituknown    40u  IPv4 0x3986139a3657e0f9      0t0  TCP 192.168.1.109:64920->121.51.139.161:8080 (ESTABLISHED)
  x81     1869 ituknown    50u  IPv4 0x3986139a304e3281      0t0  TCP 192.168.1.109:65023->121.51.139.161:8080 (ESTABLISHED)
java      31043 ituknown   90u  IPv6 0x3986139a36e63bf9      0t0  TCP *:8080 (LISTEN)
```

当然还可以继续借助 `grep` 命令进行过滤 LISTEN 连接的文件信息：

```bash
$ lsof -nP -i :8080 | grep LISTEN

java      31043 ituknown   90u  IPv6 0x3986139a36e63bf9      0t0  TCP *:8080 (LISTEN)
```

## 列出所有进程 PID

`-t` 参数可以列出所有的网络进程 PID，示例：

```bash
$ lsof -nP -t

130
121
...
```

## 查询指定用户进程信息

我们可以使用 `-u` 参数进行指定用户，便于获取该用户的信息，以及它们在系统上正干着的事情，包括它们的网络活动、对文件的操作等。

```bash
$ lsof -nP -u [user]
```

:::tip
[user] 是你需要指定的用户，比如 `mysql`。
:::

### 杀死指定用户的所有进程

直接使用 `kill` 命令将用户进程传递过来即可：

```bash
$ kill -9 `lsof -nP -u [user] -t`
```

:::tip
[user] 是你需要指定的用户，比如 `mysql`。
:::

## 查询网络连接信息

有些人喜欢用 `netstat` 来获取网络连接，但是我更喜欢使用 `lsof` 来进行此项工作。结果以对我来说很直观的方式呈现，我仅仅只需改变我的语法，就可以通过同样的命令来获取更多信息。

`-i` 基本语法如下：

```bash
$ lsof -i [4|6][protocol][@hostname|hostaddr][:service|port]
```

### 指定 IP 协议

[4|6] 表示的是 IPv4 和 IPv6 协议，比如列出机器所有的 IPv4 文件信息：

```bash
$ lsof -nP -i4

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
loginwind   138 ituknown    8u  IPv4 0x3986139a262bd659      0t0  UDP *:*
ControlCe   379 ituknown    3u  IPv4 0x3986139a280d33b9      0t0  UDP *:*
rapportd    388 ituknown    5u  IPv4 0x3986139a304e46d1      0t0  TCP *:64906 (LISTEN)
rapportd    388 ituknown    7u  IPv4 0x3986139a29f2cd89      0t0  UDP *:*
rapportd    388 ituknown    8u  IPv4 0x3986139a28055a99      0t0  UDP *:*
```

同理，也可以仅仅列出 IPv6 文件信息：

```bash
$ lsof -nP -i6

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
rapportd    388 ituknown    6u  IPv6 0x3986139a41e65579      0t0  TCP *:64906 (LISTEN)
corespeec   436 ituknown    4u  IPv6 0x3986139a2d850579      0t0  TCP [fe80:8::aede:48ff:fe00:1122]:64917->[fe80:8::aede:48ff:fe33:4455]:49369 (ESTABLISHED)
idea        738 ituknown    9u  IPv6 0x3986139a25aaa579      0t0  TCP 127.0.0.1:49273->127.0.0.1:51954 (ESTABLISHED)
idea        738 ituknown   32u  IPv6 0x3986139a25ca2f19      0t0  TCP 127.0.0.1:49273->127.0.0.1:51953 (ESTABLISHED)
idea        738 ituknown   52u  IPv6 0x3986139a36e64f19      0t0  TCP 127.0.0.1:49340 (LISTEN)
idea        738 ituknown   62u  IPv6 0x3986139a29fa0f19      0t0  TCP 127.0.0.1:6942 (LISTEN)
```

### 指定传输层协议

[protocol] 指的是传输层 TCP 和 UDP 协议（不区分大小写）

比如仅仅列出所有 TCP 协议文件信息：

```bash
$ lsof -nP -iTCP

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
rapportd    388 ituknown    5u  IPv4 0x3986139a304e46d1      0t0  TCP *:64906 (LISTEN)
rapportd    388 ituknown    6u  IPv6 0x3986139a41e65579      0t0  TCP *:64906 (LISTEN)
rapportd    388 ituknown   13u  IPv4 0x3986139a3cbadfb9      0t0  TCP 192.168.1.109:64906->192.168.1.114:64579 (ESTABLISHED)
cloudd      420 ituknown  139u  IPv4 0x3986139a3ba60b21      0t0  TCP 192.168.1.109:51896->222.73.192.248:443 (ESTABLISHED)
corespeec   436 ituknown    4u  IPv6 0x3986139a2d850579      0t0  TCP [fe80:8::aede:48ff:fe00:1122]:64917->[fe80:8::aede:48ff:fe33:4455]:49369 (ESTABLISHED)
SogouServ   496 ituknown    8u  IPv4 0x3986139a304e1e31      0t0  TCP 192.168.1.109:51985->39.156.167.33:80 (ESTABLISHED)
```

同理，也可以仅仅列出 UDP 协议文件信息：

```bash
$ lsof -nP -iUDP

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
loginwind   138 ituknown    8u  IPv4 0x3986139a262bd659      0t0  UDP *:*
ControlCe   379 ituknown    3u  IPv4 0x3986139a280d33b9      0t0  UDP *:*
rapportd    388 ituknown    7u  IPv4 0x3986139a29f2cd89      0t0  UDP *:*
rapportd    388 ituknown    8u  IPv4 0x3986139a28055a99      0t0  UDP *:*
rapportd    388 ituknown   12u  IPv4 0x3986139a2807eae9      0t0  UDP *:*
rapportd    388 ituknown   14u  IPv4 0x3986139a262bfc89      0t0  UDP *:3722
```

#### 指定传输层连接状态

另外还可以继续使用 `-s` 参数指定传输层连接状态信息，比如仅仅列出 `TCP` 连接状态为 `LISTEN` 文件信息：

```bash
$ lsof -nP -iTCP -sTCP:LISTEN

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
rapportd    388 ituknown    5u  IPv4 0x3986139a304e46d1      0t0  TCP *:64906 (LISTEN)
rapportd    388 ituknown    6u  IPv6 0x3986139a41e65579      0t0  TCP *:64906 (LISTEN)
idea        738 ituknown   52u  IPv6 0x3986139a36e64f19      0t0  TCP 127.0.0.1:49340 (LISTEN)
idea        738 ituknown   62u  IPv6 0x3986139a29fa0f19      0t0  TCP 127.0.0.1:6942 (LISTEN)
idea        738 ituknown   98u  IPv6 0x3986139a36b9ef19      0t0  TCP 127.0.0.1:61382 (LISTEN)
idea        738 ituknown  101u  IPv6 0x3986139a25ca1bf9      0t0  TCP 127.0.0.1:61290 (LISTEN)
idea        738 ituknown  482u  IPv6 0x3986139a29fa08b9      0t0  TCP 127.0.0.1:49366 (LISTEN)
```

或者仅仅列出闲置(`Idle`) 的 UDP 文件信息：

```bash
$ lsof -nP -iUDP -sUDP:Idle
```

`TCP` 的连接状态包括：`CLOSED`、`IDLE`、`BOUND`、`LISTEN`、`ESTABLISHED`、`SYN_SENT`、`SYN_RCDV`、`ESTABLISHED`、`CLOSE_WAIT`、`FIN_WAIT1`、`CLOSING`、`LAST_ACK`、`FIN_WAIT_2` 以及 `TIME_WAIT`。

`UDP` 的话基本上就 `Unbound` 和 `Idle` 两个状态。

### 指定端口

[port] 是指定网络端口的意思，这个在前面的 [根据端口反查进程信息](#根据端口反查进程信息) 已经做过了说明，这里不再赘述。

基本使用如下：

```bash
$ lsof -nP -i :8080

COMMAND     PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
  x81     1869 ituknown    27u  IPv4 0x3986139a3657d6d1      0t0  TCP 192.168.1.109:64919->121.51.139.161:8080 (ESTABLISHED)
  x81     1869 ituknown    40u  IPv4 0x3986139a3657e0f9      0t0  TCP 192.168.1.109:64920->121.51.139.161:8080 (ESTABLISHED)
  x81     1869 ituknown    50u  IPv4 0x3986139a304e3281      0t0  TCP 192.168.1.109:65023->121.51.139.161:8080 (ESTABLISHED)
java      31043 ituknown   90u  IPv6 0x3986139a36e63bf9      0t0  TCP *:8080 (LISTEN)
```

### 指定主机

[@hostname|hostaddr] 是指定主机名的意思，基本使用示例：

```bash
$ lsof -nP -i@127.0.0.1
```

另外还可以加上端口进行指定主机和端口的连接，如下：

```bash
$ lsof -nP -i@127.0.0.1:8080
```

--

上面介绍的就是 `lsof` 工具的主要用法，基本上就满足我们日常开发工作的需要了，剩下的呢就不再过介绍了，感兴趣的可以使用 `man` 命令查阅或者直接面向 Google 编程~

## 快捷脚本

```bash
# ── 配色说明 ──────────────────────────────────────────────────────
# 现代极简风：图标 + 语义色文字标签，去掉色块（参考 cargo / npm / Vite）。
# 24-bit 真彩色，低饱和、语义化：
#   · 柔和红  #E5484D → ✘ Error
#   · 静谧蓝  #3E63DD → ℹ Usage
#   · 琥珀色  #F5A524 → 命令高亮
_proc_usage() {
    local RED='\033[1;38;2;229;72;77m'
    local BLUE='\033[1;38;2;62;99;221m'
    local AMBER='\033[38;2;245;165;36m'
    local NC='\033[0m'
    echo -e "\n${RED}✘ Error${NC}  请输入$2"
    echo -e "${BLUE}ℹ Usage${NC}  ${AMBER}$1${NC}\n"
}

# 通过 PID 查看监听状态
lsof_by_pid() {
    [ -z "$1" ] && { _proc_usage "lsof_by_pid <PID>" "进程 ID (PID)"; return 1; }
    lsof -nP -p "$1" | grep -E "COMMAND|LISTEN"
}

# 通过端口号查看监听状态
lsof_by_port() {
    [ -z "$1" ] && { _proc_usage "lsof_by_port <PORT>" "端口号 (PORT)"; return 1; }
    lsof -nP -i :"$1" | grep -E "COMMAND|LISTEN"
}
```

使用示例：

```bash
$ lsof_by_pid

✘ Error  请输入进程 ID (PID)
ℹ Usage  lsof_by_pid <PID>

$ lsof_by_pid 69465
COMMAND   PID     USER   FD      TYPE             DEVICE SIZE/OFF                NODE NAME
java    69465 ituknown  217u     IPv6 0xba1e4f6ab901bd4f      0t0                 TCP *:50320 (LISTEN)
java    69465 ituknown  366u     IPv6 0xba1e4f6ab89a2d4f      0t0                 TCP *:60661 (LISTEN)
java    69465 ituknown  420u     IPv6 0xba1e4f6ab901554f      0t0                 TCP *:8319 (LISTEN)
```