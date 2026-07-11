Linux 命令突然不能使用的主要原因就是环境变量 PATH 配置存在问题，导致所有的命令都失效。

比如下面配置 Go 环境示例，目的是将 `$GOROOT/bin` 目录下的所有可执行文件加入到环境变量 PATH 中，结果在配置 PATH 时因为粗心执行了直接替换，而不是追加：

```bash
export GOROOT=/usr/local/lib/golang/go
export PATH=$GOROOT/bin
```

这就导致当重启系统或使用 `source` 命令刷新环境之后就会发现所有的命令都不能使用了，气不气~

最直接的解决办法就是在命令终端中执行下面的命令：

```bash
export PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/root/bin
```

这条命令是用于临时重置环境变量 PATH，在这个 Session 周期内能继续正常使用最初始的系统命令，不过是一次性的。

之后要做的是赶紧查找系统中的各个配置文件，将具体的问题修复！！！！

还是以 Go 环境为例，修复后的配置：

```bash
export GOROOT=/usr/local/lib/golang/go
export PATH=$PATH:$GOROOT/bin
```

之后刷新环境变量之后一切就都正常乐🎉🎉🎉🎉~
