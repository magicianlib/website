## 替换

`sed 's///'` 是 `sed` 命令中最常用的替换（substitute）命令格式，用来查找和替换文本内容。它的完整语法是：

```bash
sed 's/pattern/replacement/flags'
```

### 语法详解

- **`s`**：表示替换操作（substitute）。
- **`pattern`**：要匹配的正则表达式。
- **`replacement`**：用于替换匹配内容的字符串。
- **`flags`**（可选）：修饰符，用于控制替换行为，例如全局替换等。

### 示例解析

#### 替换字符串

```bash
echo "hello world" | sed 's/world/universe/'
```

输出：

```
hello universe
```

解释：

- `s/world/universe/`：将 `world` 替换为 `universe`。

#### 全局替换

```bash
echo "apple banana apple" | sed 's/apple/orange/g'
```

输出：

```
orange banana orange
```

解释：

- `s/apple/orange/g`：将所有的 `apple` 替换为 `orange`，`g` 表示全局替换（global）。

#### 删除匹配的内容

```bash
echo "hello world" | sed 's/world//'

```
输出：

```
hello
```

解释：

- `s/world//`：匹配 `world` 并替换为空，达到删除的效果。

再比如有一批 mp4 文件：

```bash
$ ls
file1_modified.mp4
file2_modified.mp4
...
```

如果想删除文件名中的 “\_modified”，就可以通过 sed 配合 xargs 来实现：

```bash
ls *.mp4 | sed 's/_modified.mp4$//' | xargs -I {} mv {}_modified.mp4 {}.mp4
```

### 标志（Flags）说明

- **`g`**：全局替换，将所有匹配的内容替换。
- **`i`**：忽略大小写匹配。
- **`n`**：替换第 `n` 次匹配的内容。

示例：只替换第二个匹配

```bash
echo "apple apple apple" | sed 's/apple/orange/2'
```

输出：
```
apple orange apple
```

解释：

- 只替换第二个 `apple` 为 `orange`。