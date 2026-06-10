// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Link } from "@/src/lib/navigation";
import { HiArrowUpRight } from "react-icons/hi2";

import CreativeHouseProject from "../../components/CreativeHouseComponent/CreativePorject";
import Loader from "../../components/common/Loader/Loader";


import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import TrustedBrandsMarquee from "../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import { contentCreatedData } from "../Work/_shared/contentCreatedData";

interface ContentCreatedProps {
  initialCreativeCategory?: any[];
  initialItems?: any[];
  initialItemCount?: number;
}

export default function ContentCreated({
  initialCreativeCategory = [],
  initialItems = [],
  initialItemCount = 0,
}: ContentCreatedProps) {
  const seeded = initialCreativeCategory.length > 0 || initialItems.length > 0;
  const [isLoading, setIsLoading] = useState(!seeded);
  const [isError, setIsError] = useState("");
  const [creativeHouseDetails, setCreativeHouseDetails] = useState(
    seeded ? { creativeCategory: initialCreativeCategory } : null,
  );

  useEffect(() => {
    if (seeded) return;
    /* /creative-house filter rail — just the skill categories.
       Maps the API `service-categories` → legacy
       { creative_house_category_name, slug } shape so the existing
       view doesn't need shape changes.

       Phase 5+ 2026-05-23: the rail used to include all 16 service-
       categories (the 4 home categories Content/Growth/Monetisation/
       Management + the 11 skill chips + "Our Other Services"). Live
       only renders the 11 skill chips (anything that's NOT
       featuredOnHomepage and NOT "Our Other Services"). Match. */
    const fetchCreativeHouseDetails = async () => {
      try {
        const res = await fetch(
          "/content-api/service-categories?limit=50&depth=0",
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const creativeCategory = (body.docs || [])
          .filter(
            (c: any) =>
              !c.featuredOnHomepage &&
              c.category_name !== "Our Other Services",
          )
          .map((c: any) => ({
            id: c.id,
            creative_house_category_name: c.category_name,
            creative_house_category_slug: c.slug,
            slug: c.slug,
          }));
        setCreativeHouseDetails({ creativeCategory });
      } catch (err: any) {
        setIsError(err?.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreativeHouseDetails();
  }, [seeded]);


  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return <h5 className="text-danger">{isError}</h5>
  }

  const {
    meta,
    schema,
    hero,
    audience,
    methodology,
    credentials,
    partnerQuote,
    closingCta,
  } = contentCreatedData;

  /* Service + BreadcrumbList schemas — same shape used on
     /work/ip-monetization + /work/smm-management. AI engines +
     search crawlers see one consistent entity structure across
     the work hub. */
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
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cocomadigital.com/" },
      { "@type": "ListItem", position: 2, name: "Our Work", item: "https://cocomadigital.com/work" },
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
          {/* ============= 1. HERO ============= */}
          <section className="work-hero">
            <p className="work-hero-eyebrow">{hero?.eyebrow}</p>
            <h1 className="work-hero-title font-primary">
              {hero?.title?.prefix && <>{hero.title.prefix} </>}
              <span className="work-hero-title-highlight">
                {hero?.title?.highlighted}
              </span>
              {hero?.title?.suffix && <> {hero.title.suffix}</>}
            </h1>
            <p className="work-hero-subtitle">{hero?.subtitle}</p>
            <div className="work-hero-stats">
              {hero?.stats?.map((stat, idx) => (
                <div key={idx} className="work-hero-stat-tile">
                  <span className="work-hero-stat-value font-primary">
                    {stat.value}
                  </span>
                  <span className="work-hero-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ============= 2. WHO BENEFITS FROM THIS ============= */}
          {audience?.items?.length > 0 && (
            <section className="work-audience-section">
              <h2 className="work-section-heading font-primary">
                <span>{audience.heading}</span>
              </h2>
              <div className="work-audience-grid">
                {audience.items.map((item, idx) => (
                  <article key={idx} className="work-audience-card">
                    <h3 className="work-audience-card-title font-primary">
                      {item.title}
                    </h3>
                    <p className="work-audience-card-description">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ============= 3. CREATIVE GRID (the meat) =============
              Existing 125+ item filterable grid pulled from the
              admin API — kept as-is because it IS the value of
              this page. The hero + audience above frame it; the
              methodology + credentials + closing CTA below
              reinforce the trust crescendo around it. */}
          <CreativeHouseProject
            creativeCategory={creativeHouseDetails?.creativeCategory}
            initialItems={initialItems}
            initialItemCount={initialItemCount}
          />

          {/* ============= 4. METHODOLOGY ============= */}
          {methodology?.length > 0 && (
            <section className="work-methodology-section">
              <h2 className="work-section-heading font-primary">
                <span className="work-section-number">01</span>
                <span>How we make content</span>
              </h2>
              <div className="work-methodology-grid">
                {methodology.map((pillar) => (
                  <div key={pillar.number} className="work-methodology-card">
                    <span className="work-methodology-number font-primary">
                      {pillar.number}
                    </span>
                    <h3 className="work-methodology-title font-primary">
                      {pillar.title}
                    </h3>
                    <p className="work-methodology-description">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============= 5. CREDENTIALS + BRANDS (reused) ============= */}
          <CredentialsStrip {...(credentials || {})} />
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
                  <span>
                    {closingCta.buttonText || "Book a discovery call"}
                  </span>
                  <HiArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      <FloatingCallChip />
    </>
  );
}
