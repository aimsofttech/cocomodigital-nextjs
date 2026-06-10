// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { HiArrowUpRight } from "react-icons/hi2";

/* Studio-life band photos sourced from the shared /gallery
   data file so a single content update flows to /about-us,
   /gallery, AND any /work/* page that opts into the band via
   data.studioLife. */
import { getFeaturedPhotos } from "../../Gallery/galleryPhotos";

/* Reused trust components from the SingleVideo + Services
   pages so every conversion-oriented page on the site uses the
   same credibility crescendo. */
import CredentialsStrip from "../../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import TrustedBrandsMarquee from "../../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";
/* Section12 (admin-driven "Get my free creative consultation"
   block) and HireOrJoin (Hire Cocoma / Join Cocoma fork) are
   intentionally NOT imported on /work/* pages — both use
   generic / video-production framing that reads as off-topic
   on a portfolio page aimed at content owners. The closing
   CTA is replaced by a per-page customizable card driven by
   data.closingCta below. */
import FloatingCallChip from "../../../components/SingleVideo/FloatingCallChip/FloatingCallChip";

/**
 * <WorkCategoryPage />
 *
 * Reusable shell for /work/<category> portfolio pages. Renders
 * one consistent structure (hero + featured case study + grid +
 * methodology + trust crescendo + partner quote + closing CTA)
 * driven by a `data` prop. Adding a new /work/* page is now a
 * matter of creating a new data file and wiring the route in
 * App.jsx — no per-page component code required.
 *
 * `data` shape: see ipMonetizationData.js for the contract.
 */
