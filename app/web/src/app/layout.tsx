import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

import StructuredData from "../components/common/StructuredData/StructuredData";
import Providers from "./providers";
import SiteShell from "./site-shell";
import {
  buildMetadata,
  localBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "../lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Cocoma Digital - YouTube, creative and social media growth studio",
    description:
      "Cocoma Digital is a content, creative, marketing, and monetization partner for creators, brands, platforms, and studios.",
    path: "/",
    category: "Marketing",
  }),
  icons: {
    /* public/favicon.ico does not exist — the .ico entries made every
       page log a 404 in the console. favicon.svg is the real asset. */
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
    shortcut: ["/favicon.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* /content-api/* are route handlers that return JSON; they must
     not be wrapped in the marketing shell. The proxy exposes the
     request pathname as `x-pathname`; bail out to bare children. */
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  if (pathname.startsWith("/content-api")) {
    return <>{children}</>;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Google Fonts */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,1..1000;1,1..1000&display=swap"
        />

        {/* Fontshare */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>

      <body suppressHydrationWarning>
        <StructuredData
          data={[
            organizationJsonLd(),
            websiteJsonLd(),
            localBusinessJsonLd(),
          ]}
        />

        <Providers>
          {/* Phase 0 Studio 2026-05-23: skip the public-site
              chrome (Header / Footer / cart / brand strip) for
              /studio and /caspian — each renders its own top bar.
              Caspian is the media library: an internal tool on a public
              domain, so it takes no marketing chrome and is noindexed.
              Keeps <html><body> + fonts + Providers so theme
              variables and Tailwind layers still apply. */}
          {pathname.startsWith("/studio") || pathname.startsWith("/caspian") ? (
            <>{children}</>
          ) : (
            <SiteShell>{children}</SiteShell>
          )}
        </Providers>
      </body>
    </html>
  );
}