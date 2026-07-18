## 前言

在日常 Java 开发中，我们经常需要在多个 JDK 版本之间切换：旧项目可能还在使用 Java 8，新项目可能已经用上了 Java 21，而有些组件源码构建又必须用特定版本来编译。

切换 JDK 版本通常有两种思路：

- **永久切换**：直接修改 `~/.zshrc` 或 `~/.bashrc` 中的 `JAVA_HOME` 并 `source` 生效，会影响之后所有新开的终端窗口。适合需要长期固定某个版本的场景，但每次切换都要改文件，而且无法在不同终端窗口里同时使用不同版本。
- **临时切换**：只在**当前终端会话**里把 `JAVA_HOME` / `PATH` 改成目标版本，关闭终端即自动恢复默认版本，互不影响其它窗口。适合同时跑多个不同版本项目、或只是临时编译某个组件的场景。

本文介绍的 Shell 函数 `usejdk` 就是用于**命令行临时切换** JDK 版本的方案，主要特性：

- **零依赖**：仅需 Bash/Zsh 或 PowerShell，不依赖 jenv、SDKMAN 等第三方工具。
- **临时生效**：仅作用于当前 Shell 会话，关闭终端或新开窗口自动恢复默认版本，多个终端窗口可同时使用不同 JDK 版本，互不影响。
- **路径干净**：自动清理 `PATH` 中旧的 JDK 路径，不会随着切换次数无限叠加。
- **即切即验**：切换完成后自动打印版本信息，一眼确认是否切换成功。

:::tip[适用范围]
本文以 macOS 下**手动解压**到 `/usr/local/openjdk/` 目录的方式为例（例如下载 Eclipse Temurin / Zulu / Oracle 等发行版的 `.tar.gz` 包后解压）。若你使用 Homebrew、SDKMAN 等方式安装，只需将下文 `target_home` 替换为对应路径即可，函数本身逻辑完全通用。
:::

## 配置

本文提供两套实现，按平台选用其一：

- **Linux / macOS**：使用 Bash/Zsh 的 `usejdk` 函数
- **Windows**：使用 PowerShell 的 `UseJdk` 函数

两者逻辑完全一致，仅环境变量语法、PATH 分隔符等平台细节不同。

### Linux / macOS（Bash/Zsh）

将下面的函数添加到你的 Shell 配置文件中：

- **Zsh（macOS 默认）**：`~/.zshrc`
- **Bash（Linux 默认）**：`~/.bashrc` 或 `~/.bash_profile`

```shell
# 命令行临时切换 JDK 版本（仅对当前终端会话生效）
# 用法: usejdk <版本号>
# 示例: usejdk 17
usejdk() {
    # 参数校验：未传入版本号时给出提示并退出
    if [ -z "$1" ]; then
        echo "用法: usejdk <版本号>"
        echo "示例: usejdk 17"
        return 1
    fi

    # 要切换到的 JDK 主版本号（如 8、11、17、21）
    local version=$1

    # 目标 JDK 的 JAVA_HOME 路径
    # 请根据自己机器上的实际安装目录调整
    local target_home="/usr/local/openjdk/jdk${version}/Contents/Home"

    # 检查目标路径是否存在，避免设置一个不存在的 JAVA_HOME
    if [ ! -d "$target_home" ]; then
        echo "❌ 错误: 未找到 JDK ${version}，路径不存在:"
        echo "   $target_home"
        echo ""
        echo "💡 提示: 请确认对应版本已安装，或修改 usejdk 中的 target_home 路径"
        return 1
    fi

    # 清理 PATH 中可能残留的旧 JDK 路径，防止多次切换后路径无限叠加
    #   sed 处理两类情况：
    #     a) 路径出现在中间（前面有冒号）：  :/usr/local/openjdk/.../bin
    #     b) 路径出现在开头（前面无冒号）：  /usr/local/openjdk/.../bin:
    export PATH=$(echo "$PATH" | sed -E \
        -e 's|:/usr/local/openjdk/[^:]+/bin||g' \
        -e 's|^/usr/local/openjdk/[^:]+/bin:?||g')

    # 设置新的 JAVA_HOME
    export JAVA_HOME="$target_home"

    # 将新版本的 bin 目录前置到 PATH，确保优先级最高
    export PATH="$JAVA_HOME/bin:$PATH"

    # 切换完成后打印提示，并输出当前 JDK 详细版本信息
    echo "✅ 已切换到 JDK ${version}"
    echo "   JAVA_HOME = $JAVA_HOME"
    echo ""
    java -XshowSettings:vm -version
}
```

配置完成后，让修改生效：

```shell
$ source ~/.zshrc      # Zsh
# 或
$ source ~/.bashrc     # Bash
```

### Windows（PowerShell）

