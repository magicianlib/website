## 设置镜像

```xml
<mirror>
    <id>aliyun</id>
    <mirrorOf>central</mirrorOf>
    <name>阿里云公共仓库</name>
    <url>https://maven.aliyun.com/repository/public</url>
</mirror>
```

|mirrorOf 值|含义（替代的目标）|应用场景|
|:------------|:------------------|:-------|
|central（推荐）|仅替代 Maven 默认的中央仓库|只希望替换中央仓库，保留其他自定义仓库（如 maven 私服）时使用|
|*|<u>替代所有仓库</u>，包括 central 和你在 settings.xml、pom.xml 中使用 `<repositories>` 定义的仓库|如果你配置了私服，千万不要使用。因为会忽略私服中的依赖，强制所有的依赖都去镜像站下载，最终会导致你私服中的依赖下载不下来|
|external:*|替代所有非本地仓库|与 * 类似，但更明确地排除了本地文件系统的仓库定义（一般用不到这个）|
|repo1[,repo2]|仅替代 id 为 repo1 的仓库|替代指定仓库（可以指定多个）|
|*,!repo2（推荐）|替代除了 id 为 repo2 以外的所有仓库|比如替代除了私服之外的所有仓库（可以指定多个）|

<details open>
<summary>**什么是仓库 id？**</summary>

```xml title="settings.xml" {7,13}
<settings>
    <profiles>
        <profile>
            <id>office</id>
            <repositories>
                <repository>
                    <id>nexus</id>
                    <!-- ... -->
                </repository>
            </repositories>
            <pluginRepositories>
                <pluginRepository>
                    <id>nexus</id>
                    <!-- ... -->
                </pluginRepository>
            </pluginRepositories>
        </profile>
    </profiles>
</settings>
```

其中 nexus 就是仓库 id。如果想替换所有仓库，但是唯独该私服不需要镜像，写法如下：

```xml {4}
<mirror>
    <id>Aliyun Maven Mirror</id>
    <!-- 替换除 nexus 之外的所有仓库 -->
    <mirrorOf>*,!nexus</mirrorOf>
    <name>阿里云公共仓库</name>
    <url>https://maven.aliyun.com/repository/public</url>
</mirror>
```

:::danger[NOTE]
`<repositories>` 并非只能设置在 `settings.xml` 文件中，也可以在项目的 `pom.xml` 文件中设置：

```xml title="pom.xml" {7}
<?xml version="1.0" encoding="UTF-8"?>
<project>
    <!-- 项目配置 -->

    <repositories>
        <repository>
            <id>nexus</id>
            <!-- ... -->
        </repository>
    </repositories>
</project>
```
:::
</details>

<details open>
<summary>**其他镜像站推荐**</summary>

**腾讯云：**

```xml
<mirror>
    <id>tencentyun</id>
    <mirrorOf>central</mirrorOf>
    <name>腾讯云公共仓库</name>
    <url>http://mirrors.cloud.tencent.com/nexus/repository/maven-public/</url>
</mirror>
```

**网易云：**

```xml
<mirror>
    <id>163</id>
    <mirrorOf>central</mirrorOf>
    <name>网易163公共仓库</name>
    <url>http://mirrors.163.com/maven/repository/maven-public/</url>
</mirror>
```
</details>

## 激活指定 settings.xml 文件

这个常用于区分不同 maven 配置，假如你上班的时候偷偷赚外快接外包项目。那么外包项目和你公司使用的 maven 配置肯定不能是同一个，比如需要使用 `mvn deploy` 将 jar 上传到 maven 仓库咋办？到底是上传到公司呢还是外包呢？上传就上传吧，万一被发现了咋办？

这个时候就需要使用不同的 settings.xml 了，只需要为公司和外快项目分别设置一个 settings.xml，如：

```bash
$ ls ~/.m2
settings-outsourcing.xml settings-office.xml
```

之后当你需要打包上传时只需要指定不同的 settings 即可：

```bash
mvn -s /HomePath/.m2/settings.xml [deploy]
```

## 激活指定 profile

除了使用 `-s` 区分配置文件之外，还可以使用 `-P` 指定要激活的配置。`-P` 参数同时作用于项目 pom.xml 文件和 maven 的 settings.xml 文件。用于激活指定 profiles，可以根据不同的构建环境和需求实现对项目的定制化配置。

比如在构建项目时需要区分开发环境和发布环境（如不同环境使用不同依赖或插件），就可以在 pom.xml 中使用 profiles 配置：

在使用时可以使用 `-P` 来指定要激活的环境：

```bash
# 开发环境
$ mvn [deploy] -P dev

# 产线环境
$ mvn [deploy] -P prod
```

`-P` 不仅仅作用 pom.xml，还同时作用于 settings.xml。当执行 `mvn -P dev` 命令时，在 pom.xml 中的查找 profile id 为 dev 的同时，还会查找 settings.xml 中同名配置（等价于 `<activeProfiles>dev</activeProfiles>`）。

下面是 settings.xml 示例：

```xml
<settings>
    <profiles>
        <profile>
            <id>dev</id>
            <!-- 配置内容 -->
        </profile>

        <profile>
            <id>other_profile</id>
            <!-- 配置内容 -->
        </profile>
    </profiles>

    <activeProfiles>
        <activeProfile>dev</activeProfile>
    </activeProfiles>
</settings>
```

默认使用的是 dev 配置，当需要发布时可以使用 `-P` 参数指定指定 other_profile 配置。当然了，可以同时激活多个配置（示例如下）。

- 同时激活 dev 和 other_profile：

```bash
mvn [deploy] -P dev,other_profile
```

该命令会使用 pom.xml 中的 dev 配置的同时还会激活 settings.xml 中 dev 和 other_profile 配置。

- 禁用 dev、prod，只激活 other_profile：

```bash
mvn [deploy] -P !dev,!prod,other_profile
```

该命令会同时禁用 pom.xml 中的 dev 和 prod 配置，也会禁用 settings.xml 中的 dev 并仅仅启用 other_profile。

是不是很灵活？当然了还可以配合 `-s` 一起使用：

```bash
mvn -s /path/settings.xml [deploy] -P [profile_id...]
```

尤其是配合新一代 mvd 使用，可以直接替代原 maven 使用，示例如下，简直不要太爽~

```bash
alias mvn-clean-aliyun='mvnd -s ~/.m2/settings.xml clean -P "aliyun,!office"'
alias mvn-deploy-aliyun='mvnd -s ~/.m2/settings.xml deploy -P "aliyun,!office"'
alias mvn-compile-aliyun='mvnd -s ~/.m2/settings.xml compile -P "aliyun,!office"'
```

## 参考资料

[https://developer.aliyun.com/article/330572](https://developer.aliyun.com/article/330572)