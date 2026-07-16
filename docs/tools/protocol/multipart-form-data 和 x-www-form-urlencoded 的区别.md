## 前言

在 HTTP 上下文中， `multipart/form-data` 请求类型主要是用于提交 HTML 表单数据。顾名思义，使用 `multipart/form-data` 作为请求类型，HTML 的主体数据将会使用分隔符（我们通常也称为边界分隔）。而由分隔符分隔的每个部分都会有自己的头部描述信息。分隔符或边界也仅作为头文件的一部分发送。

但是在实际使用中，可以用于提交表单数据的还有一个 `application/x-www-form-urlencoded` 请求类型，这是我们使用最普遍的一个请求类型。在还没有前后端分离的年代，作为后端铁子一定写过不少类似下面的 Form 表单：

```html
<body>
    <form action="/upload">
        <div>
            用户名<input type="text" name="username">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

在 Form 中我们虽然没有使用 `enctype` 属性明确指定请求类型，但他默认使用的就是 `application/x-www-form-urlencoded` 请求类型。这个是 W3C 标准：

<details open>
<summary>**W3C 对 Form 的规定**</summary>

The default value for this attribute is `"application/x-www-form-urlencoded"` . The value `"multipart/form-data"` should be used in combination with the [ `INPUT` ](http://www.w3.org/TR/html401/interact/forms.html#edef-INPUT) element, `type="file"`.
</details>

而在 stackoverflow 上也有人提出这样的疑问：[is application/x-www-form-urlencoded default for html form?](https://stackoverflow.com/questions/2436716/is-application-x-www-form-urlencoded-default-for-html-form)

另外，w3c 同样还规定：如果在 Form 表单中使用了 INPUT 标签，且 `type="file"` 时需要使用 `enctype` 属性明确指定 Form 表单类型为 `"multipart/form-data"` 。这个我们也不陌生，就是我们使用 Form 表单提交数据时，如果需要上传文件我们经常会额外使用 `enctype` 属性：

```html
<body>
    <form action="/upload" enctype="multipart/form-data">
        <div>
            用户名<input type="text" name="username">
        </div>
        <div>
            头像<input type="file" name="profilePhoto">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

之所以这么规定的原因是 `"application/x-www-form-urlencoded"` 请求类型对于表单中需要提交文件或图片以及发送大量二进制数据或包含非 ASCII 字符的文本时效率是很低下的。

比如如果你的 Form 表单只需要提交一些简单的数据完全可以使用 `application/x-www-form-urlencoded` 作为请求类型来发送数据（如下）：

```html
<body>
    <form action="/upload" enctype="application/x-www-form-urlencoded">
        <div>
            用户名<input type="text" name="username">
        </div>
        <div>
            年龄<input type="text" name="age">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

但如果你同时还需要在请求中上传用户的头像照片：

```html
<body>
    <form action="/upload">
        <div>
            用户名<input type="text" name="username">
        </div>
        <div>
            年龄<input type="text" name="age">
        </div>
        <div>
            头像<input type="file" name="profilePhoto">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

那么继续使用 `enctype="application/x-www-form-urlencoded"` 作为请求类型是很不明智的，我们应该使用 `enctype="multipart/form-data"` 。因此，如果只是发送简单的表单数据，请使用 `application/x-www-form-urlencoded` ，但如果表单数据包含二进制数据，则需要使用 `multipart/form-data` 。

但这是为什么呢？这个问题还是要归结于 `application/x-www-form-urlencoded` 和 `multipart/form-data` 两个请求类型的对数据格式的处理，了解了他们的数据格式这个问题就很好理解了。

## x-www-form-urlencoded 数据格式

`application/x-www-form-urlencoded` 请求类型会将每个非 ASCII 字符编码为3字节。基于 `application/x-www-form-urlencoded` 的 `Content-Type` 它的请求体看起来特别大特别的冗余，这就是我们经常看到一大坨包含 `%` 符号的字符串。它会将请求体中的数据以 `key=value` 的形式进行拼接，多个数据之间使用 `&` 符号连接：

```
key1=value1&key2=value21&key2=value22&key3=value3
```

如果数据特别多的话咋一看头皮都要发麻！当然这还不是最主要的，最重要的是在进行数据发送时它会将非 ASCII 的数据使用 URL 进行编码。所以你经常会看到请求数据里面有好多 `%` 符号，类似如下：

```
%WW
```

其中 **WW** 是以十六进制格式表示的字母数字字符的 ASCII 码。因为二进制数据中的所有非字母数字字符都是URL编码，也就导致了1个字节被转换为3个字节。

下图是我使用 Postman 模拟发送 `application/x-www-form-urlencoded` 请求类型示例数据，注意看左边的数据是我们实际填写的信息，而右边的数据是真正发送时被编码的数据。我们的数据被拼接成 `key=value` 的形式并进行了 UrlEncoding，最终传输的数据是： `username=%E5%BC%A0%E4%B8%89&age=18` 。

