import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/lib/seo";

const disallowPaths = [
  "/api/",
  "/admin/",
  "/login",
  "/cart",
  "/ScheduleMeeting",
  "/schedule-meeting",
  "/booking-confirmed",
  "/thank-you",
  "/job-application/",
];

const aiCrawlers = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "GoogleOther",
  "CCBot",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPaths,
      },
      ...aiCrawlers.map((bot) => ({
        userAgent: bot,
        allow: "/",
        disallow: disallowPaths,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}