将下面的函数添加到你的 PowerShell 配置文件中：

- **PowerShell 7**：`~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
- **Windows PowerShell 5**：`~\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`

可用 `notepad $PROFILE` 直接打开配置文件进行编辑（文件不存在时 Notepad 会提示新建）；用 `echo $PROFILE` 可查看其完整路径。

```powershell
# 命令行临时切换 JDK 版本（仅对当前 PowerShell 会话生效）
# 用法: UseJdk <版本号>
# 示例: UseJdk 17
function UseJdk {
    param(
        [Parameter(Position = 0)]
        [string]$Version
    )

    # 参数校验：未传入版本号时给出提示并退出
    if ([string]::IsNullOrWhiteSpace($Version)) {
        Write-Host "用法: UseJdk <版本号>"
        Write-Host "示例: UseJdk 17"
        return
    }

    # 目标 JDK 的 JAVA_HOME 路径
    # 请根据自己机器上的实际安装目录调整
    $targetHome = "D:\Java\jdk$Version"

    # 检查目标路径是否存在，避免设置一个不存在的 JAVA_HOME
    if (-not (Test-Path $targetHome)) {
        Write-Host "❌ 错误: 未找到 JDK $Version，路径不存在:"
        Write-Host "   $targetHome"
        Write-Host ""
        Write-Host "💡 提示: 请确认对应版本已安装，或修改 UseJdk 中的 targetHome 路径"
        return
    }

    # 清理 PATH 中可能残留的旧 JDK bin 路径，防止多次切换后路径无限叠加
    # 思路：按分号拆开 PATH，过滤掉指向「任意 jdk<数字>\bin」的目录
    $paths = $env:PATH -split ';' | Where-Object {
        $_ -and $_ -notmatch '\\Java\\jdk\d+\\bin$'
    }
    $env:PATH = ($paths -join ';')

    # 设置新的 JAVA_HOME
    $env:JAVA_HOME = $targetHome

    # 将新版本的 bin 目录前置到 PATH，确保优先级最高
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

    # 切换完成后打印提示，并输出当前 JDK 详细版本信息
    Write-Host "✅ 已切换到 JDK $Version"
    Write-Host "   JAVA_HOME = $env:JAVA_HOME"
    Write-Host ""
    java -XshowSettings:vm -version
}
```

配置完成后，让修改生效：

```powershell
$ . $PROFILE       # 重新加载配置文件
```

:::tip[与 Bash/Zsh 版的差异]
PowerShell 版与 Bash/Zsh 版逻辑完全一致，仅有平台相关的差异：环境变量用 `$env:VAR`（同样仅作用于当前会话）、PATH 以分号 `;` 分隔、路径分隔符为反斜杠 `\`、清理旧路径用 `-split ';'` 配合 `Where-Object` 过滤替代 `sed`。
:::

## 使用示例

在任意终端窗口中执行 `usejdk <版本号>`，即可临时切换到该版本（仅对当前终端会话生效）：

```shell
$ usejdk 17
✅ 已切换到 JDK 17
   JAVA_HOME = /usr/local/openjdk/jdk17/Contents/Home

VM settings:
    Max. Heap Size (Estimated): 4.00G
    Using VM: OpenJDK 64-Bit Server VM

openjdk version "17.0.19" 2026-04-21
OpenJDK Runtime Environment Temurin-17.0.19+10 (build 17.0.19+10)
OpenJDK 64-Bit Server VM Temurin-17.0.19+10 (build 17.0.19+10, mixed mode)

$ usejdk 21
✅ 已切换到 JDK 21
   JAVA_HOME = /usr/local/openjdk/jdk21/Contents/Home

VM settings:
    Max. Heap Size (Estimated): 4.00G
    Using VM: OpenJDK 64-Bit Server VM

