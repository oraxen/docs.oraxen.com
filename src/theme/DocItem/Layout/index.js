import React from 'react';
import clsx from 'clsx';
import Head from '@docusaurus/Head';
import {useWindowSize} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import ContentVisibility from '@theme/ContentVisibility';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import DocItemContent from '@theme/DocItem/Content';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocVersionBadge from '@theme/DocVersionBadge';
import DocVersionBanner from '@theme/DocVersionBanner';
import SearchBar from '@theme/SearchBar';

import styles from './styles.module.css';

function DiscordComponentEmbed({metadata}) {
  const payload = {
    component: {
      type: 17,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `# ${metadata.title}\n${metadata.description}`,
            },
          ],
        },
      ],
    },
  };

  return (
    <Head>
      <script id="discord:component-embed" type="application/json">
        {JSON.stringify(payload).replaceAll('<', '\\u003c')}
      </script>
    </Head>
  );
}

function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();
  const canRender = !frontMatter.hide_table_of_contents && toc.length > 0;

  return {
    mobile: canRender ? <DocItemTOCMobile /> : undefined,
    desktop:
      canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
        <DocItemTOCDesktop />
      ) : undefined,
  };
}

export default function DocItemLayout({children}) {
  const docTOC = useDocTOC();
  const {metadata} = useDoc();

  return (
    <>
      <DiscordComponentEmbed metadata={metadata} />
      <div className="row">
        <div className={clsx('col', styles.docItemCol)}>
          <ContentVisibility metadata={metadata} />
          <DocVersionBanner />
          <div className={styles.docItemContainer}>
            <article>
              <DocBreadcrumbs />
              <DocVersionBadge />
              {docTOC.mobile}
              <DocItemContent>{children}</DocItemContent>
              <DocItemFooter />
            </article>
            <DocItemPaginator />
          </div>
        </div>
        <aside className={clsx('col col--3', styles.rightSidebar)}>
          <div className={styles.rightSidebarViewport}>
            <div className={styles.search}>
              <SearchBar />
            </div>
            {docTOC.desktop}
          </div>
        </aside>
      </div>
    </>
  );
}
