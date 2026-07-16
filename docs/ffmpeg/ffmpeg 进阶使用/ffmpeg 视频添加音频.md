## 音视频合并

音视频合并最简单的用法就是一个视频文件、一个音频文件，然后将这两个流进行合并，下图是效果图：

<img alt="add_audio.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/add_audio.png" height="250px" />

对应命令如下：

```bash
ffmpeg \
-i video_no_audio.mp4 \
-i you.flac \
-c:v copy \
-map 0:v \
-map 1:a \
-y
video_with_audio.mp4 \
```

:::tip[小提示]
由于我们没有修改视频流，因此我们可以直接使用 `-c:v copy` 来实现视频流复制，避免重新编码缩短执行时间。
:::


## 音轨替换

另一种情况是，视频文件本身就存在音频。但是我们想使用某个特定的音频文件替换原视频中的音频：

<img alt="replace_audio.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/replace_audio.png" height="250px" />

此时，我们就需要借助 `-map` 映射参数来实现。使用 `-map` 参数从两个流媒体文件中分别提取视频流和音频流并将这两个流进行合并即可：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i water.flac \
-c:v copy \
-map 0:v \
-map 1:a \
-y \
video_replace_audio.mp4
```

### 关于音视频长度问题

这里需要注意的是，假如视频（video_with_audio.mp4）长度为 60s，而音频（water.flac）长度只有 30s，在输出视频文件（video_replace_audio.mp4）时，FFMPEG 会选择与时长最长（ `-longest` ）的那个输入流保持一致，也就是说视频 video_replace_audio.mp4 时长为 60s，只不过从 30s 之后都没有声音而已。

如果你想要选择与最短的那个输入流保持一致，应该加上 `-shortest` 参数：

```bash
ffmpeg \
-i video_with_audio_60s.mp4 \
-i water_30s.flac \
-c:v copy \
-map 0:v \
-map 1:a \
-shortest \
-y \
video_replace_audio_30s.mp4
```

此时输出的视频文件长度就为 30s 了。

## 视频添加空音轨

除了将音频文件合并到视频中之外，还可以直接对视频添加一个（无声的）空音轨：

```bash
ffmpeg \
-i video_no_audio.mp4 \
-f lavfi -i anullsrc \
-c:v copy \
-shortest \
-map 0:v \
-map 1:a \
-y \
video_empty_audio.mp4
```

命令中的 `-f lavfi -i anullsrc` 用于生成一个无限长度的虚拟音频源。因此，我们需要加上 `-shortest` 参数以输出与原视频保存一样的时长。否者，将会创建一个无限时长的视频文件。

## 多音轨

经常在电影院看大型巨作时都会发现，一个视频通常有多种音频语言。比如英文音频，又或者中文音频：

<img alt="multi_audio.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/multi_audio.png" height="250px" />

不管有多少音轨，其本质都是视频容器中的一个流而已。想要实现这种效果我们只需要将目标音频流打包到视频文件中即可：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i water.flac \
-c:v copy \
-map 0:v \
-map 0:a \
-map 1:a \
-y \
video_with_multi_audio.mp4
```

不过，在播放时需要注意，视频播放器不会同时播放所有的音频，默认会选择第一个音频。如果你想要选择第二个音频需要手动选择，下图是 IINA 播放器音频选择示例：

<img alt="multi_audio_play.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/multi_audio_play.png" height="250px" />

### 合并多个音频文件

前面只是从一个音频文件中提取音频，事实上可以从多个音频文件中提取音频流：

<img alt="from_multi_audio_file.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/from_multi_audio_file.png" height="250px" />

命令如出一辙，只是多了几个映射而已：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i fall.mp3 \
-i water.flac \
-c:v copy \
-map 0:v \
-map 0:a \
-map 1:a \
-map 2:a \
-y \
video_with_multi_audio.mp4
```

## 混音

这种用法随处可见，在看电视剧或电影时通常会发现角色在交流时都会有对应的背景音乐烘托场景环境。这其实都是后期制作，也是典型的混音。即如下效果：

<img alt="mixing_audio.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/mixing_audio.png" height="250px" />

实现这种效果的命令如下：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i water.flac \
-c:v copy \
-filter_complex " \
    [0:a] [1:a] amix=inputs=2:duration=longest [audio_out] \
    " \
-map 0:v \
-map "[audio_out]" \
-y \
video_with_mixing_audio.mp4
```

为了实现音频混合，我们需要使用 FFMPEG 提供的 amix 过滤器。并告诉该过滤器接受2个输入（0:a和1:a），将它们组合成一个名为 audio_out 的音频流，持续时间选择最长的那个音频。

之后，将视频流 `0:v` 和混合音频流 `audio_out` 映射到最终输出视频中即可。

### 控制音轨音量

混音的背景音乐通常都会比较小，主要目的是为了不影响角色本身的交流。因此，在实现混音时，通常会适当的控制某个音频流的音量。

下面是一个示例，将背景音乐的音量设置为标准音量的一半大小：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i water.flac \
-c:v copy \
-filter_complex " \
    [0:a] volume=0.5 [background_music]; \
    [background_music] [1:a] amix=inputs=2:duration=longest [audio_out] \
    " \
-map 0:v \
-map "[audio_out]" \
-y \
video_with_mixing_audio.mp4
```

### 控制音轨延迟播放

在上面的例子中，声音都是从头开始。如果想要延迟混音的开始时间，我需要添加一个延迟。效果如下：

<img alt="range_mixing_audio.png" src="https://@media/blog-media/FFmpeg/VideoCombinedAudio/range_mixing_audio.png" height="250px" />

要做到这一点，只需要在 amix 过滤器中指定某个音频的延迟时间即可（单位为毫秒），下面是示例：

```bash
ffmpeg \
-i video_with_audio.mp4 \
-i water.flac \
-c:v copy \
-filter_complex " \
    [1:a] adelay=5000|5000 [voice]; \
    [0:a] [voice] amix=inputs=2:duration=longest [audio_out] \
    " \
-map 0:v \
-map "[audio_out]" \
-y \
video_with_mixing_audio.mp4
```

`adelay=5000|5000` 是用于控制左右声道的分别延长时间（通常会设置一致，除非你有特殊需求），之后就与前面的混音做法一致了。

## 音频循环

这个比较有用，比如给某个特别长的视频添加一首背景音乐。而音乐文件通常只有几分钟，如果继续使用前面的方式将音乐文件合并到视频中你会发现，当歌曲播放一遍之后就不再播放了。比如视频时长是60分钟，而音乐文件1分钟，当你执行合并之后会发下剩下的59分钟都没有背景音乐...

因此，我们通常的做法是循环播放背景音乐，直到视频结束。命令如下：

```bash
ffmpeg \
-i video_no_audio.mp4 \
-stream_loop -1 -i you.flac \
-c:v copy \
-shortest \
-map 0:v \
-map 1:a \
-y video_with_circulate_audio.mp4
```

参数 `-stream_loop -1` 会无限循环音频流（you.flac），它会永远重复。因此，我们必须使用 `-shortest` 参数来保证将输出的视频长度设置为视频持续时间。
