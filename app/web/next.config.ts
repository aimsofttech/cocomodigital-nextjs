import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions: ["ts", "tsx"],
  distDir: "build",
  /* This app lives inside the cocoma-admin-api monorepo, which has its
     own root package-lock.json. Pin the file-tracing root to this app
     so Next.js doesn't warn about / mis-infer the workspace root. */
  outputFileTracingRoot: path.join(__dirname),
  /* Phase 5j: dropped the legacy Laravel /api/* → admin.cocomadigital
     proxy rewrite. All data flows through /content-api/* now. The
     admin.cocomadigital.com hostname stays in remotePatterns below
     because legacy images (legacyImageUrl fields on docs not yet
     re-uploaded) still resolve from there. */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "admin.cocomadigital.com",
      },
      {
        protocol: "https",
        hostname: "cocomadigital.com",
      },
      {
        protocol: "https",
        hostname: "site.cocomadigital.com",
      },
      {
        protocol: "https",
        hostname: "cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com",
      },
      {
        /* Phase 5o: the API s3Storage with
           `disablePayloadAccessControl: true` returns path-style
           URLs (https://s3.<region>.amazonaws.com/<bucket>/<key>)
           via the configured S3_ENDPOINT. Add the path-style
           hostname so next/image accepts these. */
        protocol: "https",
        hostname: "s3.eu-north-1.amazonaws.com",
      },
      {
        /* Dev-only: the API returns media URLs prefixed with
           NEXT_PUBLIC_SERVER_URL (http://localhost:3002 locally).
           next/image rejects unconfigured hostnames, which crashed
           SSR on /marketing-portfolio (the only route using
           next/image with the API-served media). Allowing
           localhost on any port covers ports 3000/3002/etc. */
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async redirects() {
    return [
      /* Podcast: one canonical money page. /solutions/podcasters used
         to carry near-duplicate podcast copy, which split ranking
         signals with the service page. It now 301s so all equity lands
         on the canonical URL. Keep in sync with
         REDIRECTED_SOLUTION_SLUGS in src/app/sitemap.ts.

         2026-08-27: retargeted. b70fac9 moved the canonical money page
         out to /podcast-video-editing-marketing-services but left this
         destination pointing at the old path, which Anshu's
         admin-driven GrowthServices module has since reclaimed with a
         DIFFERENT page. So podcast equity was landing on a page this
         redirect was never meant to feed. sitemap.ts already documented
         the intended target; only this line was stale. */
      {
        source: "/solutions/podcasters",
        destination: "/podcast-video-editing-marketing-services",
        permanent: true,
      },
      /* The canonical page lived under /services/ until b70fac9. The
         old-location-plus-new-slug URL is the natural thing to type (and
         to have bookmarked), and /services/[slug] answers it with HTTP
         200 and an empty "Service Category" shell rather than a 404 —
         a soft-404 that reads to a human as "the page is broken".
         Send it to the real page instead. */
      {
        source: "/services/podcast-video-editing-marketing-services",
        destination: "/podcast-video-editing-marketing-services",
        permanent: true,
      },
      {
        source: "/service-details/:slug",
        destination: "/service/:slug",
        permanent: true,
      },
      {
        source: "/job-details/:slug",
        destination: "/job/:slug",
        permanent: true,
      },
      {
        source: "/single-video/:slug",
        destination: "/creatives/:slug",
        permanent: true,
      },
      {
        source: "/blog-details/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/client-success-stories/:slug",
        destination: "/case-studies/:slug",
        permanent: true,
      },
      {
        source: "/success-story-view-all",
        destination: "/case-studies",
        permanent: true,
      },
      {
        source: "/work/social-monetization",
        destination: "/work/ip-monetization",
        permanent: true,
      },
      /* Phase 4 canonical URL picks (per Anshu's design decisions
         logged in V2_API_DESIGN.md §7 q5). Each duplicate route
         301s to the kebab-case canonical. The old route files will
         get cleaned up in subsequent Phase 4 commits. */
      {
        source: "/solution",
        destination: "/solutions",
        permanent: true,
      },
      {
        source: "/solution/:slug",
        destination: "/solutions/:slug",
        permanent: true,
      },
      /* Phase 5+ 2026-05-23: only redirect the BARE /creatives index
         to /creative-house. Item-detail URLs (/creatives/<slug>)
         must NOT redirect — they own the SingleVideo detail page.
         Previously this redirected every /creatives/<slug> to
         /creative-house/<slug>, which is the category-filter route,
         silently hiding the per-item detail view. Live serves item
         detail at /creatives/<slug> too; we now match. */
      {
        source: "/creatives",
        destination: "/creative-house",
        permanent: true,
      },
      {
        source: "/All-web-series-portfolio",
        destination: "/marketing-portfolio",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
