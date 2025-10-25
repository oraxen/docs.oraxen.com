import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "./external-link.css";

// Custom logo wrapper that opens external links in new tab
function LogoWithExternalIcon() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <img
        src="/logo_lowres.png"
        width={26}
        height={26}
        alt="Logo"
        style={{ imageRendering: "pixelated" }}
      />
      <span style={{ opacity: "60%" }}>Get Oraxen</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="14"
        height="14"
        style={{ opacity: "0.5", marginLeft: "2px" }}
      >
        <path
          fillRule="evenodd"
          d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3h8.25a.75.75 0 0 1 0 1.5H5.25Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.oraxen.com"),
  title: "Oraxen Docs",
  description: "Oraxen: Create custom items & blocks for Minecraft",
  applicationName: "Oraxen Docs",
  generator: "Next.js",
  appleWebApp: {
    title: "Oraxen Docs",
  },
  twitter: {
    site: "https://docs.oraxen.com",
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
      logo={<LogoWithExternalIcon />}
      logoLink="https://oraxen.com"
      projectLink="https://git.io/oraxen"
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
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                const logoLink = document.querySelector('nav a[href="https://oraxen.com"]');
                if (logoLink) {
                  logoLink.setAttribute('target', '_blank');
                  logoLink.setAttribute('rel', 'noopener noreferrer');
                }
              });
            `,
          }}
        />
      </Head>
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
