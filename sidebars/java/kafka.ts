import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
    kafka: [
        '集群部署',
        '核心概念与架构',
        'Topic 管理',
        'Topic 最佳实践',
        'Docker Compose 部署',
        'PostgreSQL 连接器',
        'Debezium 消费与下游同步',
    ],
};

export default sidebars;