openjdk version "21.0.11" 2026-04-21 LTS
OpenJDK Runtime Environment Temurin-21.0.11+10 (build 21.0.11+10-LTS)
OpenJDK 64-Bit Server VM Temurin-21.0.11+10 (build 21.0.11+10-LTS, mixed mode)
```

:::info[作用域说明]
`usejdk` 通过 `export` 修改的环境变量**仅对当前 Shell 会话有效**，关闭终端或新开一个窗口时会恢复成配置文件中的默认 `JAVA_HOME`。如果你希望永久切换默认版本，请直接修改 `~/.zshrc` 中的 `JAVA_HOME`。
:::

## JDK 安装路径参考

`target_home` 需要根据你机器上 JDK 的实际安装位置来调整。本文示例将所有版本统一放在一个目录下，按 `jdk<版本号>` 的命名约定进行管理：

- **macOS**（Bash/Zsh 版）：`/usr/local/openjdk/`
- **Windows**（PowerShell 版）：`D:\Java\`

例如 macOS 下的目录结构：

```text
/usr/local/openjdk/
├── jdk8/Contents/Home/
├── jdk11/Contents/Home/
├── jdk17/Contents/Home/
└── jdk21/Contents/Home/
```

Windows 下对应的目录结构（没有 `Contents/Home` 这一层）：

```text
D:\Java\
├── jdk8\
├── jdk11\
├── jdk17\
└── jdk21\
```

:::info[为什么是 `Contents/Home`？]
macOS 上的 JDK 都遵循 Apple 的标准 bundle 布局，根目录下会有一个 `Contents/Home/` 子目录，真正的 `JAVA_HOME` 应指向这个 `Home` 目录（里面才有 `bin/`、`lib/`、`conf/` 等）。如果你是在 Linux 上手动解压，解压出来通常直接就是 `JAVA_HOME`，例如 `/usr/local/openjdk/jdk17/`，路径里不会有 `Contents/Home`。
:::

<details>
<summary><b>手动解压安装步骤（以 macOS 下 Temurin 17 为例）</b></summary>

1. 前往 [adoptium.net](https://adoptium.net/temurin/releases/) 下载 macOS 版 `.tar.gz` 包，例如 `OpenJDK17U-jdk_x64_mac_hotspot_17.0.9_9.tar.gz`。
2. 创建目标目录并解压：

    ```shell
    $ sudo mkdir -p /usr/local/openjdk
    $ sudo tar -xzf OpenJDK17U-jdk_x64_mac_hotspot_17.0.9_9.tar.gz \
        -C /usr/local/openjdk/
    $ sudo mv /usr/local/openjdk/jdk-17.0.9+9 /usr/local/openjdk/jdk17
    ```

3. 解压后的目录结构大致如下：

    ```text
    /usr/local/openjdk/jdk17/
    ├── Contents/
    │   ├── Home/             ← 这就是 JAVA_HOME
    │   │   ├── bin/
    │   │   ├── lib/
    │   │   ├── conf/
    │   │   └── ...
    │   ├── Info.plist
    │   └── MacOS/
    └── ...
    ```

4. 验证安装：

    ```shell
    $ /usr/local/openjdk/jdk17/Contents/Home/bin/java -version
    openjdk version "17.0.9" 2023-10-17
    OpenJDK Runtime Environment Temurin-17.0.9+9 (build 17.0.9+9)
    OpenJDK 64-Bit Server VM Temurin-17.0.9+9 (build 17.0.9+9, mixed mode)
    ```

</details>

<details>
<summary><b>其它安装方式对应的 target_home</b></summary>

如果你使用的是其它安装方式，可参考下表替换 `target_home`：

| 安装方式 | 路径示例 |
|:--------|:--------|
| Homebrew (Temurin) | `/opt/homebrew/opt/openjdk@17` (Apple Silicon) 或 `/usr/local/opt/openjdk@17` (Intel) |
| Homebrew Cask (Temurin) | `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home` |
| Oracle 官方安装包 | `/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home` |
| SDKMAN | `~/.sdkman/candidates/java/17.0.13-tem` |
| Linux 手动解压 | `/usr/local/openjdk/jdk17/`（注意：没有 `Contents/Home`） |
| Windows 手动解压 | `D:\Java\jdk17`（注意：没有 `Contents/Home`） |
| Temurin 安装器 (Windows) | `C:\Program Files\Eclipse Adoptium\jdk-17.0.13+7-hotspot` |

注意：使用 Homebrew 或 SDKMAN 等管理工具时，路径中通常带有具体小版本号（如 `17.0.13-tem`），版本升级后路径会变，需要同步更新。手动解压的方式通过将目录命名为 `jdk17`、`jdk21` 这样的固定名，**让 usejdk 完全感知不到小版本变化**，这也是这种部署方式的一个小优点。

</details>

:::tip[快捷查看本机已安装的 JDK]
在 macOS 上可以使用 `/usr/libexec/java_home -V` 命令快速列出所有已安装的 JDK 及其路径：

```shell
$ /usr/libexec/java_home -V
Matching Java Virtual Machines (3):
    21.0.11 (x86_64) "Eclipse Temurin" - "Eclipse Temurin 21" /usr/local/openjdk/jdk21/Contents/Home
    17.0.19 (x86_64) "Eclipse Temurin" - "Eclipse Temurin 17" /usr/local/openjdk/jdk17/Contents/Home
    11.0.25 (x86_64) "Eclipse Temurin" - "Eclipse Temurin 11" /usr/local/openjdk/jdk11/Contents/Home
```

也可以用 `/usr/libexec/java_home -v <版本号>` 直接获取指定版本的 `JAVA_HOME`：

```shell
$ /usr/libexec/java_home -v 17
/usr/local/openjdk/jdk17/Contents/Home
```
:::
