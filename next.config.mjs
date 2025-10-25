import nextra from "nextra";

const withNextra = nextra({
  latex: true,
  search: {
    codeblocks: false,
  },
  contentDirBasePath: "/",
});

export default withNextra({
  reactStrictMode: true,
  turbopack: {
    root: "/Users/thomas/minecraft/docs.oraxen.com",
    resolveAlias: {
      "next-mdx-import-source-file": "./next-mdx-import-source-file.ts",
    },
  },
});
