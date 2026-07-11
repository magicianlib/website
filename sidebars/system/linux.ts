import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  linux: [
    {
      type: 'category',
      label: 'VIM 文本编辑器',
      items: [
        'VIM 文本编辑器/VIM 环境配置',
        'VIM 文本编辑器/基本按键说明',
      ],
    },
    {
      type: 'category',
      label: 'Shell 知识',
      items: [
        // 解释器与语法基础
        'Shell 知识/Shell 脚本解释器',
        'Shell 知识/bash 和 sh 的区别',
        'Shell 知识/Linux 变量前导符 $',
        'Shell 知识/&& 和 ; 的区别',
        'Shell 知识/Shell 中的 getopts 命令',
        // 输入输出流
        'Shell 知识/Linux 的 stdIO 以及重定向输出',
        'Shell 知识/多行输入 EOF',
        'Shell 知识/tee 命令',
        // 文本处理
        'Shell 知识/Shell 解析文本行',
        'Shell 知识/sed 命令',
        'Shell 知识/xargs 实战技巧',
        // 配置与排错
        'Shell 知识/配置文件正确使用姿势',
        'Shell 知识/Linux 命令不能使用如何解决',
        'Shell 知识/zsh 配置',
        'Shell 知识/zsh 自定义 PROMPT 或 PS1 提示',
      ],
    },
    {
      type: 'category',
      label: '文件系统',
      items: [
        '文件系统/ln 创建软连接',
        '文件系统/dd 命令及制作 Live USB',
        '文件系统/df 磁盘分区使用分析',
        '文件系统/du 文件大小分析',
        '文件系统/mount 文件挂载',
        '文件系统/U盘格式化',
        '文件系统/磁盘分区管理',
      ],
    },
    {
      type: 'category',
      label: '文件压缩与解压',
      items: [
        '文件压缩与解压/7z 解压缩命令以及加密',
        '文件压缩与解压/tar 打包与 gzip 压缩',
      ],
    },
    {
      type: 'category',
      label: '用户与权限系统',
      items: [
        '用户与权限系统/用户管理',
        '用户与权限系统/用户组管理',

        '用户与权限系统/chage 命令',
        '用户与权限系统/chgrp 命令',
        '用户与权限系统/passwd 命令',
        '用户与权限系统/chpasswd 命令与批量创建账户',

        '用户与权限系统/系统账户信息存储文件 passwd',
        '用户与权限系统/系统密码信息存储文件 shadow',

        '用户与权限系统/组成员管理命令 groupmems',
        '用户与权限系统/主要组与普通组的区别',
        '用户与权限系统/系统用户组信息存储文件 group',
        '用户与权限系统/高级权限系统ACL',

        '用户与权限系统/su 与 sudo 命令',
        '用户与权限系统/ssh 远程登录及免密登录',

        '用户与权限系统/chmod 命令与文件权限系统',
        '用户与权限系统/chown 命令与文件归属系统',
      ],
    },
    {
      type: 'category',
      label: '网络设置',
      items: [
        '网络设置/IP 命令',
        '网络设置/ifconfig 命令',
        '网络设置/Debian 系列发行版静态 IP 设置',
        '网络设置/修改默认 DNS',
        '网络设置/Linux 命令行设置代理',
        '网络设置/curl 命令',
        '网络设置/wget 命令',
        '网络设置/scp 命令',
        '网络设置/Debian 系统缺少网络驱动问题',
      ],
    },
    {
      type: 'category',
      label: '进程与系统观测',
      items: [
        '进程与系统观测/lsof 命令',
        '进程与系统观测/pstree 命令查看进程树',
      ],
    },
    {
      type: 'category',
      label: 'Systemd',
      items: [
        'Systemd/journalctl 命令查看服务日志',
        'Systemd/如何编写服务单元',
      ],
    },
    {
      type: 'category',
      label: '定时作业',
      items: [
        '定时作业/Linux crontab 定时作业',
        '定时作业/run-parts',
      ],
    },
    {
      type: 'category',
      label: '系统设置',
      items: [
        '系统设置/Linux 系统运行模式（Runlevels）',
        '系统设置/Linux 开启关闭 GUI 界面',
        '系统设置/Debian 切换系统语言',
        '系统设置/TimeZone 时区设置',
        '系统设置/gnome 桌面 File 隐藏 Recent',
        '系统设置/Linux 安装自定义字体',
        '系统设置/Debian 系列 APT 安装 OpenJDK 及版本切换',
        '系统设置/dpkg 命令',
        '系统设置/Debian 系统镜像下载',
      ],
    },
    {
      type: 'category',
      label: '常用软件',
      items: [
        '常用软件/视频播放器',
        '常用软件/实用且强大的录屏软件',
      ],
    },
    {
      type: 'category',
      label: '虚拟机',
      items: [
        '虚拟机/Linux 安装 VMWare 及使用',
      ],
    },
  ],
};

export default sidebars;
