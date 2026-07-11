---
slug: 命令行切换代理
title: 命令行切换代理（Bash 与 PowerShell）
date: 2026-06-25T20:30
tags: [代理]
---

命令行工具（`curl`、`wget`、`git` 等）走代理靠的是一组环境变量：`http_proxy` / `https_proxy` / `all_proxy`。手动 `export` 一次只管当前会话，端口一变就得重敲，关代理又得逐个 `unset`，繁琐还容易漏。

把开关封装成一对函数写进 shell 配置文件，启动即常驻，敲一个命令完成切换。Bash 与 PowerShell 各一份对称实现，共同点三个：默认端口集中在顶部、大小写变量都设、开启后立即验证连通性并在失败时自动回滚。

<!-- truncate -->

## 设计要点

**默认端口集中配置。** 端口写在脚本顶部的 `GLOBAL_DEFAULT_PROXY_PORT` 变量里，换端口只改这一处，所有调用点自动生效，避免硬编码散落各处。

**大小写变量都设。** `http_proxy` 和 `HTTP_PROXY` 同时 `export`。不同工具读取的变量名并不统一：`curl`、`wget` 读小写，而 .NET、Go 的部分 HTTP 客户端读大写。两套都设上，覆盖面最广。

**`all_proxy` 用 socks5。** `http_proxy` / `https_proxy` 走 HTTP 代理，`all_proxy` 额外指定 socks5 入口，给那些支持 socks 的工具使用。

**开启即验证，失败自动回滚。** `enable` 后立即请求一次 Google，3 秒超时。拿不到 200 就说明代理没通（端口写错、代理软件没开等），此时自动调用 `disable` 清理变量——否则环境里留着一组指向不通地址的代理变量，后续所有命令都会卡在连接超时上，排查很费时间。

## Bash 实现

```bash
# ================= 配置区 =================
# 修改常用默认端口，改一次全局生效
GLOBAL_DEFAULT_PROXY_PORT="7897"
# ==========================================

# 关闭代理
proxy_disable() {
    # 同时卸载小写和大写的代理变量
    unset http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
    echo -e "\033[33m❌ 代理已关闭\033[0m"
}

# 开启代理
# 用法: proxy_enable [端口号]
proxy_enable() {
    # 未指定端口时提示用法
    if [ -z "$1" ]; then
        echo -e "\033[90m💡 提示命令用法: proxy_enable <端口号>\033[0m"
        echo -e "\033[36m🔄 检测到未指定端口，将使用默认端口: ${GLOBAL_DEFAULT_PROXY_PORT}\033[0m"
    fi

    # $1 为空则回退到全局默认端口
    local port=${1:-$GLOBAL_DEFAULT_PROXY_PORT}

    # 设置代理变量（兼顾大小写）
    export http_proxy="http://127.0.0.1:${port}"
    export https_proxy="http://127.0.0.1:${port}"
    export all_proxy="socks5://127.0.0.1:${port}"

    export HTTP_PROXY="http://127.0.0.1:${port}"
    export HTTPS_PROXY="http://127.0.0.1:${port}"
    export ALL_PROXY="socks5://127.0.0.1:${port}"

    echo -e "\033[36m🚀 代理变量已设置 (端口: ${port})，正在验证网络...\033[0m"

    # 验证是否生效，3 秒超时
    local status_code=$(curl -I -s --connect-timeout 3 -w "%{http_code}" https://www.google.com -o /dev/null)

    if [ "$status_code" = "200" ]; then
        echo -e "\033[32m✅ 代理连接成功！Google 响应正常。\033[0m"
    else
        echo -e "\033[31m❌ 代理连接失败 (状态码: ${status_code:-超时/无法连接})\033[0m"
        echo -e "\033[33m🔄 正在自动清理代理环境变量...\033[0m"
        proxy_disable
        return 2
    fi
}
```

几个细节：

- `[ -z "$1" ]` 判断是否传了端口，没传就提示用法；`${1:-$GLOBAL_DEFAULT_PROXY_PORT}` 是参数默认值语法，`$1` 为空时回退到全局默认端口。
- `unset` 一次性卸载大小写共六个变量。
- `curl -I -s --connect-timeout 3 -w "%{http_code}" -o /dev/null`：只取响应头、静默、3 秒连接超时、末尾打印 HTTP 状态码、正文丢弃。拿到 `200` 即通。
- 失败分支先 `proxy_disable` 清理变量，再 `return 2`，用非零返回值标记失败，方便在脚本里判断。

