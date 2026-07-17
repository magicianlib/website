# 项目说明

本仓库是 Docusaurus 个人知识站，`docs/` 下是技术笔记。

## 方案 / 计划文档

superpowers（brainstorming / writing-plans 等）生成的方案文档（design spec、plan）写到 `.claude/specs/`，**不要**写到 `docs/` 下。`docs/` 是 Docusaurus 站点文档源，混入方案文档会污染目录树。

## 文档写作风格

写或改 `docs/` 下的文档时，用「知识总结」的口吻，而非「教程」口吻：

- **不要教程套话**：去掉「本文分为几个部分…」「下面是一个…的完整示例」「可以看到…」「补充两点」「最后提一个坑」这类引导与总结性语句，直奔内容。
- **陈述句为主，简洁**：像工程师写给自己看的备忘，少用对话式引导，该省的字省掉。
- **避免按「步骤」组织正文**：正文小节用陈述性标题，不要 `一、二、三` 这种序号前缀，也不要「第一步 / 接下来」的顺序叙事（纯操作步骤的有序列表除外）。
- 代码、表格、参数说明保持准确完整，这部分不变。

## 图片链接

图片（Markdown `![](url)` 与 HTML `<img src>`）的图床域名统一用占位符 `https://@media`，不写真实域名：

- 写法：`![alt](https://@media/path.png)`、`<img src="https://@media/path.png" />`
- 真实域名在 `docusaurus.config.ts` 的 `MEDIA_BASE_URL` 常量，构建时由 `src/plugins/rehype-media-base-url.ts` 自动把 `https://@media` 前缀替换为该域名
- 换图床域名只改 `MEDIA_BASE_URL` 一处，无需改文档

占位符必须带 `https://` 前缀，否则 Docusaurus 会把无协议路径当本地图片拦截（`onBrokenMarkdownImages: throw`）。HTML `<img>` 用单行写法（如 `<img src="https://@media/x.png" width="80%" />`），不要用 `style={{}}` 表达式属性或多行嵌套写法 —— MDX 编译这类 `<img>` 时直接用源码、不读 AST，插件无法替换 src。只有图片 `src` 用该占位符；正文里提到域名（如代理配置示例 `*.media.ituknown.org`）照写真实域名，不要替换。
