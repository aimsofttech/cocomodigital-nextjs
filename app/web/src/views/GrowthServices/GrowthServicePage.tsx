import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import ArticleContent from "@/src/components/Services/growth/ArticleContent";
import CaseMedia from "@/src/components/Services/growth/CaseMedia";
import CaseStudy from "@/src/components/Services/growth/CaseStudy";
import ClosingCta from "@/src/components/Services/growth/ClosingCta";
import ClosingIllustration from "@/src/components/Services/growth/ClosingIllustration";
import FaqAccordion from "@/src/components/Services/growth/FaqAccordion";
import FeatureGrid from "@/src/components/Services/growth/FeatureGrid";
import FormatPanels from "@/src/components/Services/growth/FormatPanels";
import GrowthHero from "@/src/components/Services/growth/GrowthHero";
import ProcessTimeline from "@/src/components/Services/growth/ProcessTimeline";
import ShowcaseGrid from "@/src/components/Services/growth/ShowcaseGrid";
import StatsBand from "@/src/components/Services/growth/StatsBand";
import ChannelDashboard from "@/src/components/Services/growth/dashboards/ChannelDashboard";
import PodcastDashboard from "@/src/components/Services/growth/dashboards/PodcastDashboard";
import SocialDashboard from "@/src/components/Services/growth/dashboards/SocialDashboard";
import { Section, SectionHeading } from "@/src/components/Services/growth/Primitives";
import { optionalIcon, requiredIcon } from "@/src/components/Services/growth/icons";
import type {
  CtaLink,
  FeatureItem,
  MetricRow,
  ProcessStep,
  StatItem,
} from "@/src/components/Services/growth/types";
import {
  sectionContents,
  sectionFeatures,
  sectionShowcases,
  type GrowthCta,
  type GrowthSection,
  type GrowthService,
} from "@/src/lib/growthServices";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  SITE_URL,
} from "@/src/lib/seo";

const DASHBOARDS = {
  channel: ChannelDashboard,
  social: SocialDashboard,
  podcast: PodcastDashboard,
} as const;

const toCta = (cta: GrowthCta): CtaLink => ({
  label: cta.label,
  href: cta.href,
  variant: cta.variant,
  icon: optionalIcon(cta.icon),
});

