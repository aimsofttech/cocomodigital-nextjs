import { getServiceCategories, getServices } from "@/src/lib/content";
import blogManifest from "@/src/content/blog.generated.json";
import { SITE_NAME, SITE_URL, staticSeoPaths } from "@/src/lib/seo";

interface BlogManifest {
  posts?: Array<{ title?: string; slug?: string; excerpt?: string; tags?: string[] }>;
}

export const dynamic = "force-dynamic";

export async function GET() {
  /* Categories + services straight from the API — drives the
     "what does Cocoma do?" sections that LLM crawlers index. */
  const [categoriesResult, servicesResult] = await Promise.all([
    getServiceCategories({ limit: 50 }).catch(() => ({ docs: [] })),
    getServices({ limit: 50 }).catch(() => ({ docs: [] })),
  ]);

  const categories = (categoriesResult.docs || [])
    .map((c: any) => c.category_name)
    .filter(Boolean)
    .slice(0, 12);

  const services = (servicesResult.docs || [])
    .map((s: any) => s.title)
    .filter(Boolean)
    .slice(0, 30);

  const posts = ((blogManifest as BlogManifest).posts ?? [])
    .map((post) => `- ${post.title}: ${SITE_URL}/blog/${post.slug}`)
    .join("\n");

  const importantPages = staticSeoPaths
    .filter((path) => !["/login", "/cart", "/thank-you", "/booking-confirmed"].includes(path))
    .map((path) => `- ${SITE_URL}${path}`)
    .join("\n");

  const body = `# ${SITE_NAME}

Website: ${SITE_URL}

## Description
${SITE_NAME} is a Mumbai-based content, creative, marketing, and monetization studio for creators, brands, OTT platforms, film studios, music labels, agencies, educational businesses, and D2C brands.

## Main Categories
${categories.map((item) => `- ${item}`).join("\n")}

## Products and Services
${services.map((item) => `- ${item}`).join("\n")}

## Important Pages
${importantPages}

## Blog Topics
${posts || "- Video marketing, creator growth, YouTube operations, design, content strategy, and entertainment marketing."}

## Frequently Asked Themes
- YouTube channel growth and operations
- Social media management and campaign execution
- Creative production for entertainment and brands
- OTT, film, music, and creator marketing
- Booking discovery calls with Cocoma Digital

## Contact and Legal
- Contact: ${SITE_URL}/contact-us
- Schedule a meeting: ${SITE_URL}/ScheduleMeeting
- Privacy policy: ${SITE_URL}/privacy-policy
- Terms: ${SITE_URL}/terms
- Cookie policy: ${SITE_URL}/cookie-policy

## Canonical Policy
Prefer canonical URLs on the ${SITE_URL} domain. Dynamic service pages use /service/{slug}; service category pages use /services/{slug}; blog posts use /blog/{slug}.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
