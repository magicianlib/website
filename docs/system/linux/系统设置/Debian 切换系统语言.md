我在安装 Debian 时为了解决中文输入法问题，所以在安装时默认选择中文简体。安装完成之后我突然想将系统语言切换回英文怎么办？

这个过程其实非常简单，只需要修改系统语言设置即可。具体步骤如下：

$1.$ 打开终端，输入命令 `sudo dpkg-reconfigure locales`

$2.$ 在出现的界面中选择 `en_US.UTF-8` ，即英文语言设置。如果没有该选项，可以输入命令 `sudo locale-gen en_US.UTF-8` 添加。

![dpkg-reconfigure-locales-MTcxMTUwNTYyOAo.png](https://@media/linux-media/ReconfigureLocales/dpkg-reconfigure-locales-MTcxMTUwNTYyOAo.png)

确认之后会进一步提示选择系统默认语言，这里选择

![setting-default-locales-MTcxMTUwNTYxNgo.png](https://@media/linux-media/ReconfigureLocales/setting-default-locales-MTcxMTUwNTYxNgo.png)

$3.$ 如果上面语言设置完成之后没有提示选择系统默认语言，那么可以通过输入命令 `sudo update-locale LANG=en_US.UTF-8` 实现更新系统语言设置。

$4.$ 重新启动系统，英文语言设置即生效。

值得注意的是，切换语言可能会影响到系统中某些本地化的程序的使用，因此需要注意与相关应用程序的兼容性。