### WSL：宿主机地址不是 127.0.0.1

WSL2 默认走独立的 NAT 网络，`127.0.0.1` 指向 WSL 自身而非 Windows 宿主机，直接连 `127.0.0.1:7897` 连不到宿主机上的代理。宿主机 IP 记在 `/etc/resolv.conf` 的 `nameserver` 一行里：

```bash
grep nameserver /etc/resolv.conf | awk '{print $2}'
```

要让上面的 `proxy_enable` 在 WSL 下也直接可用，在解析端口后加一段 host 判断：非 WSL 用 `127.0.0.1`，WSL 用宿主机 IP。`/proc/version` 里带 `microsoft` 字样即可识别 WSL：

```bash
proxy_enable() {
    if [ -z "$1" ]; then
        echo -e "\033[90m💡 提示命令用法: proxy_enable <端口号>\033[0m"
        echo -e "\033[36m🔄 检测到未指定端口，将使用默认端口: ${GLOBAL_DEFAULT_PROXY_PORT}\033[0m"
    fi

    local port=${1:-$GLOBAL_DEFAULT_PROXY_PORT}

    # ↓↓↓ 新增：WSL 下用宿主机 IP，否则 127.0.0.1 连不到宿主机代理
    local host="127.0.0.1"
    if grep -qi microsoft /proc/version 2>/dev/null; then
        host=$(grep nameserver /etc/resolv.conf | awk '{print $2}')
        echo -e "\033[36m🌐 检测到 WSL，使用宿主机 IP: ${host}\033[0m"
    fi
    # ↑↑↑

    # 6 个 export 把原来的 127.0.0.1 全部换成 ${host}
    export http_proxy="http://${host}:${port}"
    export https_proxy="http://${host}:${port}"
    export all_proxy="socks5://${host}:${port}"
    export HTTP_PROXY="http://${host}:${port}"
    export HTTPS_PROXY="http://${host}:${port}"
    export ALL_PROXY="socks5://${host}:${port}"

    echo -e "\033[36m🚀 代理变量已设置 (${host}:${port})，正在验证网络...\033[0m"

    # 后续验证、回滚逻辑不变……
}
```

改动只有两处：插入一段 `host` 变量判断，再把 6 个 `export` 里的 `127.0.0.1` 换成 `${host}`。`proxy_disable` 不用动。Windows 侧代理软件还需开启「允许局域网连接（Allow LAN）」，否则宿主机会拒绝来自 WSL 网段的请求。

### 换 mirrored 模式：127.0.0.1 直接可用

不想改脚本的话，切到 WSL2 的 mirrored 网络模式更省事——该模式下 WSL 与宿主机共享网卡，`localhost` 互通，`127.0.0.1` 直接连到宿主机代理，上面的 host 判断也就不必加。前提是 **Windows 11 22H2 及以上**（Win10 不支持）。

在 Windows 用户目录（`%USERPROFILE%`）下新建 `.wslconfig`，写入：

```ini
[wsl2]
networkingMode=mirrored
```

保存后执行 `wsl --shutdown` 关掉再重开 WSL 即可生效。

## PowerShell 实现

