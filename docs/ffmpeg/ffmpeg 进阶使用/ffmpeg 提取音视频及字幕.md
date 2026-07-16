## 前言

在很多情况下，我们可能需要将视频文件中音频流提取成一个单独的音频文件。比如视频中的音乐曲目、画外音等。另外，也有单独提取视频流和字幕流的场景。下面来使用下面这张图片做说明：

<img alt="video_summary.png" src="https://@media/blog-media/FFmpeg/StreamExtract/video_summary.png" height="300px" />

这个图片是我抽象化的一个mkv格式的视频文件，该文件有一个视频流，两个音频流，两个字幕流。图片中流的顺序就是之后演示的顺序。

使用 FFMPEG 提取视频文件中的流主要有两种命令形式。一种是最简单的 `-{x}n` 参数：

$$
-[v|a|s]:n
$$

其中 v 表示 video（即视频），a 表示 audio（即音频），s 表示 subtitle（即字幕）。而后面的 n 表示 no，即不输出的意思。也就是说 `-vn` 表示不输出视频， `-an` 表示不输出音频， `-sn` 表示不输出字幕。用起来很简单，但是不够强大，这个之后来说明。

另一种则是使用 `-map` 参数做映射。这种形式可以做任何事，但是比较繁琐，不咋推荐...

## 使用 `-xn` 实现流提取（推荐）

`-xn` 用起来很简单，只需要指定不输出哪些信息即可：

### 提取视频流

使用 `-xn` 提取视频流只需要不输出其他流即可，命令如下：

```bash
ffmpeg \
-i input.mkv \
-an \
-sn \
-c copy \
output.mkv
```

这个命令执行完成后导出效果如下图：

<img alt="-xn-an-sn.png" src="https://@media/blog-media/FFmpeg/StreamExtract/-xn-an-sn.png" height="250px" />

也就是说，导出后的视频文件没有视频和音频了。

### 提取音频流

提取音频与提取视频如出一辙，只需要指定不输出其他流即可：

```bash
ffmpeg \
-i input.mkv \
-vn \
-sn \
-c copy \
output.m4a
```

但是，这个命令执行后的效果可能也我们预期的不一样。该命令执行后输出的效果如下：

<img alt="-xn-vn-sn.png" src="https://@media/blog-media/FFmpeg/StreamExtract/-xn-vn-sn.png" height="250px" />

也就是说，它保留了所有的音频，这也是 `-xn` 命令的缺点，没法输出指定的音频流。

### 提取字幕（不推荐）

有了上面两个命令的知识只能你自然而然的写出了导出字幕文件的命令：

```bash
ffmpeg \
-i input.mkv \
-vn \
-an \
-c copy \
output.srt
```

对于单字幕流的视频文件来说，该命令没什么问题。但是很遗憾，该 mvk 视频有两个字幕流...

对于多字幕流的视频文件执行，使用 `-xn` 命令执行字幕导出时会提示异常：

```
Could not write header for output file #0 (incorrect codec parameters ?): Invalid argument
Error initializing output stream 0:1 --
```

原因是总结起来就一句话：字幕流辣么多，我该选择哪一个？

因此，我不推荐你使用 `-xn` 命令导出字幕文件，你应该使用 `-map` 参数实现字幕导出：

## 使用 `-map` 实现流提取

如果你玩转 `-map` 参数你需要对 [视频文件工作的基本原理](../流媒体介绍/视频文件工作的基本原理.md) 有个基本认识，之后你还需要知道 [如何确认视频文件流媒体信息](../ffprobe%20命令/如何确认视频文件流媒体信息.md)。有了这两个知识之后还不行，你还需要知道 [ffmpeg 的 map 参数](ffmpeg%20的%20map%20参数.md) 用法。因此， `-map` 相比较 `-xn` 要稍微麻烦辣么一丢丢~

> 下面的示例中默认认为你已经对 `-map` 有了一定的了解！

### 提取视频流

```bash
ffmpeg \
-i input.mkv \
-map 0:v \
-c copy \
output.mkv
```

导出视频流与 `-xn` 看起来没啥不同，原因是视频只有一个视频流，所以感觉不出来什么（我还没见过有多个视频流的视频文件）。

### 提取音频流

现在来看下使用 `-map` 如何提取音频流。现在先会议下 `-xn` 参数导出音频流存在的问题：无法指定音频流，在导出时会导出所有的音频流。

`-map` 也能够做到导出全部的音频流：

```bash
ffmpeg \
-i input.mkv \
-map 0:a \
-c copy \
output.m4a
```

`-map` 更强大支持在于我能够导出指定的音频流，比如导出序号为 0 的音频流：

```bash
ffmpeg \
-i input.mkv \
-map 0:a:0 \
-c copy \
output.m4a
```

<img alt="-map0:a:0.png" src="https://@media/blog-media/FFmpeg/StreamExtract/-map0a0.png" height="250px" />

或导出序号为 1 的音频流：

```bash
ffmpeg \
-i input.mkv \
-map 0:a:1 \
-c copy \
output.m4a
```

<img alt="-map0:a:1.png" src="https://@media/blog-media/FFmpeg/StreamExtract/-map0a1.png" height="250px" />

当然，也可以显示指定导出多个音频流：

```bash
ffmpeg \
-i input.mkv \
-map 0:a:0 \
-map 0:a:1 \
-c copy \
output.m4a
```

感觉也挺简单是不是？那想一下在什么情况下会使用这种命令？嗯，我能想到的一个需求是去杂音~

### 提取字幕

好了，知道如何提取指定音频之后再想提取指定字幕还不是简简单单？

提取需要为0的字幕：

```bash
ffmpeg \
-i input.mkv \
-map 0:s:0 \
-c copy \
output.srt
```

亦或者提取喜好为1的字幕：

```bash
ffmpeg \
-i input.mkv \
-map 0:s:1 \
-c copy \
output.srt
```

嗯，这回真的没什么好说的。

## 音频流特定格式转换

大多数情况下，上述示例都适用于将音频流从任何视频格式提取为任何音频格式。但某些音频流，格式转换可能存在问题。因此下面列出了一些常见的一套导出模板：

### 从 MP4 中导出 MP3

```bash
ffmpeg \
-i video.mp4 \
-map 0:a \
-y \
output.mp3
```

### 从 MP4 中导出 WAV

```bash
ffmpeg \
-i video.mp4 \
-map 0:a \
-y \
output.wav
```

### 从 MKV 中导出 MP3

```bash
ffmpeg \
-i video.mkv \
-map 0:a \
-y \
output.mp3
```

### 从 MKV 中导出 WAV

```bash
ffmpeg \
-i video.mkv \
-map 0:a \
-y \
output.wav
```

> 猜猜这几个格式转换命令中，我为啥没加 `-c copy` ？

## 扩展

FFMPEG 最好的一点是它有许多默认选项，涵盖了大多数用例，并允许你使用非常简单的命令。

如果您对默认设置没特殊要求，则可以直接下面简单命令实现将视频文件转换为音频文件：

```bash
ffmpeg -i [video_file] [audio_file]
```

这可以直接将视频文件（MP4、AVI、MKV）转换为音频文件（MP3、WAV、M4A）。缺点是我们无法指定要选择的轨道或要使用的编解码器，但 FFMPEG 足够聪明，可以在大多数情况下做出正确的选择。
