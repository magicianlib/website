import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
    java: [
        '命令行临时切换 JDK 版本',
        'Java 内省机制',
        'i18n 国际化实现',
        'Bean Validation',
        'Caffeine 高性能本地缓存',
        'HTTP 客户端 OkHttp',
        'Maven 配置',
        'MyBatis 自定义 TypeHandler',
        'Tomcat 源码构建',
        {
            type: 'category',
            label: 'Java8 日期',
            collapsed: true, // 默认折叠
            items: [
                'Java8 日期/java.time 正确使用姿势',
                'Java8 日期/日期格式化 DateTimeFormatter',
                'Java8 日期/Duration 和 Period 的区别',
            ],
        },
        {
            type: 'category',
            label: 'Jackson 实战',
            collapsed: true, // 默认折叠
            items: [
                'Jackson 实战/关于 Jackson',
                {
                    type: 'category',
                    label: '基础用法',
                    collapsed: true,
                    items: [
                        'Jackson 实战/基础用法/ObjectMapper 配置',
                        'Jackson 实战/基础用法/JSON 序列化',
                        'Jackson 实战/基础用法/JSON 反序列化',
                        'Jackson 实战/基础用法/字段驼峰转换',
                        'Jackson 实战/基础用法/节点模型 ObjectNode 与 ArrayNode',
                        'Jackson 实战/基础用法/java.time 日期格式问题',
                        'Jackson 实战/基础用法/时区问题',
                    ],
                },
                {
                    type: 'category',
                    label: '高级特性',
                    collapsed: true,
                    items: [
                        'Jackson 实战/高级特性/序列化时自定义 NULL 输出',
                        'Jackson 实战/高级特性/枚举类序列化与反序列化',
                        'Jackson 实战/高级特性/BigDecimal 序列化为字符串',
                        'Jackson 实战/高级特性/敏感数据脱敏',
                        'Jackson 实战/高级特性/多态类型反序列化',
                        'Jackson 实战/高级特性/JacksonUtils 工具类封装',
                    ],
                },
                {
                    type: 'category',
                    label: '其他格式',
                    collapsed: true,
                    items: [
                        'Jackson 实战/其他格式/XML 序列化',
                        'Jackson 实战/其他格式/MessagePack 二进制序列化',
                    ],
                },
            ],
        },
    ],
};

export default sidebars;
