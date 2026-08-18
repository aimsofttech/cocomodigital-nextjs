import StructuredData from "@/src/components/common/StructuredData/StructuredData";
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
  sectionFeatures,
  sectionShowcases,
  type GrowthCta,
  type GrowthSection,
  type GrowthService,
} from "@/src/lib/growthServices";

/**
 * One renderer for all three growth landing pages.
 *
 * Everything on the page comes from the API: the hero, the section list and
 * their order, the items in each section, the case study, the FAQ and both CTA
 * groups. The section components themselves are unchanged — this layer only
 * resolves stored icon names into components and maps each section's renderer
 * to the right one.
 *
 * Sections the admin hasn't given any items are skipped rather than rendered
 * as an empty band, so a half-populated page still reads as finished.
 */

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
  const { hero, caseStudy, closing, seo } = service;

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

  /* Structured data. The FAQ block is only emitted when there are questions —
     an empty FAQPage is invalid and would be flagged in Search Console. */
  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      serviceType: seo.serviceType,
      provider: {
        "@type": "Organization",
        name: "Cocoma Digital",
        url: "https://cocomadigital.com",
      },
      url: service.pageUrl,
      description: seo.schemaDescription,
    },
  ];
  if (service.faqs.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  // Each band gets a stable heading id so its <section> can be labelled by it.
  const headingId = (section: GrowthSection) => `${service.slug}-${section.key}-title`;

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
            className="mt-8"
          />
        );
      }
      case "timeline": {
        const steps: ProcessStep[] = sectionFeatures(service, section).map((f) => ({
          title: f.title,
          description: f.description,
        }));
        return <ProcessTimeline steps={steps} />;
      }
      case "showcase":
        return <ShowcaseGrid items={sectionShowcases(service, section)} />;
      case "format-panels":
        return <FormatPanels items={sectionShowcases(service, section)} />;
      case "case-study":
        return (
          <CaseStudy
            content={{
              title: caseStudy.title,
              subtitle: caseStudy.subtitle || undefined,
              paragraphs: caseStudy.paragraphs,
              rows: caseRows,
              media: <CaseMedia media={caseStudy.media} />,
            }}
          />
        );
      case "faq":
        return <FaqAccordion items={service.faqs} variant={section.faqVariant} />;
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
        />
      )}

      {stats.length > 0 && (
        <StatsBand items={stats} label={service.statsLabel || `${service.name} at a glance`} />
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
                /* The first line sits inline with the heading; the rest each
                   take their own line, matching the designed line breaks. */
                index === 0 ? line : <span key={line} className="block">{line}</span>,
              )}
            </>
          }
          description={closing.description}
          ctas={closingCtas}
          illustration={<ClosingIllustration variant={closing.illustrationKey} />}
        />
      )}
    </div>
  );
}
