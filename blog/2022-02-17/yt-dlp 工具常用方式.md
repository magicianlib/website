---
slug: yt-dlp-工具常用方式
title: yt-dlp 工具常用方式
date: 2022-02-17T21:20
tags: [软硬件]
---

## 前言

[yt-dlp](https://github.com/yt-dlp/yt-dlp) 是一款基于 [youtube-dl](https://github.com/ytdl-org/youtube-dl) 和 [youtube-dlc](https://github.com/blackjack4494/yt-dlc) 二次开发的命令行下的视频下载工具。

在此之前，大家可能用的都是 youtube-dl，不可否认我也在用。但实在受不了 youtube-dl 的下载速度，当我知道 yt-dlp 后立马将 youtube-dl 抛弃了。

<!-- truncate -->

yt-dlp 工具将 youtube-dl 与 youtube-dlc 做了整合，同时内部增加了多线程下载并做了一些定制化修改。我在使用过发现 yt-dlp 能将速度提到极致。

下面以某国漫（[https://www.youtube.com/watch?v=lHvamusTCK0](https://www.youtube.com/watch?v=lHvamusTCK0)）为例，使用 youtube-dl 和 yt-dlp 的下载速度对比：

![yt-dlp-vs-youtube-dl-1645151899Jfx19M](https://@media/blog-media/yt-dlp/yt-dlp-vs-youtube-dl-1645151899Jfx19M.png)

很明显，yt-dlp 的下载速度将 youtube-dl 甩了几条街。

yt-dlp 是基于 youtube-dl 二次开发，**是 YouTube 的专属下载工具**。另外，该工具还支持其他的视频网站。比如国内的优酷、爱奇艺、 bilibili 等。

:::tip[小提示]
因为 yt-dlp 是基于 youtube-dl 和 youtube-dlc 做的二次开发，所以在使用时他们的命令及参数基本一致。所以下面的命令说明同样适用于 youtube-dl 和 youtube-dlc。
:::

## 下载及安装

yt-dlp 的 Github 仓库地址是：[https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)。

在仓库的 README 说明中有介绍各种操作系统（Unix/Mac/Windows）的安装方式。另外，也可以直接到 [releases](https://github.com/yt-dlp/yt-dlp/releases) 页面下载二进制安装包进行安装。

不过，推荐使用 pip 包管理安装：

```bash
pip3 install -U "yt-dlp[default]"
```

后续如果想升级，再执行一次该命令即可。

:::info[不想使用 pip 包管理？]

如果你不想使用 pip，在 Unix（MacOS、Linux、BSD）上也可以使用 `curl`、`wget` 及 `aria2c` 等工具下载，之后直接设置执行权限即可：

curl：

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

wget：

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

aria2c：

```bash
sudo aria2c https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp --dir /usr/local/bin -o yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

另外，MacOS 如果使用了 HomeBrew 包管理工具的话，也可以直接使用 brew 命令进行安装：

```bash
brew install yt-dlp
```

对于 Windows 系统，也可以直接到 [releases](https://github.com/yt-dlp/yt-dlp/releases) 页面下载二进制程序包，之后配置下环境变量也行。
:::

:::danger[注意]
yt-dlp 在视频合成时基于 ffmpeg，虽然在程序包中有内置 ffmpeg。但还是推荐在操作系统上单独安装一次，防止视频下载后在进行合并音视频的出现未知错误。
:::

## 音视频下载

### 默认方式下载命令

yt-dlp 下载 Youtube 视频很简单，只需要拷贝浏览器地址栏上的视频链接即可：

```bash
yt-dlp https://www.youtube.com/watch?v=lHvamusTCK0
```

默认情况下，yt-dlp 会自动选择一个视频。

:::info[Note]
YouTube 上的视频都是使用 v 参数指定（就是 av 的意思，同 bilibili）。v 后面的值就是视频号，我们可以直接通过视频号找到指定视频。对于视频专栏（系列视频）则使用 list 参数指定系列号。
:::

需要特别强调了是：YouTube 上的视频采用音视频分离的方式。如果安装了 ffmpeg，yt-dlp 默认会下载质量最高的视频和音频并进行合并，这也是为什么在之前推荐单独安装 ffmpeg 的原因。

默认情况下，yt-dlp 会自动下载适合的音视频进行合并（如果操作系统中有 ffmpeg 的话默认会下载质量最高的音视频），不过我们也可以借助 `-F` 和 `-f` 参数选择下载指定质量的音视频。

### 列出所有的音视频文件

使用 `-F` 参数可以列出指定视频链接的全部音视频文件：

```bash
yt-dlp -F https://www.youtube.com/watch?v=lHvamusTCK0
```

输出示例：

![yt-dlp-v-F-1645153235ABnGuv](https://@media/blog-media/yt-dlp/yt-dlp-v-F-1645153235ABnGuv.png)

注意看输出示例中的 VCODEC 栏信息，共分为三类，分别是 images、audio only 和 videi only。也就是说 Youtube 上的视频是音视频分开的。如果你仅仅下载 video only 文件是只有画面没有声音，只下载 audio only 文件则只有声音没有画面。因此在下载时需要同时下载一个 audio only 文件和一个 video only 文件（yt-dlp 默认下载方式会自动下载音视频文件）。

另外，video only 文件分为两类流媒体格式，分别是 mp4 和 webm。webm 是谷歌推出的流媒体格式，与 mp4 区别不大，可以参考文章最后的 webm 文件说明。

输出栏中还有一列 ID 字段，这个是流媒体文件标识，如果想要下载指定的质量的流媒体就需要使用 `-f` 参数指定该 ID（下面会进行说明）。

### 下载指定音视频文件

`-f` 参数则用于下载指定的文件。比如上面示例中的 1920x1080 的 mp4 视频文件，对应的 ID 为 137：

```log
137 mp4   1920x1080   25 │    1.24GiB 1158k https │ avc1.640028   1158k video only              1080p, mp4_dash
```

下载命令如下：

```bash
yt-dlp -f 137 https://www.youtube.com/watch?v=lHvamusTCK0
```

另外， `-f` 参数可同时指定下载多个文件，也可以指定范围下载文件。示例：

```log
-f 399,137,248: 下载指定文件
-f 135-137,248-250: 下载指定范围文件(ID 不存在没关系, 会在你指定的范围内查找要下载的 ID 文件)
```

需要强调的一点是，Youtube 上的流媒体文件是音视频分离的。因此，你如果使用 `-f` 这种方式下载视频文件必须同时指定要下载的音频文件，否则下载完成后的视频要么只要画面没有声音要么只有声音没有画面。

视频文件和音频文件使用 `+` 分隔，比如要下载的视频文件 ID 为 137，音频文件为 140。则命令如下：

```bash
yt-dlp -f 137+140 https://www.youtube.com/watch?v=lHvamusTCK0
```

不要担心下载完成后会有两个文件，yt-dlp 会使用 ffmpeg 工具自动将下载完成后的视频和音频进行合并成一个流媒体文件。

`-f` 参数除了直接指定 ID 外还可以使用下面这种语法（也是 yt-dlp 默认下载形式）：

```bash
-f bestvideo+bestaudio
```

这种语法会自动下载质量最高的音视频文件并进行合并（前提是安装了 ffmpeg ）。比如上面的示例中 1920x1080 的视频文件有两个：

```log
137 mp4   1920x1080   25 │    1.24GiB 1158k https │ avc1.640028   1158k video only              1080p, mp4_dash
248 webm  1920x1080   25 │    1.08GiB 1014k https │ vp9           1014k video only              1080p, webm_dash
```

bestvideo 形式默认会自动选择 webm 格式，因此我们可以使用下面的语法指定如果没有 mp4 格式的视频文件的话再选择 webm 视频文件：

```bash
-f bestvide[ext=mp4]/bestvideo[ext=webm]+bestaudio
```

对于音频文件也是一样的，可以指定优选选择 m4a 还是 webm 的音频文件（默认选择 webm）：

```bash
-f bestvideo[ext=mp4]/bestvideo[ext=webm]+bestaudio[ext=m4a]/bestaudio[ext=webm]
```

### 音视频文件合并

有时候使用 `-f` 参数指定具体音视频文件虽然下载完成了，但是不会自动合并，比如使用下面的命令：

```bash
yt-dlp -f bestvide+bestaudio https://www.youtube.com/video?v=PLpljE1hzFbZxxx
```

得到两个音视频文件：

```log
bestvide.mp4
bestaudio.m4a
```

遇到这种情况不用担心，我们可以使用 `ffmpeg` 手动执行下合并，命令如下：

```bash
ffmpeg -i bestvide.mp4 -i bestaudio.m4a -c:a copy -c:v copy output.mp4
```

其中 `bestvide.mp4` 就是你下载后的视频文件， `bestaudio.m4a` 是你下载后的音频文件，而最后的 `output.mp4` 就是你合并之后输出的文件了。

### 下载播放列表

Youtube 视频下载怎么能缺少专栏呢（就是常说的电视剧，在 Youtube 上叫播放列表 playlist）。播放列表的 URL 通常是下面的形式：

```
https://www.youtube.com/playlist?list=PLpljE1hzFbZZMIEUSB_XL7UKr3iAwq7X_
```

yt-dlp 也可以直接下载播放列表：

```bash
yt-dlp https://www.youtube.com/playlist?list=PLpljE1hzFbZZMIEUSB_XL7UKr3iAwq7X_
```

这样会自动下载播放列表中的全部视频，另外也可以使用 `--playlist` 相关参数下载播放列表指定起始位置：

```log
--playlist-start NUM            下载播放列表起始位置, 默认1
--playlist-end NUM              下载播放列表结束位置, 默认 last
--playlist-items ITEM_SPEC      下载播放列表里的特定选集. 如 --playlist-items 1,3,5,7-10, 就会下载 1,3,5,7,8,9,10 集
```

:::tip[小提示]
在下载播放列表指定集之前可以先使用 `-F` 参数看下有哪些选集。
:::

### 断点续传

如果在下载过程中网络突然断了是一件很麻烦的视频（如下日志）：

```log
[youtube] Q6rCpelpwIk: Downloading webpage
...
WARNING: [youtube] <urlopen error EOF occurred in violation of protocol (_ssl.c:1131)>. Retrying ...
[youtube] lUqJ7uFEXEQ: Downloading android player API JSON (retry #1)
...
ERROR: unable to download video data: HTTP Error 403: Forbidden
```

难道要重新下载？不需要，可以使用 `-c` 参数指定断点续传。加上该参数之后就会自动接着上次下载的位置下载了：

```bash
yt-dlp -c -f 137+140 https://www.youtube.com/watch?v=lHvamusTCK0
```

## 视频封面

### 下载视频封面

```bash
yt-dlp --skip-download --write-thumbnail [视频链接]
```

### 下载封面并且转为png

某些视频网站默认下载下来是webp格式，如果想要转换成其他格式（如 png）可以加上 `--convert-thumbnail` 参数：

```bash
yt-dlp --skip-download --write-thumbnail --convert-thumbnail png [视频链接]
```

### 内嵌视频封面

经常看到某些视频的封面特别biu特否，但当你将视频下载下来时发现那个biu特否的封面没了~

这个时候你可能需要使用使用 `--embed-thumbnail` 参数将封面嵌入到下载的视频文件中。

示例：

```bash
yt-dlp --embed-thumbnail --output "output_file.mp4" "https://www.youtube.com/watch?v=VIDEO_ID"
```

## 视频字幕

有些 Youtube 视频字幕也是分离的，所以对于某些视频来说我们还需要下载下对应的字幕。字幕主要有下面这些参数：

```log
--list-subs               列出所有字幕
--write-sub               下载字幕文件
--all-subs                下载所有可用字幕
--write-auto-sub          下载自动生成的字幕文件
--sub-lang LANGS          下载指定语言的字幕, 多种语言字符之间使用逗号分隔(如: --sub-lang "")
--sub-format FORMAT       字幕文件格式, 如 "srt" 或 "ass/srt/vtt"(首选 ass 格式, 没有就选择 srt. 以此类推)
--embed-sub               把字幕合并到视频中，只支持 mp4、mkv 和 webm 格式的视频
--skip-download           不下载视频(适用于仅下载字幕时使用)
```

下面的示例都以 [MIT 6.824: Distributed Systems](https://www.youtube.com/channel/UC_7WrbZTCODu1o_kfUMq88g) 第十三节课（ `https://www.youtube.com/watch?v=4eW5SWBi7vs` ）为例做说明。

**特别强调：** `--write-auto-sub` 参数用于下载自动生成的字幕文件，意思就是某些视频本身没有字幕，但是 youtube 比较牛逼，可以自动生成多语言字幕。对于这种本身没有字幕的视频我们就可以借助 `--write-auto-sub` 参数来实现字幕下载。因此，在下载 youtube 视频时推荐都加上 `--write-auto-sub` 参数。

看下示例：

### 列出可用字幕

通常，youtube 自动生成比较多，所以在列出字幕时可以过滤下，比如我只过滤可用的中/英文字幕：

```bash
$ yt-dlp --list-subs https://www.youtube.com/watch\?v\=4eW5SWBi7vs | egrep 'en|zh'

hy       Armenian              vtt, ttml, srv3, srv2, srv1, json3
zh-Hans  Chinese (Simplified)  vtt, ttml, srv3, srv2, srv1, json3
zh-Hant  Chinese (Traditional) vtt, ttml, srv3, srv2, srv1, json3
en-orig  English (Original)    vtt, ttml, srv3, srv2, srv1, json3
en       English               vtt, ttml, srv3, srv2, srv1, json3
fr       French                vtt, ttml, srv3, srv2, srv1, json3
sl       Slovenian             vtt, ttml, srv3, srv2, srv1, json3
tk       Turkmen               vtt, ttml, srv3, srv2, srv1, json3
```

### 字幕文件下载

有时我们可能仅需要下载视频的字幕文件，对于这种场景我们可以加上 `--skip-download` 参数，表示不下载视频仅下载字幕。

比如我下载自动生成的中文和英文字幕文件：

```bash
$ yt-dlp --write-auto-sub --sub-lang "zh-Hans,en" --skip-download https://www.youtube.com/watch\?v\=4eW5SWBi7vs

...
[info] 4eW5SWBi7vs: Downloading subtitles: zh-Hans, en
[info] 4eW5SWBi7vs: Downloading 1 format(s): 243+251
[info] Writing video subtitles to: Lecture 13： Spanner [4eW5SWBi7vs].zh-Hans.vtt
[download] Destination: Lecture 13： Spanner [4eW5SWBi7vs].zh-Hans.vtt
[download] 100% of  512.36KiB in 00:00:01 at 410.79KiB/s
[info] Writing video subtitles to: Lecture 13： Spanner [4eW5SWBi7vs].en.vtt
[download] Destination: Lecture 13： Spanner [4eW5SWBi7vs].en.vtt
[download] 100% of  551.15KiB in 00:00:01 at 526.30KiB/s

$ ls
Lecture 13： Spanner [4eW5SWBi7vs].en.vtt
Lecture 13： Spanner [4eW5SWBi7vs].zh-Hans.vtt
```

### 将字幕内嵌到视频

另外，我们也可以在下载视频时直接将自动生成的字幕文件内嵌到视频中，这里我选择将中/英文字幕直接内嵌到视频中：

```bash
$ yt-dlp --write-auto-sub --sub-lang "zh-Hans,en" --embed-sub https://www.youtube.com/watch?v=4eW5SWBi7vs
```

另外，如果你对字幕格式有特殊要求还可以使用 `--convert-subs` 将字幕转换为指定格式，以 ass 字幕格式为例：

```bash
$ yt-dlp --write-auto-sub --convert-subs=ass --sub-lang "zh-Hans,en" --embed-sub https://www.youtube.com/watch?v=4eW5SWBi7vs
```

现在，当我们播放视频时就可以随意切换字幕了：

![yt-dlp-embed-subtitle-to-video](https://@media/blog-media/yt-dlp/yt-dlp-embed-subtitle-to-video.png)

## 网络设置

### 设置代理

既然下载 Youtube 上的视频怎们能少的了代理呢？

```bash
--proxy URL
```

示例：

```bash
yt-dlp --proxy sockss://127.0.0.1:8889 -f 137+140 https://www.youtube.com/watch?v=lHvamusTCK0
```

### 超时时间

另外还可以设置连接超时时间：

```bash
--socket-timeout SECONDS
```

### 限制下载速度

如果在上班时偷偷使用 yt-dlp 下载 Youtube 上的视频，每秒几十兆几十兆的下载很容易被网管监控到。所以聪明的做法应该限制一下 yt-dlp 的最大下载速度：

```bash
-r, --limit-rate      MAX_RATE
```

参数 `MAX_RATE` 就是你指定的每秒下载速度上限，如 50K、4.2M、1024G。

### 设置请求时间间隔

在油管上，如果批量下载视频（如播放列表）容易触发请求限制，导致无法访问：

```log
This content isn't available, try again later
```

可以设置如下参数，在每个视频下载完成后增加 5 ~ 20 秒的延迟，再下载下一个视频：

```bash
-t sleep
```

:::info[NOTE]
`-t sleep` 是 yt-dlp 提供的内置别名预设，他是完整命令是：

```log
--sleep-subtitles 5 --sleep-requests 0.75
--sleep-interval 10 --max-sleep-interval 20
```

如果不想直接会用预设，也可以基于完整命令做适当修改。
:::


## 用户认证

`yt-dlp` 提供了通用的网络协议认证方式（即指定用户和密码），参数如下：

```log
-u, --username USERNAME          指定用户名
-p, --password PASSWORD          指定用户密码
```

### 使用 cookies

基于用户和密码的认证方式适用于普通的的文件协议（如 FTP）。对于视频网站来说肯定是不行的，因为这种明文的方式对网站来说毫无安全感，因此我们可以采用 cookies 认证：

```log
--cookies FILE        Netscape 格式的 cookies 文件
```

`--cookies` 参数指定的 cookies 文件内容必须是 Netscape 格式才行。很多浏览器都支持插件，如 `EditThisCookie` 插件就提供了导出 cookies 的功能。

下面是 Netscape 格式的 cookies 内容示例：

```Netscape
## Netscape HTTP Cookie File
## This file is generated by yt-dlp.  Do not edit.
...
.bilibili.com	TRUE	/	FALSE	0	sid	7rds5eer
www.bilibili.com	FALSE	/	FALSE	0	theme_style	light
```

现在有了这个大会员 cookies 文件我就可以下载任意 1080P 的视频了，示例：

```bash
$ yt-dlp --cookies cookies.txt -f https://www.bilibili.com/video/BV1AG4y1k7jX
```

## 使用模板变量

`yt-dlp` 默认下载的文件名冗余信息特别多（如多余的番号ID信息），下载完成之后可能还需要多额外的重命名操作，总觉得特别麻烦。

不过 yt-dlp 它内置了一些模板变量便于你来重新组织下载的文件名（是不是特别懂你~）。下面是基本的模板变量：

|**模板变量**|**说明**|
|:----------|:------|
| `{title}` |视频的标题|
| `{id}` |视频的唯一标识符（就是BV号）|
| `{uploader}` |视频上传者的用户名|
| `{ext}` |文件扩展名|
| `{playlist_index}` |当前视频在播放列表中的索引|
| `{resolution}` |视频分辨率|

例如，如果你想将文件名设置为 “视频标题_上传者.ext”，可以使用以下命令：

```bash
yt-dlp -o "%(title)s_%(uploader)s.%(ext)s" 视频链接
```

在实际下载中如果不确定自定义的文件名是否符合自己的要求，可以使用 `--print` 或 `--skip-download --get-filename` 做输出测试。

以《宇宙 第三季》为例，我重组的文件名格式为：“索引 文件名. 扩展名”。另外，我额外的在索引前面加了一个字母 “P”。同时指定索引为两位数，如果不够两位数就使用 “0” 进行填充。命令如下：

```bash
$ yt-dlp --print "P%(playlist_index)02d｜%(title)s.%(ext)s" https://www.bilibili.com/video/BV1vx411C7hk

# 或

$ yt-dlp --skip-download --get-filename -o "P%(playlist_index)02d｜%(title)s.%(ext)s" https://www.bilibili.com/video/BV1vx411C7hk
```

输出的信息如下：

```
P01 宇宙 第三季【全12集】 p01 太空灾难.mp4
...
P12 宇宙 第三季【全12集】 p12 宇宙现象.mp4
```

看起来已经符合我的要求了，之后就可以下载啦：

```bash
$ yt-dlp -o "P%(playlist_index)02d｜%(title)s.%(ext)s" https://www.bilibili.com/video/BV1vx411C7hk
```

<details>
<summary>**常用的模板变量**</summary>

下面是一些常用的模板变量，你可以根据需要自由组合这些变量来构建输出文件名的模板。要查看 yt-dlp 的完整模板变量列表和详细信息，你可以查看 yt-dlp 的官方文档（[https://github.com/yt-dlp/yt-dlp#output-template](https://github.com/yt-dlp/yt-dlp#output-template)）。文档通常包含有关每个变量的用法和示例。

|**模板变量**|**说明**|
|:----------|:------|
| `{id}` | 视频的唯一标识符（就是BV号）|
| `{title}` | 视频的标题|
| `{uploader}` | 视频上传者的用户名|
| `{uploader_id}` | 视频上传者的唯一标识符|
| `{channel}` | 视频所属的频道名称|
| `{channel_id}` | 视频所属的频道唯一标识符|
| `{upload_date}` | 视频上传的日期（格式为 YYYYMMDD）|
| `{duration}` | 视频的时长，以秒为单位|
| `{view_count}` | 视频的观看次数|
| `{like_count}` | 视频的点赞数|
| `{dislike_count}` | 视频的踩数|
| `{comment_count}` | 视频的评论数|
| `{thumbnail}` | 视频的缩略图链接|
| `{categories}` | 视频的类别|
| `{tags}` | 视频的标签|
| `{formats}` | 视频的可用格式|
| `{ext}` | 文件扩展名|
| `{playlist}` | 视频所属的播放列表名称|
| `{playlist_index}` | 当前视频在播放列表中的索引|
| `{webpage_url}` | 当前视频对应网页链接|
| `{autonumber}` | 用于递增计数，通常与播放列表结合使用|
| `{description}` | 视频的描述|
</details>

<details>
<summary>**模板变量最佳实战**</summary>

下载前先确定重组文件名是否 ok：

```bash
yt-dlp --print "P%(playlist_index)02d｜%(title)s.%(ext)s" 视频链接
```

执行下载：

```bash
yt-dlp -c \
-t sleep \
--embed-thumbnail \
-f bestvideo+bestaudio \
-o "P%(playlist_index)02d｜%(title)s.%(ext)s" \
--cookies cookies_svip.txt \
[视频链接]
```

如果是 youtube 的话，可以考虑内嵌字幕什么的：

```bash
yt-dlp -c \
-t sleep \
--embed-thumbnail \
-f bestvideo+bestaudio \
--write-auto-sub --convert-subs=ass --sub-lang "zh-Hans,en" --embed-sub \
-o "P%(playlist_index)02d｜%(title)s.%(ext)s" \
[视频链接]
```

</details>

## 查看支持的网站列表

如果想要知道 yt-dlp 工具支不支持你想下载的网站的视频可以使用下面参数看下。该参数会列出所有支持的网站列表：

```log
--list-extractors
```

比如我想看看支不支持 bilibili：

```bash
$ yt-dlp --list-extractors | grep bilibili
bangumi.bilibili.com
```

这里显示支持。那我使用 `-F` 参数看下尚硅谷的c语言课程试试：

```bash
$ yt-dlp -F https://www.bilibili.com/video/BV1qJ411z7Hf

...
ID EXT RESOLUTION │  FILESIZE  TBR PROTO │ VCODEC            VBR ACODEC      ABR
─────────────────────────────────────────────────────────────────────────────────
0  m4a audio only │ ~ 4.85MiB  67k https │ audio only            mp4a.40.2   67k
1  m4a audio only │ ~ 9.59MiB 132k https │ audio only            mp4a.40.2  132k
2  m4a audio only │ ~23.04MiB 319k https │ audio only            mp4a.40.2  319k
...
30 mp4 1200x720   │ ~11.78MiB 163k https │ hev1.1.6.L120.90 163k video only
31 mp4 1280x768   │ ~15.40MiB 213k https │ avc1.640028      213k video only
32 mp4 1280x768   │ ~11.96MiB 165k https │ hev1.1.6.L120.90 165k video only
...
```

那现在我下载课程还不轻而易举？

## 什么是 WebM 格式

WebM由Google提出，是一个开放、免费的媒体文件格式。

WebM 影片格式其实是以 Matroska（即 MKV）容器格式为基础开发的新容器格式，里面包括了VP8影片轨和 Ogg Vorbis 音轨，其中Google将其拥有的VP8视频编码技术以类似BSD授权开源，Ogg Vorbis 本来就是开放格式。

WebM标准的网络视频更加偏向于开源并且是基于HTML5标准的。相比较而言，我发现同样是 1080p 的视频 WebM 要比 MP4 体积更小，更方便于网络传输，但两者的画面感我看不出有什么差异。

虽然 WebM 有很多好处，但是 MP4 是现在主流的流媒体标准。有些流媒体播放器还不支持 WebM 视频格式，如英特尔对 WebM 的流媒体就存在兼容性问题。

## Q&A

### JavaScript 运行时错误？

在下载 YouTube 视频时大概率会遇到下面错误提示或警告：

```
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
```

这个警告是 yt-dlp 提示你需要外部 JavaScript 运行时（runtime）来解决 YouTube 的反爬机制。解决方式也很简单，安装一个 JavaScript 运行环境即可（选一个你最熟悉的即可）：

- Deno (推荐)：轻量且是 yt-dlp 的默认首选。
- Node.js
- Bun

之后使用只需要加上 `--js-runtimes` 参数即可：

```bash
yt-dlp --js-runtimes deno
yt-dlp --js-runtimes node
yt-dlp --js-runtimes bun
```

另外，将配置写入文件，这样以后每次使用 yt-dlp 都会自动应用，无需再手动输入参数。根据你的操作系统选择对应的命令：

Linux/macOS 用户：

```bash
mkdir -p ~/.config/yt-dlp
echo "--js-runtimes node" >> ~/.config/yt-dlp/config
echo "--remote-components ejs:github" >> ~/.config/yt-dlp/config
```

Windows 用户：

```powershell
echo --js-runtimes node > %APPDATA%\yt-dlp\config.txt
echo --remote-components ejs:github >> %APPDATA%\yt-dlp\config.txt
```

简单解释一下这两个参数的作用：

- `--js-runtimes node`：指定使用 Node.js 作为 JavaScript 运行时（也可以修改为 deno）。
- `--remote-components ejs:github`：允许 yt-dlp 在需要时，自动从 GitHub 下载最新的方案解决脚本异常