// rehype 插件: 构建时把图片 src 中的占位 token 替换为配置的图床域名
//
// 文档里写:
//   ![alt](https://@media/path.png)        ->  ![alt](https://media.ituknown.org/path.png)
//   <img src="https://@media/path.png" />  ->  <img src="https://media.ituknown.org/path.png" />
//
// Markdown 图片在 hast 阶段是标准 element (tagName/properties.src);
// HTML <img> 在 MDX 里是 mdxJsxFlowElement (name/attributes[]). 两种节点都处理.

interface MdxAttribute {
    type: string;
    name: string;
    value?: unknown;
}

interface HastNode {
    type: string;
    tagName?: string;
    name?: string;
    properties?: Record<string, unknown>;
    attributes?: MdxAttribute[];
    children?: HastNode[];
}

interface MediaBaseUrlOptions {
    /** 占位 token, 图片 src 以此开头时触发替换, 如 https://@media */
    token: string;
    /** 图床域名, 末尾的斜杠会被自动去除 */
    baseUrl: string;
}

export default function rehypeMediaBaseUrl({ token, baseUrl }: MediaBaseUrlOptions) {
    const base = baseUrl.replace(/\/+$/, '');
    const rewrite = (value: string) =>
        value.startsWith(token) ? base + value.slice(token.length) : value;
    return (tree: HastNode) => {
        const walk = (node: HastNode) => {
            if (node.tagName === 'img' || node.name === 'img') {
                // 标准 hast element: properties.src
                const props = node.properties;
                if (props && typeof props.src === 'string') {
                    props.src = rewrite(props.src);
                }
                // MDX JSX 元素: attributes[]
                if (node.attributes) {
                    for (const attr of node.attributes) {
                        if (attr.name === 'src' && typeof attr.value === 'string') {
                            attr.value = rewrite(attr.value);
                        }
                    }
                }
            }
            for (const child of node.children ?? []) {
                walk(child);
            }
        };
        walk(tree);
    };
}
