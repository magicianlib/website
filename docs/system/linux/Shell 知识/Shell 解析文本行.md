比如有一份 CSV 数据，每行是一条记录：

```csv title="order.csv"
order_id,user_id
23329989527,610049527
23330159862,502629862
23330595420,610205420
```

需求是把每一行的字段取出来，填进一条 curl 命令里逐条调用接口：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"command":"ALL","orderId":<这里填 order_id>,"userId":<这里填 user_id>}' \
  "http://localhost:9120/api/syncOrder"
```

核心思路：**用 `while read` 配合 `IFS` 逐行解析。** 下面从基本写法讲起，再补上实战中的注意点、更稳妥的 JSON 构造方式，以及并行加速。

## 一、基本写法：while read + IFS

```bash
cat order.csv | while IFS=, read -r order_id user_id; do
    curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"command\":\"ALL\",\"orderId\":$order_id,\"userId\":$user_id}" \
    "http://localhost:9120/api/syncOrder"
done
```

这条命令涉及三个知识点：`read`、`IFS`、`-r`，逐个说明。

### read：读取一行并按字段赋值

`read` 从一行读取内容，按顺序赋值给后面的变量。**最后一个变量会接收这一行剩余的全部内容**：

```bash
line="apple banana cherry"
read a b c <<< "$line"
echo "$a | $b | $c"   # apple | banana | cherry

read a b <<< "$line"
echo "$a | $b"        # apple | banana cherry   ← 没有第三个变量，b 收下了剩余内容
```

### IFS：指定字段分隔符

`IFS`（Internal Field Separator，内部字段分隔符）决定 `read` 用什么字符切分一行。默认值是「空格、Tab、换行」三个，所以上面用空格分隔的 `line` 不用特意设置就能自动切开。

但 CSV 用的是逗号，所以要临时改成 `IFS=,`：

```bash
line="apple,banana,cherry"
IFS=, read a b c <<< "$line"
echo "$a | $b | $c"   # apple | banana | cherry
```

:::info[小提示]

写在命令前面的 `IFS=, read ...` 是**临时赋值**——`IFS=,` 只对紧跟的这一条 `read` 生效，不会影响后面的代码，推荐这种写法。

:::

### -r：原样保留反斜杠

`read` 默认会把 `\` 当成转义符处理，读普通文本行时通常不是我们想要的。加 `-r`（raw）让反斜杠原样保留，建议始终带上。

## 二、引号与变量展开

`curl -d` 的值通常长这样：

```bash
curl -d '{"command":"ALL"}'
```

那能不能直接写成单引号，把变量也放进去？

```bash
-d '{"command":"ALL","orderId":$order_id,"userId":$user_id}'
```

**不行。** Shell 的变量替换（展开）只发生在双引号和无引号里，单引号会把它内部的一切当成字面量。结果是 curl 收到的是原样的 `$order_id`，而不是期望的值：

```json
{"command":"ALL","orderId":$order_id,"userId":$user_id}   ← 单引号：原样透传，变量没展开
```

所以 JSON 要包在双引号里，并对 JSON 自带的双引号做转义（`\"`）：

```bash
-d "{\"command\":\"ALL\",\"orderId\":$order_id,\"userId\":$user_id}"   ← 双引号：变量会展开
```

## 三、实战注意点：表头与 CRLF

基本写法能跑，但真用起来有两个地方容易出问题。

**表头。** 上面的 `order.csv` 第一行是 `order_id,user_id` 表头，`while read` 会把它也当数据，第一行拼出来就是：

```json
{"orderId":order_id,"userId":user_id}   ← 把表头当值发给接口了
```

用 `tail -n +2` 从第 2 行开始读，跳过表头。

**CRLF 行尾。** CSV 大多是 Excel / Windows 导出的，行尾是 `\r\n`。`read` 会把 `\r` 留在最后一个字段上，于是 JSON 末尾会混进一个回车符，接口可能报错：

```text
user_id=610049527^M   ← 末尾多了个 \r（^M 是回车符的可视表示）
```

用 `tr -d '\r'` 先清掉（或者直接 `dos2unix order.csv` 转成 Unix 格式）。

两个都加上，基本就是能直接用的版本：

```bash
cat order.csv | tr -d '\r' | tail -n +2 | while IFS=, read -r order_id user_id; do
    curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"command\":\"ALL\",\"orderId\":$order_id,\"userId\":$user_id}" \
    "http://localhost:9120/api/syncOrder"
done
```

## 四、用 jq 构造 JSON

上面用双引号字符串拼接 JSON，能用，但有个隐患：要是某个字段里恰好含 `"` 或 `\`，拼出来的 JSON 就会非法，甚至可能被注入。更稳妥的做法是交给 `jq`，让它负责转义。

基本套路是先用 `--arg` 把变量传进 jq，再让 jq 按模板生成 JSON：

```bash
cat order.csv | while IFS=, read -r order_id user_id; do
    payload=$(jq -nc \
        --arg oid "$order_id" \
        --arg uid "$user_id" \
        '{command:"ALL",orderId:$oid,userId:$uid}')
    curl -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "http://localhost:9120/api/syncOrder"