```powershell
# ================= 配置区 =================
# 修改常用默认端口，改一次全局生效
$GLOBAL_DEFAULT_PROXY_PORT = "7897"
# ==========================================

# 关闭代理
function ProxyDisable {
    # 移除小写和大写的代理环境变量（不存在时静默忽略）
    Remove-Item env:http_proxy, env:https_proxy, env:all_proxy, env:HTTP_PROXY, env:HTTPS_PROXY, env:ALL_PROXY -ErrorAction SilentlyContinue
    Write-Host "❌ 代理已关闭" -ForegroundColor Yellow
}

# 开启代理
# 用法: ProxyEnable [端口号]
function ProxyEnable {
    param (
        [string]$Port = $GLOBAL_DEFAULT_PROXY_PORT
    )

    # 仅在用户未显式传参时提示用法
    if ($PSBoundParameters.Count -eq 0) {
        Write-Host "💡 提示命令用法: ProxyEnable <端口号>" -ForegroundColor Gray
        Write-Host "🔄 检测到未指定端口，将使用默认端口: $GLOBAL_DEFAULT_PROXY_PORT" -ForegroundColor Cyan
    }

    # 设置代理变量（兼顾大小写）
    $env:http_proxy = "http://127.0.0.1:$Port"
    $env:https_proxy = "http://127.0.0.1:$Port"
    $env:all_proxy = "socks5://127.0.0.1:$Port"

    $env:HTTP_PROXY = "http://127.0.0.1:$Port"
    $env:HTTPS_PROXY = "http://127.0.0.1:$Port"
    $env:ALL_PROXY = "socks5://127.0.0.1:$Port"

    Write-Host "🚀 代理变量已设置 (端口: $Port)，正在验证网络..." -ForegroundColor Cyan

    # 验证是否生效，3 秒超时
    try {
        $response = Invoke-WebRequest -Uri "https://www.google.com" -TimeoutSec 3 -Method Head -ErrorAction Stop
        $statusCode = $response.StatusCode
    }
    catch {
        $statusCode = "超时或无法连接"
    }

    if ($statusCode -eq 200) {
        Write-Host "✅ 代理连接成功！Google 响应正常。" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 代理连接失败 (状态: $statusCode)" -ForegroundColor Red
        Write-Host "🔄 正在自动清理代理环境变量..." -ForegroundColor Yellow
        ProxyDisable
    }
}
```

几个细节：

- `param([string]$Port = $GLOBAL_DEFAULT_PROXY_PORT)` 给参数带默认值，不传也能跑。但「不传」和「传了一个等于默认值的参数」在 PowerShell 里是两回事——前者 `$PSBoundParameters`（实际绑定的参数字典）为空，后者非空。这里用 `$PSBoundParameters.Count -eq 0` 精确区分，只在用户真的没传时才打印用法提示。
- `Remove-Item env:xxx -ErrorAction SilentlyContinue`：卸载变量时若某个变量本就不存在会报错，加 `SilentlyContinue` 静默忽略。
- 验证用 `Invoke-WebRequest -Method Head -TimeoutSec 3`。和 Bash 不同，PowerShell 里连接超时或请求失败是**抛异常**而非返回状态码，所以必须用 `try/catch` 接住，在 `catch` 里把状态记为失败，再走清理逻辑。

## 加载到配置文件

函数定义只有被 shell 启动时加载进会话，才能随时敲 `proxy_enable` / `ProxyEnable` 调用。两个脚本各自走自己平台的配置加载机制。

Bash 侧，把 `proxy.sh` 放进 `~/.profile.d/`，由 `~/.profile`（或 `.bashrc` / `.zshrc`）统一遍历加载：

```bash
if [ -d ~/.profile.d ]; then
  for f in ~/.profile.d/*.sh; do
    [ -r "$f" ] && . "$f"
  done
  unset f
fi
```

具体的拆分思路与加载方式见 [配置文件正确使用姿势](/system/linux/Shell%20知识/配置文件正确使用姿势)。

PowerShell 侧，把 `Proxy.ps1` 放进 `$PROFILE` 同目录下的 `ProfileScripts/`，由主配置文件 dot-source 加载：

```powershell
$ConfigDir = Join-Path (Split-Path -Parent $PROFILE) "ProfileScripts"
Get-ChildItem -Path $ConfigDir -Filter *.ps1 | ForEach-Object { . $_.FullName }
```

完整结构与 dot-source 的作用见 [PowerShell 配置文件最佳实践](/system/windows/PowerShell%20配置文件最佳实践)。

## 使用

```bash
# Bash
proxy_enable            # 开启，用默认端口 7897
proxy_enable 10808      # 开启，指定端口
proxy_disable           # 关闭
```

```powershell
# PowerShell
ProxyEnable             # 开启，用默认端口 7897
ProxyEnable 10808       # 开启，指定端口
ProxyDisable            # 关闭
```

开启时会打印当前端口并自动验证；代理不通则立即回滚并给出失败状态码。代理变量的含义以及 `no_proxy` 等其它相关变量，见 [Linux 命令行设置代理](/system/linux/网络设置/Linux%20命令行设置代理)。