export default function WorkCategoryPage({ data }) {
  if (!data) return null;

  const {
    meta,
    schema,
    hero,
    audience,
    caseStudies,
    methodology,
    credentials,
    partnerQuote,
    studioLife,
    closingCta,
  } = data;

  /* Studio-life thumbnails — pull the first 4 featured photos
     from the gallery data. Capped at 4 so the row stays a
     tight visual strip, not a competing photo feed. Page-level
     opt-in is via data.studioLife (omit to skip). */
  const studioPhotos = studioLife
    ? getFeaturedPhotos().slice(0, 4)
    : [];

  /* First case study is the FEATURED hero card; rest fill the
     3-up grid below. Splitting the array here so the JSX stays
     declarative + the data file doesn't have to flag which
     entry is featured (just put it first). */
  const featuredCase = caseStudies?.[0];
  const gridCases = caseStudies?.slice(1) || [];

  /* Service + BreadcrumbList schemas. Same shape used on
     /services/:slug + /service/:slug so AI engines see
     consistent entity structure across the work hub. */
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: schema?.name,
    description: schema?.description,
    serviceType: schema?.serviceType,
    url: `https://cocomadigital.com${meta?.path}`,
    provider: { "@id": "https://cocomadigital.com/#organization" },
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "United Kingdom" },
      { "@type": "Country", name: "Singapore" },
      { "@type": "Country", name: "Australia" },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://cocomadigital.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Our Work",
        item: "https://cocomadigital.com/work",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: schema?.name,
        item: `https://cocomadigital.com${meta?.path}`,
      },
    ],
  };

  return (
    <>

      <div className="work-page-wrapper">
        <div className="work-page-main">
          {/* ================== 1. HERO ================== */}
          <section className="work-hero">
            <p className="work-hero-eyebrow">{hero?.eyebrow}</p>
            <h1 className="work-hero-title font-primary">
              {hero?.title?.prefix && (
                <>
                  {hero.title.prefix}{" "}
                </>
              )}
              <span className="work-hero-title-highlight">
                {hero?.title?.highlighted}
              </span>
              {hero?.title?.suffix && <> {hero.title.suffix}</>}
            </h1>
            <p className="work-hero-subtitle">{hero?.subtitle}</p>

            {/* Stat tiles — sticker treatment, 4-up desktop,
                2-up tablet, 2-up mobile (number is the anchor,
                label can wrap). */}
            <div className="work-hero-stats">
              {hero?.stats?.map((stat, idx) => (
                <div key={idx} className="work-hero-stat-tile">
                  <span className="work-hero-stat-value font-primary">
                    {stat.value}
                  </span>
                  <span className="work-hero-stat-label">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ============= 2. WHO BENEFITS FROM THIS ============= */}
          {/* Situation-based audience filter — answers "is this
              for me?" early so the right reader stays engaged
              through the case studies that map to their world.
              Pages without an `audience` block in data simply
              skip this section. */}
          {audience?.items?.length > 0 && (
            <section className="work-audience-section">
              <h2 className="work-section-heading font-primary">
                <span>{audience.heading}</span>
              </h2>
              <div className="work-audience-grid">
                {audience.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <article key={idx} className="work-audience-card">
                      {Icon && (
                        <div
                          className="work-audience-card-icon"
                          aria-hidden="true"
                        >
                          <Icon />
                        </div>
                      )}
                      <h3 className="work-audience-card-title font-primary">
                        {item.title}
                      </h3>
                      <p className="work-audience-card-description">
                        {item.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============= 3. FEATURED CASE STUDY ============= */}
          {featuredCase && (
            <section className="work-featured-case">
              <h2 className="work-section-heading font-primary">
                <span className="work-section-number">01</span>
                <span>Featured Story</span>
              </h2>

              <article className="work-featured-card">
                <div className="work-featured-card-image">
                  {featuredCase.image ? (
                    <Image
                      src={featuredCase.image}
                      alt={featuredCase.imageAlt || featuredCase.client}
                      width={800}
                      height={500}
                      style={{ width: "100%", height: "auto" }}
                    />
                  ) : (
                    <div
                      className="work-case-placeholder"
                      aria-hidden="true"
                    >
                      <span className="work-case-placeholder-text font-primary">
                        {featuredCase.client}
                      </span>
                    </div>
                  )}
                </div>
                <div className="work-featured-card-body">
                  <p className="work-case-eyebrow">
                    {featuredCase.category}
                  </p>
                  <h3 className="work-featured-card-client font-primary">
                    {featuredCase.client}
                  </h3>
                  <p className="work-featured-card-oneliner">
                    {featuredCase.oneliner}
                  </p>
                  {featuredCase.story && (
                    <p className="work-featured-card-story">
                      {featuredCase.story}
                    </p>
                  )}
                  {featuredCase.metrics?.length > 0 && (
                    <div className="work-featured-card-metrics">
                      {featuredCase.metrics.map((m, i) => (
                        <div key={i} className="work-metric-pill">
                          <span className="work-metric-value font-primary">
                            {m.value}
                          </span>
                          <span className="work-metric-label">
                            {m.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </section>
          )}

          {/* ============= 3. CASE STUDIES GRID ============= */}
          {gridCases.length > 0 && (
            <section className="work-case-grid-section">
              <h2 className="work-section-heading font-primary">
                <span className="work-section-number">02</span>
                <span>More monetization work</span>
              </h2>

              <div className="work-case-grid">
                {gridCases.map((c) => (
                  <article key={c.slug} className="work-case-card">
                    <div className="work-case-card-image">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt={c.imageAlt || c.client}
                          width={600}
                          height={400}
                          style={{ width: "100%", height: "auto" }}
                        />
                      ) : (
                        <div
                          className="work-case-placeholder"
                          aria-hidden="true"
                        >
                          <span className="work-case-placeholder-text font-primary">
                            {c.client}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="work-case-card-body">
                      <p className="work-case-eyebrow">{c.category}</p>
                      <h3 className="work-case-card-client font-primary">
                        {c.client}
                      </h3>
                      <p className="work-case-card-oneliner">
                        {c.oneliner}
                      </p>
                      {c.metrics?.[0] && (
                        <div className="work-metric-pill work-metric-pill--inline">
                          <span className="work-metric-value font-primary">
                            {c.metrics[0].value}
                          </span>
                          <span className="work-metric-label">
                            {c.metrics[0].label}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ============= 4. METHODOLOGY ============= */}
          {methodology?.length > 0 && (
            <section className="work-methodology-section">
              <h2 className="work-section-heading font-primary">
                <span className="work-section-number">03</span>
                <span>How we monetize</span>
              </h2>

              <div className="work-methodology-grid">
                {methodology.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.number}
                      className="work-methodology-card"
                    >
                      <div className="work-methodology-header">
                        <span className="work-methodology-number font-primary">
                          {pillar.number}
                        </span>
                        {Icon && (
                          <div
                            className="work-methodology-icon"
                            aria-hidden="true"
                          >
                            <Icon />
                          </div>
                        )}
                      </div>
                      <h3 className="work-methodology-title font-primary">
                        {pillar.title}
                      </h3>
                      <p className="work-methodology-description">
                        {pillar.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============= 4.5 STUDIO LIFE BAND ============= */}
          {/* Trust band — shows the actual humans + room behind
              the methodology before the credentials counters
              kick in. Pulls 4 featured photos from the shared
              gallery data file so a single photo update flows
              everywhere. Opt-in per page via data.studioLife. */}
          {studioLife && studioPhotos.length > 0 && (
            <section className="work-studio-life-section">
              <div className="work-studio-life-header">
                <h2 className="work-section-heading font-primary">
                  <span>{studioLife.heading}</span>
                </h2>
                {studioLife.description && (
                  <p className="work-studio-life-description">
                    {studioLife.description}
                  </p>
                )}
              </div>

              <div className="work-studio-life-grid">
                {studioPhotos.map((photo, idx) => (
                  <Link
                    key={idx}
                    to={studioLife.ctaTo || "/gallery"}
                    className="work-studio-life-card"
                    aria-label={photo.caption}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.caption}
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </Link>
                ))}
              </div>

              {studioLife.ctaText && (
                <div className="work-studio-life-cta">
                  <Link
                    to={studioLife.ctaTo || "/gallery"}
                    className="work-studio-life-link"
                  >
                    <span>{studioLife.ctaText}</span>
                    <HiArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* ============= 5. CREDENTIALS + BRANDS (reused) ============= */}
          {/* CredentialsStrip is opt-out via `credentials: null`
              in the page data — used by /work/ip-monetization
              where the hero stats + studio-life band + trusted-
              by marquee already cover the credibility moment.
              When `credentials` is undefined the component
              renders with video-production defaults; when it's
              an object the data is spread into props (per-page
              topical override). */}
          {credentials !== null && (
            <CredentialsStrip {...(credentials || {})} />
          )}

          <TrustedBrandsMarquee />

          {/* ============= 6. PARTNER QUOTE ============= */}
          {partnerQuote && (
            <section className="work-partner-quote-section">
              <div className="work-partner-quote-card">
                <span
                  className="work-partner-quote-mark font-primary"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <p className="work-partner-quote-text">
                  {partnerQuote.text}
                </p>
                <p className="work-partner-quote-attribution">
                  — {partnerQuote.attribution}
                </p>
              </div>
            </section>
          )}

          {/* ============= 7. CLOSING CTA ============= */}
          {/* Single decisive card that bookends the hero. The
              heading echoes the page's opening line so the
              partnership-pact framing closes the loop. Replaces
              the old <HireOrJoin /> fork (Hire/Join cards),
              whose recruitment side ("Join Cocoma") was off-
              topic on a portfolio page aimed at content owners.
              Per-page customizable via data.closingCta. */}
          {closingCta && (
            <section className="work-closing-cta-section">
              <div className="work-closing-cta-card">
                <h2 className="work-closing-cta-heading font-primary">
                  {closingCta.heading}
                </h2>
                {closingCta.description && (
                  <p className="work-closing-cta-description">
                    {closingCta.description}
                  </p>
                )}
                <Link
                  to={closingCta.buttonTo || "/ScheduleMeeting"}
                  className="work-closing-cta-button"
                >
                  <span>{closingCta.buttonText || "Book a discovery call"}</span>
                  <HiArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky bottom-right "Talk to Anil" chip — auto-hides
          when Section12 (book-call CTA above) scrolls into view. */}
      <FloatingCallChip />
    </>
  );
}