export default function GrowthServicePage({ service }: { service: GrowthService }) {
  const { hero, caseStudy, closing, mediaAlt, seo } = service;

  const Dashboard =
    hero.dashboardKey !== "none" ? DASHBOARDS[hero.dashboardKey] : null;

  const stats: StatItem[] = service.stats.map((stat) => ({
    icon: requiredIcon(stat.icon),
    value: stat.value,
    label: stat.label,
  }));

  const caseRows: MetricRow[] = service.caseMetrics.map((metric) => ({
    label: metric.label,
    icon: optionalIcon(metric.icon),
    before: metric.before,
    after: metric.after,
    growth: metric.growth,
  }));

  const heroCtas = service.ctas.hero.map(toCta);
  const closingCtas = service.ctas.closing.map(toCta);

  /* Every icon card across the page's grid bands, flattened — these are the
     things the service actually delivers, so they become the OfferCatalog. */
  const offerItems = service.sections
    .filter((section) => section.renderer === "grid")
    .flatMap((section) => sectionFeatures(service, section))
    .map((feature) => ({ title: feature.title, description: feature.description }));

  /* Structured data.

     The canonical is resolved the same way `buildGrowthMetadata` resolves it,
     so the URL in the schema and the URL in <link rel="canonical"> can never
     disagree — a mismatch is one of the more common reasons a rich result gets
     dropped. The FAQ and offer blocks are only emitted when there is something
     to put in them: an empty FAQPage or an empty itemListElement is invalid
     and gets flagged in Search Console. */
  const pagePath = `/services/${service.slug}`;
  const canonical = absoluteUrl(seo.canonicalUrl || service.pageUrl || pagePath);
  const ogImage = seo.openGraph.image
    ? absoluteUrl(seo.openGraph.image)
    : absoluteUrl(`${pagePath}/opengraph-image`);

  const provider = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/Images/logo/main-logo.png"),
  };

  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: seo.title || service.name,
      description: seo.description,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      primaryImageOfPage: { "@type": "ImageObject", url: ogImage },
      about: { "@id": `${canonical}#service` },
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Services", path: "/solutions" },
      { name: service.name, path: pagePath },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: service.name,
      serviceType: seo.serviceType,
      provider,
      areaServed: ["India", "United States", "United Kingdom", "Singapore", "Australia"],
      url: canonical,
      image: ogImage,
      description: seo.schemaDescription,
      /* The deliverable cards are the closest thing the page has to a service
         catalogue, so they are published as one rather than left as markup a
         crawler has to infer meaning from. */
      ...(offerItems.length
        ? {
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: `${service.name} deliverables`,
              itemListElement: offerItems.map((item, index) => ({
                "@type": "Offer",
                position: index + 1,
                itemOffered: {
                  "@type": "Service",
                  name: item.title,
                  description: item.description,
                },
              })),
            },
          }
        : {}),
    },
  ];
  if (service.faqs.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: service.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  // Each band gets a stable heading id so its <section> can be labelled by it.
  const headingId = (section: GrowthSection) => `${service.slug}-${section.key}-title`;

  /* Every band's heading is an H2, so the items inside it are H3s and their
     own sub-blocks are H4s. Passing the level down rather than hard-coding it
     keeps the outline intact when the admin reorders or removes a band. */
  const ITEM_LEVEL = 3;

  const renderSectionBody = (section: GrowthSection) => {
    switch (section.renderer) {
      case "grid": {
        const items: FeatureItem[] = sectionFeatures(service, section).map((f) => ({
          icon: requiredIcon(f.icon),
          title: f.title,
          description: f.description,
        }));
        return (
          <FeatureGrid
            items={items}
            columns={section.columns}
            layout={section.layout}
            compact={section.compact}
            headingLevel={ITEM_LEVEL}
            className="mt-8"
          />
        );
      }
      case "timeline": {
        const steps: ProcessStep[] = sectionFeatures(service, section).map((f) => ({
          title: f.title,
          description: f.description,
        }));
        return <ProcessTimeline steps={steps} headingLevel={ITEM_LEVEL} />;
      }
      case "showcase":
        return (
          <ShowcaseGrid
            items={sectionShowcases(service, section)}
            headingLevel={ITEM_LEVEL}
          />
        );
      case "format-panels":
        return (
          <FormatPanels
            items={sectionShowcases(service, section)}
            headingLevel={ITEM_LEVEL}
          />
        );
      case "article":
        return <ArticleContent blocks={sectionContents(service, section)} />;
      case "case-study":
        return (
          <CaseStudy
            id={`${service.slug}-${section.key}`}
            headingLevel={ITEM_LEVEL}
            content={{
              title: caseStudy.title,
              subtitle: caseStudy.subtitle || undefined,
              paragraphs: caseStudy.paragraphs,
              rows: caseRows,
              media: <CaseMedia media={caseStudy.media} alt={mediaAlt.caseStudy} />,
            }}
          />
        );
      case "faq":
        return (
          <FaqAccordion
            items={service.faqs}
            variant={section.faqVariant}
            headingLevel={ITEM_LEVEL}
          />
        );
      default:
        return null;
    }
  };

  /* A section with nothing to show is dropped entirely — including its heading,
     which would otherwise announce a band that isn't there. */
  const hasContent = (section: GrowthSection): boolean => {
    switch (section.renderer) {
      case "grid":
      case "timeline":
        return sectionFeatures(service, section).length > 0;
      case "showcase":
      case "format-panels":
        return sectionShowcases(service, section).length > 0;
      case "article":
        return sectionContents(service, section).length > 0;
      case "case-study":
        return caseRows.length > 0 || Boolean(caseStudy.title);
      case "faq":
        return service.faqs.length > 0;
      default:
        return false;
    }
  };

  const sections = service.sections.filter(hasContent);

  return (
    <div className="w-full bg-page text-body">
      <StructuredData data={schemas} />

      {hero.headline.length > 0 && (
        <GrowthHero
          id={`${service.slug}-hero-title`}
          badge={{ icon: requiredIcon(hero.badge.icon), label: hero.badge.label }}
          headline={hero.headline}
          paragraphs={hero.paragraphs}
          ctas={heroCtas}
          trust={hero.trust}
          dashboard={Dashboard ? <Dashboard /> : null}
          dashboardAlt={mediaAlt.hero}
        />
      )}

      {stats.length > 0 && (
        <StatsBand
          id={`${service.slug}-stats-title`}
          items={stats}
          label={service.statsLabel || `${service.name} at a glance`}
        />
      )}

      {sections.map((section) => (
        <Section key={section.key} labelledBy={headingId(section)} tone={section.tone}>
          <SectionHeading
            id={headingId(section)}
            eyebrow={section.eyebrow || undefined}
            title={section.title}
            description={section.description || undefined}
          />
          {renderSectionBody(section)}
        </Section>
      ))}

      {closing.title.length > 0 && (
        <ClosingCta
          id={`${service.slug}-cta-title`}
          title={
            <>
              {closing.title.map((line, index) =>
                index === 0 ? line : <span key={line} className="block">{line}</span>,
              )}
            </>
          }
          description={closing.description}
          ctas={closingCtas}
          illustration={
            <ClosingIllustration
              variant={closing.illustrationKey}
              alt={mediaAlt.closing}
            />
          }
        />
      )}
    </div>
  );
}
