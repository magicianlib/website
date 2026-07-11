## 基本配置

zsh 提示配置的工作方式类似于bash，只是它使用不同的语法。zsh 与其他 shell 一样可以直接使用变量PS1来存储默认提示，除此之外，zsh 也可以用变量名 PROMPT 或 prompt 代替PS1。

当我们什么都不配置的时候默认是 `%n@%m %1~ %#` ：

```bash
export PROMPT='%n@%m %1~ %#'
```

其中：

* `%n` 是当前用户名
* `%m` 是当前主机名的第一元素
* `%1~` 是当前目录，不过会自动将用户目录替换为`~`

另外， `%#` 是zsh的提示符，默认提示符号是%，当具有超级用户权限时会显示 `#` 。

<img src="https://media.ituknown.org/linux-media/KnowledgeNotes/zsh_prompt/default_prompt.png" alt="default_prompt.png" width="500px" />

因此，如果想要完整的展示用户所在目录，只保留 `%~ %#` 就可以了（即 `%1~` 替换为 `%~` 就可以展示完整路径）：

```bash
ituknown@192 JetBrains %
ituknown@192 JetBrains %export PROMPT='%n@%m %~ %#'
ituknown@192 ~/JetBrains %   ## 展示了完成路径
```

## 进阶配置

在提示中添加一点颜色、字体加粗更具有可读性：

```bash
export PROMPT='%F{13}%~ %F{50}%B%## %f%b'
```

其中：

* `%F{color}` 是配置颜色，{}中的color是256色的颜色值（见下文），也可以使用black、red、green、yellow、blue、magenta、cyan和white等常用色
* `%B` 表示使用粗体字
* `%f` 表示后面恢复默认颜色
* `%b` 表示后面恢复常规字体

<img src="https://media.ituknown.org/linux-media/KnowledgeNotes/zsh_prompt/advice_color.png" alt="advice_color.png" width="500px" />

另外，zsh 还定义了 git_prompt_info 变量，用于 git 信息提示，具体可以自行摸索。我常用的 PROMPT 是：

```bash
export PROMPT='%F{green}%B$ %f$(git_prompt_info)'
```

## 256 色颜色值

shell 可用的颜色值比较少，只有256色。除了部分可用的具名颜色值外，其他颜色值只能用具体 code 值表示。具体 code 值代表什么颜色可以使用下面命令查看：

```bash
$ curl -s https://gist.githubusercontent.com/HaleTom/89ffe32783f89f403bba96bd7bcd1263/raw/e50a28ec54188d2413518788de6c6367ffcea4f7/print256colours.sh | bash
```

下面是输出示例：

<img src="https://media.ituknown.org/linux-media/KnowledgeNotes/zsh_prompt/print256colours.png" alt="print256colours.png" width="500px" />

上面命令会拉取 Github 内容，通常情况下无法正常执行。不过也可以直接执行下面 shell 脚本查看256色颜色值，两者是等同的：

```bash
#!/bin/bash

# Tom Hale, 2016. MIT Licence.
# Print out 256 colours, with each number printed in its corresponding colour
# See http://askubuntu.com/questions/821157/print-a-256-color-test-pattern-in-the-terminal/821163#821163

set -eu ## Fail on errors or undeclared variables

printable_colours=256

# Return a colour that contrasts with the given colour
# Bash only does integer division, so keep it integral
function contrast_colour {
  local r g b luminance
  colour="$1"

  if ((colour < 16)); then ## Initial 16 ANSI colours
    ((colour == 0)) && printf "15" || printf "0"
    return
  fi

  # Greyscale ## rgb_R = rgb_G = rgb_B = (number - 232) * 10 + 8
  if ((colour > 231)); then ## Greyscale ramp
    ((colour < 244)) && printf "15" || printf "0"
    return
  fi

  # All other colours:
  # 6x6x6 colour cube = 16 + 36*R + 6*G + B  ## Where RGB are [0..5]
  # See http://stackoverflow.com/a/27165165/5353461

  # r=$(( (colour-16) / 36 ))
  g=$((((colour - 16) % 36) / 6))
  ## b=$(( (colour-16) % 6 ))

  # If luminance is bright, print number in black, white otherwise.
  # Green contributes 587/1000 to human perceived luminance - ITU R-REC-BT.601
  ((g > 2)) && printf "0" || printf "15"
  return

  ## Uncomment the below for more precise luminance calculations

  # # Calculate percieved brightness
  # # See https://www.w3.org/TR/AERT#color-contrast
  # # and http://www.itu.int/rec/R-REC-BT.601
  # # Luminance is in range 0..5000 as each value is 0..5
  # luminance=$(( (r * 299) + (g * 587) + (b * 114) ))
  # (( $luminance > 2500 )) && printf "0" || printf "15"
}

# Print a coloured block with the number of that colour
function print_colour {
  local colour="$1" contrast
  contrast=$(contrast_colour "$1")
  printf "\e[48;5;%sm" "$colour"                # Start block of colour
  printf "\e[38;5;%sm%3d" "$contrast" "$colour" # In contrast, print number
  printf "\e[0m "                               # Reset colour
}

# Starting at $1, print a run of $2 colours
function print_run {
  local i
  for ((i = "$1"; i < "$1" + "$2" && i < printable_colours; i++)); do
    print_colour "$i"
  done
  printf "  "
}

# Print blocks of colours
function print_blocks {
  local start="$1" i
  local end="$2" ## inclusive
  local block_cols="$3"
  local block_rows="$4"
  local blocks_per_line="$5"
  local block_length=$((block_cols * block_rows))

  # Print sets of blocks
  for ((i = start; i <= end; i += (blocks_per_line - 1) * block_length)); do
    printf "\n" # Space before each set of blocks
    # For each block row
    for ((row = 0; row < block_rows; row++)); do
      # Print block columns for all blocks on the line
      for ((block = 0; block < blocks_per_line; block++)); do
        print_run $((i + (block * block_length))) "$block_cols"
      done
      ((i += block_cols)) # Prepare to print the next row
      printf "\n"
    done
  done
}

print_run 0 16 # The first 16 colours are spread over the whole spectrum
printf "\n"
print_blocks 16 231 6 6 3   # 6x6x6 colour cube between 16 and 231 inclusive
print_blocks 232 255 12 2 1 # Not 50, but 24 Shades of Grey
```
