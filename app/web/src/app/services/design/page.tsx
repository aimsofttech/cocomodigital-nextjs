import type { Metadata } from "next";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import DesignPage from "@/src/views/Services/Design/DesignPage";
import {
  DESIGN_BLOCKS,
  DESIGN_FAQ,
  DESIGN_META,
  DESIGN_PATH,
} from "@/src/views/Services/Design/designData";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
} from "@/src/lib/seo";

/* Static route — a literal segment wins over /services/[slug], so the
   admin-driven service pages are untouched. Copy and artwork live in
   src/views/Services/Design/designData.ts rather than the API: the page was
   approved as a mockup and ships with placeholders that Kirk swaps by hand. */

/* The shared header and footer pull their nav from the API, so this route
   renders per request like every other public page. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: DESIGN_META.title,
  description: DESIGN_META.description,
  path: DESIGN_PATH,
  category: "Services",
  /* No `image`: the site default cover is the share card for now. */
});

export default function DesignServicesRoute() {
  const canonical = absoluteUrl(DESIGN_PATH);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: DESIGN_META.breadcrumbLabel,
    serviceType: "Design services",
    description: DESIGN_META.description,
    url: canonical,
    provider: { "@id": `${SITE_URL}/#organization`, name: SITE_NAME },
    areaServed: ["India", "United States", "United Kingdom", "Singapore", "Australia"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Design services",
      itemListElement: DESIGN_BLOCKS.map((block, index) => ({
        "@type": "Offer",
        position: index + 1,
        itemOffered: {
          "@type": "Service",
          name: block.title.join(" "),
          description: block.paragraph,
        },
      })),
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: DESIGN_FAQ.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  /* Two levels only: there is no /services index page to point a middle
     crumb at (see the podcast route for the same call). */
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: DESIGN_META.breadcrumbLabel, path: DESIGN_PATH },
  ]);

  return (
    <>
      <StructuredData data={[serviceSchema, faqSchema, breadcrumbSchema]} />
      <DesignPage />
    </>
  );
}
