import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Oraxen Documentation',
  tagline: 'Create custom content for Minecraft.',
  favicon: 'favicon.ico',
  future: {v4: true},
  url: 'https://oraxen.mizius.com',
  baseUrl: '/',
  organizationName: 'oraxen',
  projectName: 'docs.oraxen.com',
  onBrokenLinks: 'throw',
  i18n: {defaultLocale: 'en', locales: ['en']},
  plugins: ['./plugins/raw-docs'],
  presets: [['classic', {
    docs: {
      sidebarPath: './sidebars.js',
      routeBasePath: '/',
      editUrl: 'https://github.com/pxlarified/docs.oraxen.com/edit/main/',
    },
    blog: false,
    theme: {customCss: './src/css/custom.css'},
  }]],
  themeConfig: {
    image: 'img/logo.png',
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'Oraxen',
      logo: {alt: 'Oraxen logo', src: 'img/logo.png'},
      items: [],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['java', 'groovy', 'powershell', 'batch', 'yaml'],
    },
  },
};

export default config;
