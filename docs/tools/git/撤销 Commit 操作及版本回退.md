## 场景

现在我们有一个仓库，按步骤进行了如下操作：

```bash
$ git status
On branch master
Your branch is up to date with 'origin/master'.

nothing to commit, working tree clean

$ ls
README.en.md README.md

$ vim README.md

$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   README.md

no changes added to commit (use "git add" and/or "git commit -a")

$ git add README.md
$ git commit -m "docs: add some docs"
```

<u>即修改之后执行 commit， 但是没有 push</u>。现在查看下 git 日志：

```bash
$ git log

commit 9839f3ae4fb932319de0490eb9fdf72ae11655e9 (HEAD -> master)
Author: magicain <example@mail.com>
Date:   Wed May 13 16:08:41 2020 +0800

    docs: add some docs

commit 55cf413cf860577849374e8793855f9988a864b2 (origin/master, origin/HEAD)
Author: magicain <example@mail.com>
Date:   Wed May 13 16:04:40 2020 +0800

    Initial commit
```

一切看起来都是正常的。但是，你突然想到你内容有误，不能进行提交！需要进行撤回怎么办？

不急，git 提供了一个 `reset` 命令，用于版本回退。

## 撤销未 push 到远程的 commit/merge

`git reset` 命令就是用于版本回退，这个可用于回退到指定版本以及回退到上个版本。

`git reset` 命令如下：

```bash
git reset [option] [HEAD^ | HEAD~1 | commit_id]
```

option 就是执行 reset 的选项，稍后说。其后跟的是版本号，比如 `HEAD^` 就是上一个版本的意思，与 `HEAD~1` 是等效的。另外，也可以直接选择具体的版本号，即 commit_id，可以使用 `git log` 命令查看。

示例（红色框标记的就是 commit_id）：

![git-log-1644677941cU4sE0](https://@media/git-media/BranchManager/git-log-1644677941cU4sE0.png)

所以，对于已经 commit（或执行 merge 后生成一个 commit）的操作，我们只需要将版本回退到 commit 之前的一个版本即可。另外，有时候我们虽然执行 merge 了，但是并没有生成新的 commit 操作，对于这种情况我们仅仅需要找到最后一次 commit 的 id，执行回退操作即可。

现在再来看下 `git reset` 的可选项 option。option 常用的有三个可选项，如下所示：

```bash
$ git reset --soft [HEAD^ | HEAD~1 | commit_id]
$ git reset --mixed [HEAD^ | HEAD~1 | commit_id]
$ git reset --hard [HEAD^ | HEAD~1 | commit_id]
```

### git reset --soft

`soft` 有柔软之意，所以该命令仅仅回撤销 `commit` 操作。即回到文件被我们 `add` 到工作空间的状态，现在来看下：

```bash
$ git reset --soft HEAD~1
$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	modified:   README.md
```

从 `git status` 命令的日志中可以看到， `README.md` 文件已经被撤销 `commit` 操作，但是依然在工作空间中（ `add` ）。

所以，现在文件虽然被撤销了 `commit` 操作，但是并没有从工作空间中撤销，这里需要注意！

### git reset --mixed（推荐）

这个命令可能是我们最常使用的命令吧，因为该命令与 `--soft` 的区别是 `--mixed` 不仅撤销文件的 `commit` 命令同时还撤销了 `add` 操作，即同时从工作空间中移除：

```bash
$ git reset --mixed HEAD~1
Unstaged changes after reset:
M	README.md

$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   README.md

no changes added to commit (use "git add" and/or "git commit -a")
```

这里想比较 `--soft` 的日志，这里很明显的区别是： `(use "git add ..." to update what will be committed)` 。所以，该命令不仅撤销 `commit` 操作还同时撤销 `add` 命令。

这个命令应该是我们最常使用的一个命令。另外，如果在使用 `git reset` 命令不指定参数默认就是该命令。即与如下命令是等效的：

```bash
$ git reset HEAD~1
```

### git reset --hard

该命令是一个相对危险的操作，因为该命令在 `--mixed` 的基础之上还撤销的文件的修改操作！即还原文件原本状态！

该命令相当于是如下组合命令：

```bash
$ git reset --mixed HEAD~1
git checkout -- <file, file ...>
```

现在执行该命令：

```bash
$ git reset --hard HEAD~1
HEAD is now at 55cf413 Initial commit
```

看到这个日志，你就发现输出的ID `55cf413` 就是远程仓库最后一次提交的日志ID，所以文件被直接回退了！

现在你在看下 `README.md` 文件，你就会发现该文件的内容就是你没有修改之前的文件。即你修改的内容被直接丢弃！

所以，该命令要慎用！

## 撤销已提交远程的 commit 及版本回退

如果 commit 操作已经 push 到远程也是做同样的操作，找到要撤销的版本的之前的任意一次提交记录（<u>一般称为版本回退</u>）。

如下：

![git-log-rollbackid-1644677934gU3mB2](https://@media/git-media/BranchManager/git-log-rollbackid-1644677934gU3mB2.png)

这里我要将版本回退到 “Fix trailing space” 这个版本，对应的提交记录是：83ebc604fb2e94461e2c2c597545c59cb1705cbc。

所以我们要执行的命令是：

```git
git reset --[soft|mixed|hard] 83ebc604fb2e94461e2c2c597545c59cb1705cbc
```

现在就将当前分支回退到 83ebc604fb2e94461e2c2c597545c59cb1705cbc 这个版本了。

**注意，现在回退的仅仅是你本地的代码版本，远程还是没变**。我们还需要做一次强制提交才行：

```git
git push origin $branchName --force
```

必须添加参数 force 进行强制提交，否则会提交失败。报错原因是：**本地项目版本号低于远端仓库版本号。**

接下来要做的是**让其他人强制更新下远程分支代码到本地**。因为同一个项目可能多个人同时修改，你这里强制提交后就相当于回滚操作，其他人可能在之前已经更新了远程代码导致本地代码版本高于远程代码版本。

所以需要通知其他成员在项目中执行下面的命令使用远程分支代码强制覆盖本地代码：

```bash
$ git pull --force  <远程主机名> <远程分支名>:<本地分支名>
```

比如 master 分支强制覆盖本地示例：

```bash
$ git pull --force origin master:master
From https://gitee.com/magicain/tomcat-cn
 + 83ebc60...d5a5684 master     -> master  (forced update) # 强制更新
warning: fetch updated the current branch head.
fast-forwarding your working tree from
commit 83ebc604fb2e94461e2c2c597545c59cb1705cbc.
Already up-to-date.
```

### Remote Rejected？

 如果在执行上面的强推命令时提示类似如下错误信息原因是你要强行 push 的分支被设置为受保护的：

```
! [remote rejected] master -> master (pre-receive hook declined)
```

这个问题出现在 Gitlab 仓库中，解决方法是按照下面的步骤依次点击：

**Settings** -> **Repository** -> **Protected Branches** -> **Unprotect**

即先将你要强制 push 的分支取消受保护，但是 **强推成功后一定要重新添加为受保护的分支**！！

![git-branch-unprotect-1644677911eJ6cF0](https://@media/git-media/BranchManager/git-branch-unprotect-1644677911eJ6cF0.png)

## 总结

`git reset` 命令主要是用于撤销操作，我们最常使用的就是 `--soft`、`--mixed` 以及 `--hard`，三者之间的关系是层层递进！

- `--soft` 用于撤销 `commit file` 操作，即回退到 `add file` 。
- `--mixed` 比较 `--soft` 就更加强势，直接回退到 `change file` ，也是推荐的方式。
- `--hard` 则是直接放弃本次修改。该命令比较危险！
