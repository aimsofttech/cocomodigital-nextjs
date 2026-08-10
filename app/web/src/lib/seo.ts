import type { Metadata } from "next";

export const SITE_URL = "https://cocomadigital.com";
export const SITE_NAME = "Cocoma Digital";
export const DEFAULT_OG_IMAGE = "/Images/og-cover.jpg";

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  category?: string;
}

const DEFAULT_KEYWORDS = [
  "Cocoma Digital",
  "YouTube marketing",
  "creator growth",
  "content marketing",
  "OTT marketing",
  "social media management",
  "creative house",
  "marketing campaigns",
];

export const staticPageSeo: Record<string, PageSeo> = {
  "/": {
    title: "Cocoma Digital - YouTube, creative and social media growth studio",
    description:
      "Cocoma Digital is a Mumbai content, creative, marketing, and monetization studio for creators, brands, platforms, and studios.",
    path: "/",
    category: "Home",
  },
  "/about-us": {
    title: "About Cocoma Digital",
    description:
      "Meet Cocoma Digital, the 60-person Mumbai studio helping creators, brands, platforms, and studios grow through content and marketing.",
    path: "/about-us",
    category: "Company",
  },
  "/contact-us": {
    title: "Contact Cocoma Digital",
    description:
      "Contact Cocoma Digital for YouTube growth, social media, creative production, marketing campaigns, and content partnerships.",
    path: "/contact-us",
    category: "Contact",
  },
  "/blog": {
    title: "Cocoma Digital Blog",
    description:
      "Notes from Cocoma Digital on video, design, growth, content operations, YouTube channels, and entertainment marketing.",
    path: "/blog",
    category: "Blog",
  },
  "/career": {
    title: "Careers at Cocoma Digital",
    description:
      "Explore open roles at Cocoma Digital across editing, design, marketing, channel operations, and creative production.",
    path: "/career",
    category: "Careers",
  },
  "/gallery": {
    title: "Gallery - Inside the Cocoma studio",
    description:
      "Real photos from inside Cocoma Digital's Mumbai studio, including team life, festivals, production days, and partner visits.",
    path: "/gallery",
    category: "Gallery",
  },
  "/team": {
    title: "Cocoma Digital Team",
    description:
      "Meet the people behind Cocoma Digital's creative, production, marketing, and channel growth work.",
    path: "/team",
    category: "Company",
  },
  "/tools": {
    title: "Creator and Marketing Tools",
    description:
      "Practical planning tools for creators, studios, and brands building video, social, and content marketing campaigns.",
    path: "/tools",
    category: "Tools",
  },
  "/research": {
    title: "Research and Insights",
    description:
      "Cocoma Digital research and insights on creator growth, entertainment marketing, social platforms, and audience behavior.",
    path: "/research",
    category: "Research",
  },
  "/marketing-portfolio": {
    title: "Marketing Portfolio",
    description:
      "Explore Cocoma Digital's marketing campaign work across OTT, YouTube, films, music, brands, and entertainment IP.",
    path: "/marketing-portfolio",
    category: "Portfolio",
  },
  "/creative-house": {
    title: "Creative House",
    description:
      "Cocoma Digital's creative house produces video, social, design, motion, and content assets for brands and creators.",
    path: "/creative-house",
    category: "Services",
  },
  "/case-studies": {
    title: "Case Studies",
    description:
      "Read Cocoma Digital case studies across YouTube growth, social media, content marketing, and creative campaigns.",
    path: "/case-studies",
    category: "Case Studies",
  },
  "/solutions": {
    title: "Solutions",
    description:
      "Cocoma Digital solutions for creators, brands, platforms, agencies, film studios, music labels, and education businesses.",
    path: "/solutions",
    category: "Solutions",
  },
  "/ScheduleMeeting": {
    title: "Schedule a Meeting",
    description:
      "Schedule a discovery call with Cocoma Digital to discuss content, YouTube, social media, creative, or marketing goals.",
    path: "/ScheduleMeeting",
    category: "Contact",
  },
  "/schedule-meeting": {
    title: "Schedule Meeting Details",
    description:
      "Confirm your discovery call details with Cocoma Digital.",
    path: "/schedule-meeting",
    category: "Contact",
    noIndex: true,
  },
  "/booking-confirmed": {
    title: "Booking Confirmed",
    description:
      "Your Cocoma Digital meeting has been confirmed.",
    path: "/booking-confirmed",
    category: "Contact",
    noIndex: true,
  },
  "/thank-you": {
    title: "Thank You",
    description:
      "Thank you for contacting Cocoma Digital.",
    path: "/thank-you",
    category: "Utility",
    noIndex: true,
  },
  "/cart": {
    title: "Your Call Agenda",
    description:
      "Review the Cocoma Digital services and topics you want to discuss on your discovery call.",
    path: "/cart",
    category: "Utility",
    noIndex: true,
  },
  "/login": {
    title: "Login",
    description: "Cocoma Digital login.",
    path: "/login",
    category: "Utility",
    noIndex: true,
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description:
      "Read Cocoma Digital's privacy policy and how visitor, client, and applicant information is handled.",
    path: "/privacy-policy",
    category: "Legal",
  },
  "/terms": {
    title: "Terms and Conditions",
    description:
      "Read Cocoma Digital's terms and conditions for website usage, services, and engagement policies.",
    path: "/terms",
    category: "Legal",
  },
  "/cookie-policy": {
    title: "Cookie Policy",
    description:
      "Read Cocoma Digital's cookie policy and how cookies support site functionality and analytics.",
    path: "/cookie-policy",
    category: "Legal",
  },
  "/coming-soon": {
    title: "Coming Soon",
    description: "A new Cocoma Digital page is coming soon.",
    path: "/coming-soon",
    category: "Utility",
    noIndex: true,
  },
};

