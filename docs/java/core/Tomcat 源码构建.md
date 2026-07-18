:::danger
构建 Tomcat 源码不需要 Maven！不需要 Maven！！！网上一大堆配置 Maven、配置 Catalina_Home 全是扯淡！！官网给的构建步骤真的 “狠” 清晰！！！！

**Tomcat 是一个 Ant 项目，所以我们仅仅需要下载一个 Ant 就能运行了，就类似于 Maven 项目一样一样的！！！！**
:::

## 安装 Ant

在 Ant 官网页面下载 Ant 安装包二进制文件（[https://ant.apache.org/bindownload.cgi](https://ant.apache.org/bindownload.cgi)）：

![1-ant-website-1642774130fpS9re](https://@media/tomcat-media/TomcatSourceCodeBuild/1-ant-website-1642774130fpS9re.png)

这里我选择的是 1.10.11 版本：

```bash
wget https://dlcdn.apache.org//ant/binaries/apache-ant-1.10.11-bin.zip
```

下载后解压，对得到对应的解压目录，比如我选择的这个版本解压后的目录是 apache-ant-1.10.11：

```bash
unzip apache-ant-1.10.11-bin.zip
```

之后开始配置环境变量，类 UNIX 直接编辑 profile 配置文件，比如 /etc/profile。在配置文件中添加如下内容即可（windows玩家自行百度），如下：

```
export ANT_HOME=/${YourAntPath}/apache-ant-1.10.11
export PATH=$PATH:$ANT_HOME/bin
```

之后使环境变量生效：

```bash
source /etc/profile
```

之后再终端输入 `ant -version` 命令，能够正常输出版本信息就表示没问题了，示例：

```bash
$ ant -version
Apache Ant(TM) version 1.10.11 compiled on July 10 2021
```

编译工具好了，就开始捣鼓源码：

## 获取 Tomcat 源码

构建 Tomcat 首先我们需要有 Tomcat 源码，获取 Tomcat 源码的方式有两种：

**1. 直接去 Tomcat Github 仓库克隆（推荐）：**

```git
git clone https://github.com/apache/tomcat.git
```

![2-tomcat-github-1642767766Wv31Km](https://@media/tomcat-media/TomcatSourceCodeBuild/2-tomcat-github-1642767766Wv31Km.png)

**2. 去 Tomcat 官网（[https://tomcat.apache.org](https://tomcat.apache.org/download-80.cgi)）下载指定版本的源码，比如 8.5 版本：**

![3-tomcat-website-1642767806wrtRet](https://@media/tomcat-media/TomcatSourceCodeBuild/3-tomcat-website-1642767806wrtRet.png)

## 构建源码

**源码获取后先别急着使用 IDE 打开！！！！**

进入 Tomcat 源码跟目录，会看到有两个 txt 文件，分别是 BUILDING.txt 和 RUNNING.txt，如下：

```bash
$ ls
BUILDING.txt             MERGE.txt                RUNNING.txt              build.xml                res
CONTRIBUTING.md          NOTICE                   TOMCAT-NEXT.txt          conf                     test
KEYS                     README.md                bin                      java                     webapps
LICENSE                  RELEASE-NOTES            build.properties.default modules
```

这两个 txt 文件就是告诉你如何进行源码构建以及 DEBUG！！！！

讲的特别清晰，所以你会发现百度出来的一大堆怎么构建 Tomcat 源码都是先增加一个 maven 文件啥的，都是各种拷贝的文章。除了这两个文件，官网也给了很清晰的构建步骤，比如 tomcat8.5：[https://tomcat.apache.org/tomcat-8.5-doc/building.html](https://tomcat.apache.org/tomcat-8.5-doc/building.html)

下面说的内容在 BUILDING.txt 和 RUNNING.txt 文件中都有，我仅仅是将主要步骤拷贝出来便于使用仅此而已！！！！

在 Tomcat 源码根目录下有一个 build.properties.default 文件，这个文件就是 ant 构建 tomcat 源码的配置，不要做修改！！！！我们需要做的是新建一个 build.properties 文件，进行覆盖默认的配置内容。

### 1. 创建 `build.properties` 配置文件

在源码根目录创建一个 `build.properties` 文件，并在文件中增加如下配置：

```properties
# Tomcat 依赖包下载目录
base.path=${user.home}/tomcat-build-libs
```

Tomcat 源码在构建时会下载所需的依赖包（如 maven）， `base.path` 指的就是依赖包下载目录。默认会下载到用户的根目录
（即 `${user.home}` ），推荐为 Ant 设置一个依赖存储仓库，如 Maven Repository。

示例：

```properties
base.path=/opt/repository/tomcat-build-libs
```

Ant 构建时会通过网络下载依赖包，Ant 的仓库在国外，下起来一般会很慢，所以推荐设置网络代理，继续在 build.properties 文件中添加如下内容：

```properties
# Ant 代理
proxy.use=true
proxy.host=proxy.domain
proxy.port=8080
proxy.user=username
proxy.password=password
```

如果不需要设置代理需要将 `proxy.use` 值设置为 false。比如我使用网络代理配置如下：

```properties
proxy.use=true
proxy.host=127.0.0.1
proxy.port=7890
proxy.user=
proxy.password=
```

### 2. 执行构建命令

**现在就可以在 Tomcat 源码根目录执行下面的命令开始构建了：**

```bash
$ ant
```

该命令会执行根目录下 build.xml 中的 deploy 配置。构建完成时会在根目录下生成一个 /output/build 文件夹，另外你所熟悉的 webapp 目录也在该目录下。

如果构建成功会看到最后的输出信息如下：

```
BUILD SUCCESSFUL
Total time: 23 seconds
```

如果构建失败请查看一下你所下载的 tomcat 版本所支持的 JDK 版本，比如我构建 Tomcat10 时就输出如下错误信息，表示 JDK 版本不匹配。

```
compile:
    [javac] Compiling 1731 source files to /Users/xxx/tomcat/output/classes
    [javac] Support for javac --release has been added in Java9 ignoring it
    [javac] javac: invalid target release: 11
    [javac] Usage: javac <options> <source files>
    [javac] use -help for a list of possible options
```

有关 Tomcat 与 JDK 版本关系见：[https://tomcat.apache.org/whichversion.html](https://tomcat.apache.org/whichversion.html)（如下图）

![4-tomcat-versions-1642767830k456ha](https://@media/tomcat-media/TomcatSourceCodeBuild/4-tomcat-versions-1642767830k456ha.png)

### 3. 导入到 IDEA

现在 Tomcat源码就算是构建成功了，不过我们需要导入到 IDE。在导入之前我们还需要在根目录执行如下 IDE 编译命令：

IDEA 玩家执行如下命令：

```bash
$ ant ide-intellij
```

Eclipse 玩家执行如下命令：

```bash
$ ant ide-eclipse
```

Netbeans 玩家执行如下命令：

```bash
$ ant ide-netbeans
```

Netbeans-Replace 玩家执行如下命令：

```bash
$ ant ide-netbeans-replace
```

这些 IDE 编译命令是用于编译相应的 IDE 配置，比如我使用的是 IDEA，命令执行完成后就会在源码根目录下生成一个 .idea 文件夹。

之后打开 IDE 导入即可（下面是 IDEA 的示例）。

导入完成后直接运行 `org.apache.catalina.startup.Bootstrap#main` 方法， `org.apache.catalina.startup.Bootstrap` 是 Tomcat 的启动类，所以如果能直接运行成功就表示 Tocmat 运行成功！！！！

如果在运行时提示某个依赖包不存在的问题主要是依赖没导入，示例：

![5-import-idea-1642767843PmZNwi](https://@media/tomcat-media/TomcatSourceCodeBuild/5-import-idea-1642767843PmZNwi.png)

我们要做的是打开 Project Structure 导入依赖：

![6-idea-project-structure-dependencies-1642767853gBZG5W](https://@media/tomcat-media/TomcatSourceCodeBuild/6-idea-project-structure-dependencies-1642767853gBZG5W.png)

注意看这个依赖，我们之前已经配置过 `ANT_HOME` ，按理说应该会自动识别才对，但是 `$ANT_HOME$/lib/ant.jar` 没有识别。

另外下面的 `$TOMCAT_BUILD_LIBS$` 几个依赖包就是在编译时设置的依赖下载目录，同样的没有自动识别。

这里比较奇怪，实际上应该会自动识别才对，我测试发现有时自动识别有时不会自动识别（IDEA 2020.3）

**就感觉很蛋疼，所以我们需要手动的一个一个将这一个依赖导进去即可。**

<details open>
<summary>**小提示**</summary>

这个依赖一般会自动识别。当我们导入 IDEA 后在右下角通常会有一个路径地址变量未定义提示：

![7-fix-variables-undefines-1642826050xC8Mtt](https://@media/tomcat-media/TomcatSourceCodeBuild/7-fix-variables-undefines-1642826050xC8Mtt.png)

我们只需要点击 **FIX it** 然后在弹窗里手动修改下变量即可：

![7-config-path-variables-1642826020dNOewi](https://@media/tomcat-media/TomcatSourceCodeBuild/7-config-path-variables-1642826020dNOewi.png)

一般来说重启后就正常了（如果不能正确识别那只能手动导入了）：

![7-idea-project-structure-dependencies-normal-1642767865Nog3Al](https://@media/tomcat-media/TomcatSourceCodeBuild/7-idea-project-structure-dependencies-normal-1642767865Nog3Al.png)
</details>

## 运行源码

上面的配置都做完之后一般来说就可以直接运行了，如果还不能直接运行就只能去 Google 了~

运行启动类 `org.apache.catalina.startup.Bootstrap#main` ，如下：

![8-run-tomcat-1642767909eZTPGE](https://@media/tomcat-media/TomcatSourceCodeBuild/8-run-tomcat-1642767909eZTPGE.png)

你会看到上面有错误信息提示 ClassNotFoundException，不用管它，这是 web.xml 配置的问题。

直接使用浏览器访问 127.0.0.1:8080，好家伙你又会看到下面这个错误：

![9-tomcat-page500-1642767918hU9f3k](https://@media/tomcat-media/TomcatSourceCodeBuild/9-tomcat-page500-1642767918hU9f3k.png)

这个原因是因为我们直接启动 `org.apache.catalina.startup.Bootstrap` 的时候没有加载 `org.apache.jasper.servlet.JasperInitializer` ，从而无法编译JSP。

比较奇怪，我使用Tomcat8.5 时有这个问题，但是在 Tomcat6/7 是没有这个问题的。

解决办法是：找到 `org.apache.catalina.startup.ContextConfig#configureStart` 方法，加一行代码：

```java
context.addServletContainerInitializer(new JasperInitializer(),null)
```

如下图标红线位置：

![10-tomcat-page500-fix-16427679282WHlLQ](https://@media/tomcat-media/TomcatSourceCodeBuild/10-tomcat-page500-fix-16427679282WHlLQ.png)

再次重启访问 127.0.0.1:8080 就没问题了~

![11-tomcat-gui-1642767948ZWU1s7](https://@media/tomcat-media/TomcatSourceCodeBuild/11-tomcat-gui-1642767948ZWU1s7.png)

## Tomcat GUI 用户及角色配置

其实到这里 Tomcat 源码就构建成功了，不过如果想要测试 Web GUI 管理界面的话还需要做些用户配置。比如现在你直接点击 Manager App 就要求你输入用户密码：

![12-tomcat-gui-login-1642767961IbwG9k](https://@media/tomcat-media/TomcatSourceCodeBuild/12-tomcat-gui-login-1642767961IbwG9k.png)

那这个用户从哪里来的呢？

找到 conf 目录下的 tomcat-users.xml 文件：

![13-tomcat-users-1642767974puMsFA](https://@media/tomcat-media/TomcatSourceCodeBuild/13-tomcat-users-1642767974puMsFA.png)

用户就是在这个 xml 文件中配置的，文件中有许多示例。另外上面还定义了四个角色，如 manager-gui。我们先不管角色，直接在 xml 中增加一个用户（角色为空）：

```xml
<user username="admin" password="admin" roles="" />
```

重启再次访问，现在输入用户密码后又提示错误信息：

![14-tomcat-gui-user-tip-1642767990vorWmy](https://@media/tomcat-media/TomcatSourceCodeBuild/14-tomcat-gui-user-tip-1642767990vorWmy.png)

看下这个提示信息，还给你了配置用户示例并告诉你需要什么角色（manager-gui），所以想要使用 Manager App 功能就需要给用户增加 manager-gui 权限，添加即可：

```xml
<user username="admin" password="admin" roles="manager-gui" />
```

要是我还想要使用 Host Manager 功能怎么吧？

![15-tomcat-hostmanager-gui-1642768002hx0QaQ](https://@media/tomcat-media/TomcatSourceCodeBuild/15-tomcat-hostmanager-gui-1642768002hx0QaQ.png)

直接点击即可，输入用户密码后又会给你提示：

![16-tomcat-hostmanager-gui-user-tip-1642768014u4P2uC](https://@media/tomcat-media/TomcatSourceCodeBuild/16-tomcat-hostmanager-gui-user-tip-1642768014u4P2uC.png)

并告诉你需要 admin-gui 角色，添加即可：

```xml
<user username="admin" password="admin" roles="manager-gui,admin-gui" />
```

现在你懂了吗？想要使用某个功能，又不知道角色该怎么办？先点击再说~

--

到此，Tomcat 源码就构建完成了，之后就可以开始学习了。

完结，撒花~
