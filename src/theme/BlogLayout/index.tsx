import React, { type ReactNode, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import BlogSidebar from '@theme/BlogSidebar';
import Giscus from '@giscus/react';

import type { Props } from '@theme/BlogLayout';

// 记住 Recent posts 侧栏的滚动位置，跨文章导航后恢复，避免每次跳回顶部。
// 模块级变量在 SPA 会话内持久（切换文章不会重置）。
let savedSidebarScroll = 0;

export default function BlogLayout(props: Props): ReactNode {
  const { sidebar, toc, children, ...layoutProps } = props;
  const hasSidebar = sidebar && sidebar.items.length > 0;
  const rowRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // 路由变化（含首次挂载）后：恢复 Recent posts 侧栏滚动位置，并挂载监听持续记录。
  // 单个 effect 依赖 pathname，确保导航后能取到最新的 <nav> 节点。
  useEffect(() => {
    const nav = rowRef.current?.querySelector<HTMLElement>('.col--3 nav');
    if (!nav) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      nav.scrollTop = savedSidebarScroll;
    });
    const onScroll = () => {
      savedSidebarScroll = nav.scrollTop;
    };
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      nav.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  return (
    <Layout {...layoutProps}>
      <div className="container margin-vert--lg blog-container">
        <div className="row blog-row" ref={rowRef}>
          <BlogSidebar sidebar={sidebar} />
          <main
            className={clsx('col', {
              'col--7': hasSidebar,
              'col--9 col--offset-1': !hasSidebar,
            })}>
            {children}
            <br />
            <br />
            <Giscus
              id="comments"
              repo="magicianlib/website"
              repoId="R_kgDOQd0tew"
              category="General"
              categoryId="DIC_kwDOQd0te84Cza27"
              mapping="pathname"
              strict="0"
              reactionsEnabled="1"
              emitMetadata="0"
              inputPosition="top"
              lang="zh-CN"
              loading="lazy"
            />
          </main>
          {toc && <div className="col col--2">{toc}</div>}
        </div>
        <br />
      </div>
    </Layout>
  );
}