const routeTitles: Record<string, string> = {
  "/All-web-series-portfolio": "All Web Series Portfolio",
  "/work/content-created": "Content Created",
  "/work/ip-monetization": "IP Monetization Work",
  "/work/marketing-campaigns": "Marketing Campaign Work",
  "/work/smm-management": "Social Media Management Work",
  "/solutions/youtube-creators": "YouTube Creator Solutions",
  "/solutions/real-estate-brands": "Real Estate Brand Solutions",
  "/solutions/independent-artists": "Independent Artist Solutions",
  "/solutions/podcasters": "Podcast Growth Solutions",
  "/solutions/film-studios": "Film Studio Marketing Solutions",
  "/solutions/ott-platforms": "OTT Platform Marketing Solutions",
  "/solutions/educational-hubs": "Educational Hub Marketing Solutions",
  "/solutions/music-labels": "Music Label Marketing Solutions",
  "/solutions/d2c-brands": "D2C Brand Marketing Solutions",
  "/solutions/international-agencies": "International Agency Solutions",
};

export const staticSeoPaths = Array.from(
  new Set([...Object.keys(staticPageSeo), ...Object.keys(routeTitles)])
);

export function absoluteUrl(pathOrUrl = "/"): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value: string, max = 160): string {
  const clean = stripHtml(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function getStaticSeo(path: string): PageSeo {
  if (staticPageSeo[path]) return staticPageSeo[path];
  const title = routeTitles[path] ?? path.split("/").filter(Boolean).join(" ");
  return {
    title,
    description: `${title} from Cocoma Digital, a content, creative, marketing, and monetization studio for creators, brands, platforms, and studios.`,
    path,
    category: title,
  };
}

export function buildMetadata(input: PageSeo): Metadata {
  /* Callers like generateMetadata for detail pages frequently pass
     imageUrl(doc) which returns "" when the doc has no media. `??`
     wouldn't catch that, so empty strings would resolve to the site
     root and produce a broken OG image. `||` handles both null/
     undefined and the empty-string case. */
  const image = absoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const canonical = absoluteUrl(input.path);
  const title = input.title.includes(SITE_NAME)
    ? input.title
    : `${input.title} | ${SITE_NAME}`;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title,
    description: input.description,
    keywords: [...DEFAULT_KEYWORDS, ...(input.keywords ?? [])],
    alternates: { canonical },
    robots: input.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: input.category ?? "Marketing",
    openGraph: {
      title,
      description: input.description,
      url: canonical,
      type: input.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: input.imageAlt ?? `${input.title} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      site: "@cocomadigital",
      creator: "@cocomadigital",
      images: [image],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/Images/logo/main-logo.png"),
    sameAs: [
      "https://www.instagram.com/cocomadigital/",
      "https://www.linkedin.com/company/cocoma-digital/",
      "https://www.youtube.com/@cocomadigital",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-IN",
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    areaServed: ["India", "United States", "United Kingdom", "Singapore", "Australia"],
    priceRange: "$$",
  };
}
