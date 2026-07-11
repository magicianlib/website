## 前言

EOF 是 Linux 多行输入语法，在具体说 EOF 语法之前先想下为什么需要多行输入。

现在有一个 ip.txt 文件，如果想要向该文件中输入一个 baidu.com 网站该怎么做？想到的第一个答案就是使用 echo 命令：

```bash
echo baidu.com > ip.txt
```

如果我现在还要输入 taobao.com 呢？继续使用 echo：

```bash
echo taobao.com >> ip.txt
```

那我现在要是还有 100 个网站都这么输入？是不是太过傻X了？这就到了 EOF 的用武之地。

## EOF基本使用

EOF 全称叫 End Of File，就是文件结束符。EOF 语法是成对出现，也就是说以 EOF 开始同时以 EOF 结束。EOF 用法通常如下格式：

```bash
<< EOF
EOF
```

或者

```bash
<<- EOF
EOF
```

比如我现在就继续将剩下的网站输入到 ip.txt 文件中：

```bash
cat >> ip.txt << EOF
tianbao.com
google.com
tencent.com
EOF
```

这个命令的意思就是配合 cat 命令将多行文本追加到 ip.txt 文件中。

这里可能会有一个疑问，在上面的基本语法中还有一个 或者 语法，这个语法就仅仅多了一个 `-` 符号。现在就来说下具体的区别：

## `cat <<EOF` 与 `cat <<-EOF` 的区别

首先要说明的是，不管是 `<<EOF` 还是 `<<-EOF` 都是获取标准输入(`stdin`)，并在 EOF 处结束 stdin，输出 stdout（标准输出）。

有问题，找男人(`man`)。`<<-` 在 `man` 中的解释是：

If the redirection operator is `<<-`, then all leading tab characters are stripped from input lines and  the  line  containing  delimiter.

通俗的将就是，使用 `<<-` 会自动去除结束 EOF 前面的制表符。

比如如果使用下面的示例（结束 EOF 前面有个空格）：

```bash
cat >> ip.txt <<EOF
edu.com
 EOF
```

回车后不会当做 stdout（标准输出），而是继续作为 stdin（标准输入）。直白点就是回车后不能确认，必须在新行写个 EOF 才会结束标准输入：

```bash
cat >> ip.txt <<EOF
edu.com
	EOF
EOF
```

而 `<<-` 就没有这个问题，它会将结束 EOF 语法前面的制表符自动去除。如果将上面的示例换成 `<<-` 就会发现正常结束 stdin：

```bash
cat >> ip.txt <<-'EOF'
edu.com
	EOF
```

这就是 `<<-` 和 `<<` 的主要区别。

## 需要知道的几个符号

看了上面有关 EOF 的介绍有没有会 `<<` 、`>>` 有些好奇？在 linux 中有四种这样的符号：

- `<`：输入重定向
- `>`：输出重定向
- `>>`：输出重定向，进行追加，不会覆盖之前内容
- `<<`：标准输入来自命令行的一对分隔号的中间内容

比如使用下面的命令就会将 `baidu.com` 写入 ip.txt 文件中，如果该文件中已经有内容就会被覆盖：

```bash
$ cat ip.txt
baidu.com
taobao.com
tianbao.com
google.com
tencent.com

# 使用 > 会覆盖文件中的内容
echo 'baidu.com' > ip.txt

$ cat ip.txt
baidu.com
```

再比如 `>>` 该符号是追加的意思，继续下面的命令：

```bash
echo 'taobao.com' >> ip.txt
```

之后看 ip.txt 内容就会发现之前的 baidu.com 没有被覆盖，这就是主要区别。