done
```

几个参数的含义：

- `-n`：不读取标准输入，只用 `--arg` 传入的数据生成（不需要 jq 去读文件）。
- `-c`：compact 输出，把 JSON 压成一行（适合塞进 curl）。
- `--arg 名字 值`：把一个**字符串**值绑定到 jq 变量 `$名字` 上。

:::info[关于 jq 的对象语法]

模板 `{command:"ALL",orderId:$oid}` 是 jq 的对象构造表达式，不是普通 JSON，有两点不同：

- **键不必加引号**：`command`、`orderId` 这种合法标识符可以直接写，jq 会自动补上引号（等价于 `"command"`）。如果键里含连字符等特殊字符，才需要加引号。
- **值可以是表达式**：`"ALL"` 是字符串字面量，`$oid` 是变量，也可以是 `$oid|tonumber` 这种带过滤器的表达式。

:::

### 括号写法：\$oid、\(\$oid) 与 ($oid|tonumber)

这是最容易混淆的地方，明确列出来（假设 `$oid` 是字符串 `"123"`）：

| 写法 | 含义 | 结果 |
|------|------|------|
| `orderId:$oid` | 值就是变量本身 | `"orderId":"123"` |
| `orderId:($oid)` | 同上，括号是冗余的 | `"orderId":"123"` |
| `orderId:$oid\|tonumber` | 值是 `$oid` 经 `tonumber` 转换 | `"orderId":123` |
| `orderId:($oid\|tonumber)` | 同上，括号让分组更清晰 | `"orderId":123` |

结论（消除歧义）：

- **不需要转换时，直接写 `$oid`** 即可；加成 `($oid)` 也对，但多余。
- **需要转换/过滤时，写 `$oid\|tonumber`**；括号 `($oid\|tonumber)` 不是必须的（两种写法结果一样），但表达式一复杂就该加括号，避免歧义、提高可读性。

> 注意上面示例里 `orderId` 得到的是**字符串 `"123"`** 而不是数字 `123`——因为 `--arg` 永远把值当字符串。如果接口要数字，看下面两种转法。

### 数字转换：tonumber 与 --argjson

**方式一：`--arg` + `tonumber`。** `tonumber` 是 jq 的转换函数，把字符串解析成数字：

```bash
jq -nc --arg oid "123" '{orderId:($oid|tonumber)}'   # {"orderId":123}
```

注意 `tonumber` 遇到非数字会直接报错（`string ("abc") cannot be parsed as a number`），所以只适合确定是数字的字段。

**方式二：`--argjson`（更简洁）。** `--arg` 把值当字符串，而 `--argjson` 把值当成一个 **JSON 字面量**直接塞进去——数字就是数字、布尔就是布尔、对象就是对象，不需要手动转换：

```bash
jq -nc --argjson oid "123"        '{orderId:$oid}'   # {"orderId":123}   数字
jq -nc --argjson flag true        '{ok:$flag}'       # {"ok":true}       布尔
jq -nc --argjson oid "$order_id"  '{orderId:$oid}'   # 配合 shell 变量，直接得数字
```

两者取舍：`--argjson oid "$order_id"` 比 `--arg oid "$order_id" ... ($oid|tonumber)` 更简洁，**推荐用 `--argjson`**。它的“值”必须是合法的 JSON 字面量——传 `"abc"`（带引号）会被当成字符串，传 `abc`（不带引号）会报错。

### 常用的 toxxx 转换函数

除了 `tonumber`，jq 还有一组 `toxxx` / `fromxxx` 用于类型和格式转换，常用的几个：

| 函数 | 作用 | 示例 |
|------|------|------|
| `tonumber` | 字符串 → 数字 | `"42" \| tonumber` → `42` |
| `tostring` | 任意值 → 字符串 | `42 \| tostring` → `"42"` |
| `tojson` | 值 → JSON 文本字符串（序列化） | `{a:1} \| tojson` → `"{\"a\":1}"` |
| `fromjson` | JSON 文本字符串 → 值（反序列化） | `"{\"a\":1}" \| fromjson` → `{"a":1}` |

另外还有一组以 `@` 开头的**格式化器**，也可当作“转成 xxx”来用：`@base64`（Base64 编码）、`@base64d`（解码）、`@uri`（URL 编码）、`@csv`（转成 CSV 字段）等。

重点记住 `tojson` / `fromjson` 这一对：`tojson` 把 jq 值序列化成一段 JSON 文本字符串，`fromjson` 反过来把 JSON 文本字符串解析回 jq 值，两者互为逆操作。

## 五、并行执行：xargs -P

上面的写法是一条一条串行调用的，数据多了就慢。用 `xargs -P` 可以并行跑多条：

```bash
cat order.csv | tr -d '\r' | tail -n +2 \
| xargs -L1 -I {} -P 5 bash -c '
    IFS=, read -r order_id user_id <<< "{}"
    curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"command\":\"ALL\",\"orderId\":$order_id,\"userId\":$user_id}" \
    "http://localhost:9120/api/syncOrder"
'
```

- `-L1`：每次取一行作为一个输入项。
- `-I {}`：把当前输入行替换到命令里的 `{}` 处。
- `-P 5`：最多同时跑 5 个进程。

:::warning[注意限速]

调接口要注意限速，`-P` 开太大会压垮对方服务。必要时降低并发数，或在循环里加 `sleep`、用令牌桶之类的手段控制速率。

:::

<details>
<summary><b>题外话：单列数据的简化写法</b></summary>

只有一列时，不用设置 IFS，`read` 默认按整行读：

```bash
cat order.txt | while read -r order_id; do
    curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"command\":\"ALL\",\"orderId\":$order_id}" \
    "http://localhost:9120/api/syncOrder"
done
```

不过单列场景用 `xargs` 更简洁，不需要 while 循环：

```bash
cat order.txt | xargs -I {} curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"command\":\"ALL\",\"orderId\":{}}" \
    "http://localhost:9120/api/syncOrder"
```

`xargs` 默认按空白/换行拆分输入，单列数据正好契合，所以 `{}` 直接就是整行的值。

</details>
