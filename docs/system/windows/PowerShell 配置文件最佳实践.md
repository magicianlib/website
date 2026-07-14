## 前言

在 [PowerShell 设置 Alias 命令](./PowerShell%20设置%20Alias%20命令.md) 里，我们把别名和函数都写进了 `$PROFILE` 配置文件。一开始几个命令还好，可一旦配置越积越多——代理开关、JDK 切换、pnpm 全家桶、eza 替换 `ls`、FFmpeg 封装……全部塞进**同一个 `.ps1` 文件**里，很快就会变成一锅粥：既难找、难改，也难复用到别的机器。

这个问题在 Linux 下同样存在，常见做法是把配置拆到 `~/.profile.d/*.sh` 再统一加载（详见 [配置文件正确使用姿势](/system/linux/Shell%20知识/配置文件正确使用姿势)）。PowerShell 也可以照搬这套思路，本文记录一套经过实践检验的组织方式，核心两条原则：

- **主配置文件保持精简**：只放「全局设置」和「加载逻辑」，不写具体命令。
- **具体配置按工具/领域拆分**：每个工具/领域一个 `.ps1` 子文件，由主文件统一加载。

## 一、先定位你的 `$PROFILE`

`$PROFILE` 是自动变量，指向当前用户、当前主机的配置文件。先确认它的路径：

```powershell
echo $PROFILE
```

不同版本位置不同：

- **Windows PowerShell 5.x**：`~\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+**：`~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`

:::info[两个版本的目录是分开的]
注意 `WindowsPowerShell`（5.x）和 `PowerShell`（7+）是**两个不同目录**，互不影响。如果你同时使用两个版本，又希望配置共享，可以在两个 `$PROFILE` 里都写同一套加载逻辑，指向同一个子配置目录；或者干脆只用其中一个版本。本文后续以「5.x + `WindowsPowerShell` 目录」为例，7+ 完全同理。
:::

不存在就用下面命令创建：

```powershell
if (!(Test-Path -Path $PROFILE)) {
    New-Item -Type File -Path $PROFILE -Force
}
```

## 二、整体结构

把配置文件所在目录当成「配置根目录」，在它下面建一个 `ProfileScripts` 子目录存放拆分后的子文件：

```text
~/Documents/WindowsPowerShell/                     # 配置根目录
├── Microsoft.PowerShell_profile.ps1               # 主配置文件（精简）
└── ProfileScripts/                                # 子配置目录（按工具/领域拆分）
    ├── Aliases.ps1                                # 通用别名 / 覆盖内置命令
    ├── Claude.ps1                                 # Claude CLI
    ├── FFmpeg.ps1                                 # FFmpeg / yt-dlp
    ├── Java.ps1                                   # JDK 切换
    ├── Nodejs.ps1                                 # npm/pnpm
    ├── Proxy.ps1                                  # 代理开关
    ├── Rust.ps1                                   # Rust 工具链
    └── Wsl.ps1                                    # WSL 相关
```

每个 `.ps1` 文件只负责一个工具或一个领域，职责单一、互不干扰。

## 三、主配置文件：只做两件事

主文件 `Microsoft.PowerShell_profile.ps1` 不写任何具体命令，只做两件事：**设置全局环境**，以及**加载子目录里的所有 `.ps1`**：

```powershell
# 1) 全局设置：解决中文乱码，统一 UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 让常用命令的输出默认按 UTF-8 写文件（可选）
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 2) 加载逻辑：自动导入子配置目录下所有 .ps1
# 子配置文件存放的目录（即当前配置文件所在目录下的 ProfileScripts 文件夹）
$ProfileDir = Split-Path -Parent $PROFILE
$ConfigDir  = Join-Path $ProfileDir "ProfileScripts"

