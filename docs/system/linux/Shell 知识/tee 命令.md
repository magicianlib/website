## 前言

有时候，我们会有这样的需求：手动跟踪命令的输出内容，同时又想将输出的内容写入文件，确保之后可以用来参考。

巧了，linux 就提供了这么一个命令 `tee`。使用 `man` 查看对 `tee` 的解释是：

read from standard input and write to standard output and files。

说人话就是：从标准输入读取数据并写到标准输出或者到指定文件。

下面就具体说下。

## tee 命令介绍

`tee` 命令基于标准输入读取数据，标准输出或文件写入数据。看下这个命令的基本语法：

```bash
tee [OPTION]... [FILE]...
```

现在由于某些原因你想使用 `tracepath` 命令追踪请求节点路径，同时你又想将输出结果记录到文件中，这个使用就有 `tee` 命令的用武之地了。

比如请求 baidu.com 并记录请求路径：

```bash
tracepath -4 baidu.com | sudo tee tracepath.txt
```

命令不仅将输出信息打印在控制台，当终止打印后我们还可以继续看 tracepath.txt 文件中记录的信息：

```bash
$ cat tracepath.txt
 1?: [LOCALHOST]                      pmtu 1500
 1:  _gateway                                              0.465ms
 1:  _gateway                                              0.740ms
 2:  _gateway                                              0.749ms pmtu 1492
 2:  114.86.224.1                                          7.844ms
 3:  61.152.6.41                                           3.163ms
 4:  61.152.25.14                                          4.997ms
 5:  202.97.97.221                                        27.067ms
```

这样就明白 `tee` 命令的基本用户了。

## tee 命令的运用

`tee` 命令在某些时候特别有用，比如当我们写一个脚本时在脚本中生成一个 `sh` 脚本就可以借助 `tee` 命令。

比如下面的 consul 安装脚本，在 consul 下载之后进行解压，同时创建一个 `restart.sh` 脚本：

```bash
#!/bin/bash

## Create consul workspace
mkdir -p /data/software/consul
cd /data/software/consul

## Download consul v1.8.4 from official
## Unzip the software package, and create Soft connection
wget https://releases.hashicorp.com/consul/1.8.4/consul_1.8.4_linux_amd64.zip
unzip consul_1.8.4_linux_amd64.zip -d consul_1.8.4
ln -s consul_1.8.4 consul

## Write consul service restart script
sudo tee consul/restart.sh <<-'EOF'
#!/bin/bash

PID=`ps -ef | grep consul | grep -v grep | awk '{print $2}'`

if [ -n "$PID" ]; then
   echo "find consul process: $PID"
   if ps -p $PID >/dev/null; then
      echo "$PID is running, kill and restart....."
      kill -9 $PID
   else
      echo "$ process is not running, restart......"
   fi
else
   echo "$process is not exist, start......"
fi

nohup ./consul agent -server -bootstrap-expect=1 -ui -bind 0.0.0.0 -client 0.0.0.0 -datacenter=dev -data-dir=$PWD/data > $PWD/consul.log 2>&1 &
EOF

cd consul

echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "consul and script installation complete."
echo "You can launch Consul service directly by running the script(sh restart.sh)"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
```

## 参考资料

- [为初学者介绍的 Linux tee 命令（6 个例子）](https://linux.cn/article-9435-1.html)
