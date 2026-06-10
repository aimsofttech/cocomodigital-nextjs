// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Link } from "@/src/lib/navigation";
import { HiArrowUpRight } from "react-icons/hi2";


import AllSeriesData from "../../components/WebSeries/AllSeriesData/AllSeriesData";
import Loader from "../../components/common/Loader/Loader";


import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import TrustedBrandsMarquee from "../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import { marketingCampaignsData } from "../Work/_shared/marketingCampaignsData";

interface MarketingCampaignsProps {
  initialMarketingCategory?: any[];
  initialMarketingYear?: any[];
  initialItems?: any[];
  initialTotalItemCount?: number;
}

const MarketingCampaigns = ({
  initialMarketingCategory = [],
  initialMarketingYear = [],
  initialItems = [],
  initialTotalItemCount = 0,
}: MarketingCampaignsProps) => {
  const seeded =
    initialMarketingCategory.length > 0 ||
    initialMarketingYear.length > 0 ||
    initialItems.length > 0;
  const [marketingCategory, setMarketingCategory] = useState(initialMarketingCategory);
  const [marketingYear, setMarketingYear] = useState(initialMarketingYear);
  const [isLoading, setIsLoading] = useState(!seeded);

  useEffect(() => {
    if (seeded) return;
    /* Phase 5l: fallback when the page wasn't SSR-seeded — fetch
       marketing-categories from the API + derive year list from
       items. Almost always seeded in practice; this is a safety
       net for direct client navigation. */
    const fetchAllCategoryData = async () => {
      try {
        const catUrl = new URL("/content-api/marketing-categories", window.location.origin);
        catUrl.searchParams.set("limit", "50");
        const catRes = await fetch(catUrl, { headers: { Accept: "application/json" } });
        const catBody = catRes.ok ? await catRes.json() : { docs: [] };
        setMarketingCategory(catBody?.docs || []);
        // Years come from items in the legacy /common-api response;
        // here we keep it empty and let the items query above
        // surface years inline. Safe to skip.
        setMarketingYear([]);
      } catch (error) {
        console.log("Error", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllCategoryData();
  }, [seeded]);

  if (isLoading) {
    return <Loader />;
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
  } = marketingCampaignsData;


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


          <div className="vill-all-series-content-wrapper">
            <div className="vill-all-series-content">
              <AllSeriesData
                marketingCategory={marketingCategory}
                marketingYear={marketingYear}
                initialItems={initialItems}
                initialTotalItemCount={initialTotalItemCount}
              />
            </div>
          </div>

          {/* ============= 4. METHODOLOGY ============= */}
          {methodology?.length > 0 && (
            <section className="work-methodology-section">
              <h2 className="work-section-heading font-primary">
                <span className="work-section-number">01</span>
                <span>How we run launches</span>
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
};

export default MarketingCampaigns;