# 如果目录不存在，就自动创建它
if (!(Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir | Out-Null
}

# 自动遍历并加载该目录下所有的 .ps1 文件
Get-ChildItem -Path $ConfigDir -Filter *.ps1 | ForEach-Object {
    . $_.FullName
}
```

逐行拆解加载逻辑：

- `Split-Path -Parent $PROFILE`：从 `$PROFILE` 完整路径中取**所在目录**（剥掉文件名）。
- `Join-Path $ProfileDir "ProfileScripts"`：用平台正确分隔符拼出子目录完整路径（比手写字符串拼接更稳）。
- `if (!(Test-Path ...))`：目录不存在则自动建，避免新机器上首次启动报错。
- `Get-ChildItem -Filter *.ps1`：列出子目录所有 `.ps1` 文件。
- `. $_.FullName`：`.` 是 **dot-source** 操作符，表示「在**当前作用域**执行该脚本」。这是关键——只有 dot-source，子文件里定义的函数/别名才会进入当前会话、真正生效；如果用 `&`（调用操作符）执行，函数只在子作用域里定义，加载完就没了。

:::tip[为什么用 dot-source `.` 而不是 `&`]
- `. file.ps1`：在**当前作用域**运行，定义的函数、别名、变量都会**保留**到你的会话中。加载配置文件时必须用它。
- `& file.ps1`：在**子作用域**运行，脚本结束其中定义的东西随之消失，适合「跑一次就完事」的脚本。
:::

## 四、子配置文件：按工具/领域拆分

每个子文件都是普通 `.ps1`，内容就是把原先散落在主文件里的命令整块搬过来。举几个有代表性的例子：

**`Proxy.ps1`** —— 代理开关，一组带前缀的快捷命令：

```powershell
function ProxyEnable {
    $env:HTTP_PROXY = "http://127.0.0.1:7897"
    $env:HTTPS_PROXY = "http://127.0.0.1:7897"
    Write-Host "Proxy ON (127.0.0.1:7897)" -ForegroundColor Green
}

function ProxyDisable {
    Remove-Item Env:HTTP_PROXY
    Remove-Item Env:HTTPS_PROXY
    Write-Host "Proxy OFF" -ForegroundColor Red
}
```

**`Java.ps1`** —— JDK 临时切换函数 `UseJdk`（完整实现见 [命令行临时切换 JDK 版本](/java/命令行临时切换%20JDK%20版本)）：

```powershell
# 用法: UseJdk <版本号>  示例: UseJdk 17
function UseJdk {
    param(
        [Parameter(Position = 0)]
        [string]$Version
    )
    # ... 参数校验、路径清理、设置 JAVA_HOME/PATH、打印版本
}
```

**`Nodejs.ps1`** —— npm 到 pnpm 的映射，以及 `pm` 全家桶：

```powershell
# 将 npm 完全映射给 pnpm
function npm {
    pnpm $args
}

# 短别名
Set-Alias -Name pm -Value pnpm

function pm_update      { pnpm update -g; pnpm self-update }
function pm_add_g       { pnpm add -g $args }
function pm_remove_g    { pnpm remove -g $args }
function pm_clear_cache { pnpm store prune /* ... */ }
```

**`Aliases.ps1`** —— 通用别名、以及覆盖系统内置命令（如用 eza 替换 `ls`）：

```powershell
# 先移除系统内置的 ls / tree 别名，否则同名函数不生效
if (Test-Path Alias:ls)   { Remove-Item Alias:ls   -Force }
if (Test-Path Alias:tree) { Remove-Item Alias:tree -Force }

function ls   { eza --icons $args }
function ll   { eza --icons -alhF $args }
function tree { eza -T -L $args }
```

这样组织之后，想找/改某个工具的配置，直接打开对应那一个文件即可，主文件永远干净。

## 五、命名注意事项

配置拆开之后，**命名**就成了可维护性的关键。下面几条是实践中比较重要的约定。

### 5.1 子配置文件：用「工具/领域名」命名

子文件直接以它负责的工具或领域来命名，做到见名知义：

| 文件名 | 负责的内容 |
|:------|:----------|
| `Java.ps1` / `Rust.ps1` / `Nodejs.ps1` | 某一门语言/工具链相关 |
| `FFmpeg.ps1` | FFmpeg、yt-dlp 等音视频工具 |
| `Proxy.ps1` / `Wsl.ps1` | 某个具体功能领域 |
| `Aliases.ps1` | 不属于特定工具的通用别名、覆盖内置命令 |
| `Claude.ps1` | 某个具体 CLI |

约定：**一个工具/领域一个文件**，文件名用工具的「官方名或常见名」，统一 `.ps1` 后缀。

:::tip[文件名大小写]
Windows 文件系统不区分大小写，但建议**文件名首字母大写、统一风格**（`Nodejs.ps1` 而非 `nodejs.ps1`）。一是更醒目，二是将来若同步到大小写敏感的环境（如 Git 仓库、WSL）不会出问题。
:::

### 5.2 函数与别名：选 `snake_case` 还是 `PascalCase`？

PowerShell 内置 cmdlet 一律是 `PascalCase`（`Get-ChildItem`、`Set-Content`）。那么自己写的快捷命令该跟谁？这里有两种常见风格：

- **`snake_case`（带领域前缀）**：如 `proxy_enable`、`wsl_shutdown`、`pm_update`、`rust_chain_update`。
- **`PascalCase`（仿 cmdlet 风格）**：如 `UseJdk`。

**建议**：个人配置文件里的**快捷命令优先用 `snake_case` + 领域前缀**，理由有三：

1. **与系统命令一眼区分**：看到 `pm_update`、`proxy_enable` 这种带下划线的，立刻知道是自定义的，不会和内置 cmdlet 混淆。
2. **前缀天然充当「命名空间」**：`pm_` 前缀的都是 pnpm 家族、`wsl_` 前缀的都是 WSL 家族、`proxy_` 前缀的都是代理开关。即便函数很多，按前缀也能一眼归类，还能避免与其它工具的命令撞名。
3. **简单直接**：自定义快捷命令追求的是「好记好敲」，不必套用「动词-名词」的 cmdlet 规范（那套 `Get-Verb` 规范主要面向要发布成模块、给别人用的 cmdlet）。

而当你**刻意想把某个命令做得像正式 cmdlet**（例如 `UseJdk`，它有完整参数校验、有文档、跨平台复用），用 `PascalCase` 也完全合理。

:::warning[最关键的一条：保持一致]
两种风格都可以，但请**在同一个文件、同一类命令内保持统一**。不要在 `Nodejs.ps1` 里一会儿 `pm_update` 一会儿 `UpdatePm`——风格混乱比选哪种风格更影响可读性。
:::

### 5.3 起名前先查「是否已被占用」

覆盖系统命令（如 `ls`、`tree`）需要先 `Remove-Item Alias:`（原因见 [Alias 文档第六节](./PowerShell%20设置%20Alias%20命令.md#六覆盖系统内置命令)）。除此之外，自定义命令也可能**无意中和某个内置别名/cmdlet 重名**而起不到预期效果。起名前可以先查一下：

```powershell
Get-Alias npm        # 看是否已是别名
Get-Command npm      # 看是否已有同名命令（含别名/函数/cmdlet/可执行文件）
```

养成「带领域前缀」的习惯（上一条），基本就能从源头避开这类冲突。

### 5.4 别名 vs 函数，职责不要错位

回顾一下两者的定位，命名时各归各位：

- **`Set-Alias`**：只用来给「单一命令」起短名，如 `Set-Alias pm pnpm`。
- **`function`**：只要带参数、带逻辑、做转发，就用函数。

不要为了「短」而用别名硬塞带参数的东西（`Set-Alias xxx "cmd arg"` 是错的，详见 [Alias 文档第三节](./PowerShell%20设置%20Alias%20命令.md#三别名的局限不能带任何参数)）。

## 六、加载顺序与排错

**加载顺序**：`Get-ChildItem -Filter *.ps1` 默认按**文件名升序**返回，所以加载顺序是确定的（`Aliases.ps1` → `Claude.ps1` → `FFmpeg.ps1` → …）。

- 如果各文件**互不依赖**（通常如此），顺序无所谓。
- 如果某个文件**依赖**另一个文件里定义的函数或变量，要么把被依赖的文件命名排在前面，要么干脆在主文件里显式按顺序加载，而不用自动遍历。

**排错**：改完配置后，手动重新加载即可看到完整报错：

```powershell
. $PROFILE
```

如果加载报错却不知道是哪个文件出的问题，可以在主文件的加载循环里加一行输出，打印当前正在加载的文件：

```powershell
Get-ChildItem -Path $ConfigDir -Filter *.ps1 | ForEach-Object {
    Write-Host "加载 $($_.Name) ..." -ForegroundColor DarkGray
    . $_.FullName
}
```

:::info[执行策略]
若加载时报「无法加载文件，因为在此系统上禁止运行脚本」，是系统**执行策略**（Execution Policy）限制了脚本运行。以管理员身份执行一次即可放开：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

`RemoteSigned` 允许本地脚本自由运行、从网络下载的脚本则需签名，是个人开发机常用的安全档位。
:::

## 小结

- **主配置文件**只做两件事：设全局环境、dot-source 加载子目录。
- **子配置文件**按工具/领域拆分，一个文件一类配置。
- **命名**上：文件用工具名（首字母大写、统一 `.ps1`）；快捷命令用 `snake_case` + 领域前缀，既好认又防冲突；同一文件内保持一致。

这套结构和 Linux 下的 `~/.profile.d/*.sh` 思路完全一致——都是「主文件做调度、子文件做分工」。一次配好，之后无论增删某个工具的配置，都只需要动对应那一个文件，主文件几乎不用再碰。
