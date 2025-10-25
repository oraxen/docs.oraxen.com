import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nextra.site"),
  title: "Nextra",
  description: "Nextra: the Next.js site builder",
  applicationName: "Nextra",
  generator: "Next.js",
  appleWebApp: {
    title: "Nextra",
  },
  twitter: {
    site: "https://nextra.site",
  },
  icons: "/favicon.ico",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const navbar = (
    <Navbar
      logo={
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <img
            src="/logo_lowres.png"
            width={26}
            height={26}
            alt="Logo"
            style={{ imageRendering: "pixelated" }}
          />
          <span style={{ opacity: "60%" }}>Oraxen</span>
        </div>
      }
      logoLink="https://oraxen.com"
      projectLink="https://git.io/oraxen"
      // Next.js discord server
      chatLink="https://discord.gg/hEM84NMkRv"
    />
  );
  const pageMap = await getPageMap();
  const normalizedPageMap =
    Array.isArray(pageMap) &&
    pageMap.length === 1 &&
    pageMap[0] &&
    typeof pageMap[0] === "object" &&
    "children" in pageMap[0]
      ? (pageMap[0] as any).children || pageMap
      : pageMap;
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          //banner={<Banner storageKey="Nextra 2">Nextra 2 Alpha</Banner>}
          navbar={navbar}
          //footer={<Footer>MIT {new Date().getFullYear()} © Nextra.</Footer>}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/shuding/nextra/blob/main/examples/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={normalizedPageMap as any}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
