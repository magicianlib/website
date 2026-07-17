# 可配置图床域名（占位符 + rehype 构建替换）

## 背景与目标

全站图片链接硬编码 `https://media.ituknown.org`，54 个 `.md` 文件共 226 处（Markdown 图片 + HTML `<img>`）。换图床域名需逐个改。

目标：换域名只改 `docusaurus.config.ts` 一处常量。

## 最终方案

文档图片用占位符 `https://@media`，rehype 插件构建时把 `img.src` 开头的 `https://@media` 替换为 `MEDIA_BASE_URL` 真实域名。

```
![alt](https://@media/path.png)   →   ![alt](https://media.ituknown.org/path.png)
```

## 关键约束（实现中发现）

1. **占位符必须带协议**：Docusaurus 内置 `transformImage`（remark 插件）早于用户插件运行（见 `mdx-loader/lib/processor.js`，用户 `remarkPlugins` 排在 `transformImage` 之后），把无协议 URL 当本地图片解析，触发 `onBrokenMarkdownImages: 'throw'`。故占位符用 `https://@media`（带协议，`transformImage` 放行）。

2. **JSX `<img>` 须单行独立写法**：MDX 对含 JSX 表达式属性（如 `style={{width:'80%'}}`）或多行嵌套（如 `<div><img/></div>`）的 `<img>`，编译时直接用源码文本、不读 hast attributes，rehype 插件无法替换 src。须写成单行 `<img src="..." width=".." />`（参考已替换的 JavaTimeModule、vlc-player 等）。

3. **rehype 而非 remark**：Markdown 图片（hast `element`，`properties.src`）与 HTML `<img>`（`mdxJsxFlowElement`，`attributes[]`）在 hast 阶段统一遍历处理。

## 实现

- `src/plugins/rehype-media-base-url.ts`：零依赖手写递归遍历，同时处理 `element`（`properties.src`）和 `mdxJsxFlowElement`（`attributes` 中 `src`）。
- `docusaurus.config.ts`：`MEDIA_BASE_URL` 常量 + 共享 `rehypePlugins` 数组（`rehypeKatex` + `[rehypeMediaBaseUrl, { token: 'https://@media', baseUrl: MEDIA_BASE_URL }]`），13 个 docs 实例 + blog 共用（顺手 DRY 原本重复的 `rehypePlugins: [rehypeKatex]`）。
- 依赖：无新增（避开 pnpm store 版本问题，手写遍历）。

## 迁移

- 226 处 `https://media.ituknown.org` → `https://@media`（一次性脚本，已确认全是图片引用，2 处正文代理配置示例正确保留）。
- 3 处 blog 的多行 `<div style={{}}><img style={{}}/></div>` 改为单行 `<img src width alt />`（`Cache Line` 2 处 + `生成随机数 Seed` 1 处）。

## 验证

- `pnpm build` 通过
- 所有 HTML（docs + blog，含列表页/单篇页）图片 `src` 替换为 `media.ituknown.org`
- `media.ituknown.org` 硬编码仅剩 `docusaurus.config.ts` 常量那一处

## 涉及文件

- 新增：`src/plugins/rehype-media-base-url.ts`
- 改：`docusaurus.config.ts`、`CLAUDE.md`
- 改：54 个 `.md`（链接迁移）+ 2 个 blog `.md`（img 写法调整）

## 备注

blog 的 client JS chunk（`dbfc4782.*.js`）含 raw markdown excerpt 元数据字符串（带 `@media`），但该字符串不渲染为图片（blog 列表页不显示 excerpt 图片）、不进 HTML、DocSearch 抓取的是替换后的 HTML，对图片显示与搜索均无影响。
