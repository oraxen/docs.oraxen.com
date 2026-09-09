import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Oraxen Documentation',
  tagline: 'Create custom content for Minecraft.',
  favicon: 'favicon.ico',
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
    },
  ],
  future: {v4: true},
  url: 'https://docs.oraxen.com',
  baseUrl: '/',
  organizationName: 'miziusLabs',
  projectName: 'OraxenDocs',
  onBrokenLinks: 'throw',
  i18n: {defaultLocale: 'en', locales: ['en']},
  plugins: [
    './plugins/raw-docs',
    ['@easyops-cn/docusaurus-search-local', {
      docsRouteBasePath: '/',
      indexBlog: false,
      indexPages: false,
      language: ['en'],
      hashed: true,
      searchBarPosition: 'right',
      searchResultContextMaxLength: 100,
      explicitSearchResultPath: true,
    }],
  ],
  presets: [['classic', {
    docs: {
      sidebarPath: './sidebars.js',
      routeBasePath: '/',
      editUrl: 'https://github.com/miziusLabs/OraxenDocs/edit/main/',
    },
    blog: false,
    theme: {customCss: './src/css/custom.css'},
  }]],
  themeConfig: {
    announcementBar: {
      id: 'bedrockgen-support',
      content: '<strong>NEW</strong>; Oraxen now supports Bedrock and Geyser through the <a href="/compatibility/bedrock/bedrockgen/">BedrockGen addon</a>.',
      backgroundColor: '#e0f2fe',
      textColor: '#0b2d35',
      isCloseable: true,
    },
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'Oraxen',
      logo: {alt: 'Oraxen logo', src: 'img/logo.png'},
      items: [{type: 'search', position: 'right'}],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['java', 'groovy', 'powershell', 'batch', 'yaml'],
    },
  },
};

export default config;