![PostmanUrlencoded-1637308016N8Bh2L](https://@media/protocol-media/ContentType/multipart-form-data/PostmanUrlencoded-1637308016N8Bh2L.png)

上面是一个简单的示例，因为中文非 ASCII 码，上面的数据就被 UrlEncoding 了。而我们实际中的数据又有几个 ASCII 码？

所以在实际数据传输时原本的数据基本上被放大了三倍。如果你发送的是一个文件或图像，其中有很多二进制数据，那么你的有效载荷将会非常大，即几乎是实际有效载荷的三倍。因此，它在发送大型二进制文件或大型非 ASCII 数据时效率极其之低下，再财大气粗的公司使用 `application/x-www-form-urlencoded` 请求类型进行二进制数据传输浪费的带宽怎么也要伤筋动骨吧（说白了就是原本应该用来给你发年终奖的刀了被用来填补带宽了）。

现在我们再来看下 `multipart/form-data` 的编码格式：

## multipart/form-data 数据格式

在文章最开始的时候我们提到， `multipart/form-data` 具有分隔符或边界。被分隔的每个部分都是一个单独的数据体，具有自己的请求头描述信息。

`multipart/form-data` 数据格式如下：

```
--
Content-Disposition: form-data; name=""
Content-Type:

[DATA]
--
Content-Disposition: form-data; name=""; filename=""
Content-Type:

[DATA]
----
```

注意看上面的格式，格式以分隔符（ `--` ）或边界开始，以分隔符或边界结束。上面的示例格式分为两部分，在实际使用中需要严格遵守上面的格式，同时要牢记：

**1）** 每个部分都有自己分隔符或边界

**2）** 每个部分都包含自己的头信息来描述数据类型

**3）** `Content-Disposition` 的值包括三个部分， `form-data` 表示是一个表单数据。 `name=""` 指定的是字段的名称，以之前的表单为例，这个值就是 `input` 标签里面的 `name="username"` ，懂？最后，如果你要上传的数据是一个文件还要包含 `filename=""` 字段，这个就对应之前的 `<input type="file">` ，它的值就是文件名。

**4）** 最后，空一行然后写你自己的数据。如果是一个文件，就使用 `< ` 指定你的文件路径即可。

还是以下面的 form 表单为例来说下：

```html
<body>
    <form action="/upload" enctype="multipart/form-data">
        <div>
            用户名<input type="text" name="username">
        </div>
        <div>
            年龄<input type="text" name="age">
        </div>
        <div>
            头像<input type="file" name="profilePhoto">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

上面三个 input 框值如下：

```
username=张三
age=18
profilePhoto=/Users/kali/example.png
```

:::danger[注意]
上面的 `profilePhoto` 指定的是我本地的文件，那么它的值就是我机器上的路径，这个不要搞错了！
:::

上面示例数据对应的 `multipart/form-data` 请求类型数据体如下：

```
--
Content-Disposition: form-data; name="username"

张三
--
Content-Disposition: form-data; name="age"
Content-Type: text/plain

18
--
Content-Disposition: form-data; name="profilePhoto"; filename="example.png"
Content-Type: image/png

< /Users/kali/example.png
----
```

:::info[NOTE]
`Content-Type` 请求类型是非必须的，可以不传递。 `filename` 指定的是文件的名称，但不需要与你实际传递的文件名一致。

比如上面我指定的机器文件是 `/Users/kali/example.png`，即使我 `filename` 指定的文件名完全可以是 `test.jpg`，也没有任何影响。

最后，如果上传的是一个文件请使用 `<` 符号指定你的文件路径， `<` 符号与你的地址之间有一个空格！
:::

由于 `multipart/form-data` 将按原样发送二进制数据，这就是为什么它被用于发送文件和大的二进制数据。<u>**现在的问题是。为什么不一直使用 `multipart/form-data` 类型来提交表单数据呢?**</u>

原因是，对于小数据，边界字符串和请求头信息本身都是额外的数据，在传输时也占用一定的网络带宽。例如，假设我们只发送如下数据：

```
name=张三
age=18
```

如果使用 `application/x-www-form-urlencoded` 作为请求类型时发送的数据如下：

```
username=%E5%BC%A0%E4%B8%89&age=18
```

但是如果使用 `multipart/form-data` 作为请求类型的话，要发送的数据则是：

```
--
Content-Disposition: form-data; name="username"

张三
--
Content-Disposition: form-data; name="age"
Content-Type: text/plain

18
----
```

有没有得不偿失的感觉？所以， `multipart/form-data` 虽好，可不要乱用噢~

### 自定义数据边界

前面的示例中使用的数据边界都是 `--` ，这是 `multipart/form-data` 的默认数据边界，对应的请求头是：

```
Content-Type: multipart/form-data
```

但实际上，我们可以使用 `boundary` 来自定义边界，即：

```
Content-Type: multipart/form-data; boundary=WebKitFormBoundary
```

其中 `boundary` 指定的值 `WebKitFormBoundary` 就是我们设置的边界，任意值都可，但一般使用的还是 `-` 和字符数字组合。

下面是国内某牛的文件上传请求头自定义边界示例：

![qiniu-upload-header-1637314571WDGNlG](https://@media/protocol-media/ContentType/multipart-form-data/qiniu-upload-header-1637314571WDGNlG.png)

但是啊，我要说但是了！即使你使用 `boundary` 指定了自定义边界数据，原本的 `--` 也是不能省略的。比如我们使用 `boundary` 指定了边界值为 `WebKitFormBoundary` ，那么对应的数据体就为：

```
--WebKitFormBoundary
Content-Disposition: form-data; name=""
Content-Type:

[DATA]
--WebKitFormBoundary
Content-Disposition: form-data; name=""; filename=""
Content-Type:

[DATA]
--WebKitFormBoundary--
```

再比如，如果你设置的请求头类型为：

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
```

那么你的数据边界原本的 `--` 也是不能省略的：

```
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name=""
Content-Type:

[DATA]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name=""; filename=""
Content-Type:

[DATA]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### 多文件上传

这种需求简直不要太多，当然我们的关注点是数据格式该怎么写？比如我要同时上传 PDF 文件和头像该怎么写呢？再比如我想同时上传身份证正反面又该怎么写呢？

不知道有没有理解我的意思，同时上传 pdf 和头像对应的 Form 表单如下：

```html
<body>
    <form action="/upload" enctype="multipart/form-data">
        <div>
            PDF文件<input type="file" name="contract" accept="application/pdf">
        </div>
        <div>
            头像<input type="file" name="profilePhoto" accept="image/*">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

以 Java 语言为例，对应的后台代码为：

```java
@PostMapping("/upload")
public void upload(@RequestParam("contract") MultipartFile contract,
                   @RequestParam("profilePhoto") MultipartFile profilePhoto) {

    // ......
}
```

同时上传身份证正反面的 Form 表单如下：

```html
<body>
    <form action="/upload" enctype="multipart/form-data">
        <div>
            证件照<input type="file" name="identityCard" multiple accept="image/*">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>

<!-- 或 -->

<body>
    <form action="/upload" enctype="multipart/form-data">
        <div>
            证件照1<input type="file" name="identityCard" accept="image/*">
            证件照2<input type="file" name="identityCard" accept="image/*">
        </div>
        <div>
            <button type="submit">提交</button>
        </div>
    </form>
</body>
```

以 Java 语言为例，对应的后台代码为：

```java
@PostMapping("/upload")
public void upload(@RequestParam("identityCard") List<MultipartFile> identityCardFile) {

    // omit
}
```

很显然，这两种对后台服务器而言接收方式是不一样的。一个是每个文件单独接收，一个是直接使用 List 接收即可。造成这样的区别是什么呢？是 `input` 中的 `name=""` 的值的原因。

我们知道在 html 中， `input` 的 `name` 的值是可以重复的，重复的结果就导致我们应该使用一个集合或数组来接收他们的值。我们又知道，在 `multipart/form-data` 请求类型的数据体中，每个 `name` 都是使用分隔符分隔的，既然这样我们与 `input` 的 `name` 的数量保持一致不就可以了？

如下：

**同时上传合同和头像：**

```
--
Content-Disposition: form-data; name="contract"; filename="contract.pdf"
Content-Type: application/pdf

< /path/contract.pdf
--
Content-Disposition: form-data; name="profilePhoto"; filename="profilePhoto.png"
Content-Type: image/png

< /path/profilePhoto.png
----
```

**同时上传身份证正反面：**

```
--
Content-Disposition: form-data; name="identityCard"; filename="idcard1.png"
Content-Type: image/png

< /path/idcard1.png
--
Content-Disposition: form-data; name="identityCard"; filename="idcard2.png"
Content-Type: image/png

< /path/idcard1.png
----
```

也就是说，我管你上传几个，我只看 `name` ！

## 资源链接

[https://stackoverflow.com/questions/2436716/is-application-x-www-form-urlencoded-default-for-html-form](https://stackoverflow.com/questions/2436716/is-application-x-www-form-urlencoded-default-for-html-form)

[https://www.w3.org/TR/html401/interact/forms.html#adef-enctype](https://www.w3.org/TR/html401/interact/forms.html#adef-enctype)

[https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Type](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Type)

[https://golangbyexample.com/multipart-form-data-content-type-golang/](https://golangbyexample.com/multipart-form-data-content-type-golang/)
