// @ts-nocheck
"use client";
import { useEffect, useState } from "react";

const titleToSlug = (title: string): string =>
  String(title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
import { Link } from "@/src/lib/navigation";
import { useCartCount } from "@/src/lib/cart";
import SingleServiceSlider from "../../components/Services/SingleServiceSlider/SingleServiceSlider";
import VideoEditingServices from "../../components/Services/VideoEditingServices/VideoEditingServices";
import { FaHandshake, FaUsers, FaArrowRight } from "react-icons/fa";
import Portfolio from "../../components/Services/ServicePorfolio/ServicePortfolio";
import RecentlyWorkedWith from "../../components/Services/RecentWork/RecentWork";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";

// Trust + closing-CTA components reused from the SingleVideo page
// so the credibility crescendo lands the same on every conversion-
// oriented page across the site.
import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
import HireOrJoin from "../../components/SingleVideo/HireOrJoin/HireOrJoin";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
// "Trusted by" brand grid for early credibility right after the
// hero. Same admin-driven brand list the homepage uses.
import TrustedByStrip from "../../components/SingleVideo/TrustedByStrip/TrustedByStrip";
// Curated 6-card creative service explorer — cross-sell after
// portfolio so users who didn't find their format here see what
// else Cocoma covers.
import CreativeHouseServices from "../../components/SingleVideo/CreativeHouseServices/CreativeHouseServices";
// Above-fold credibility tiles + inline partner testimonial.
// Pass 2 conversion additions: surface 3 quick credibility hits
// (60 specialists / 70% recurring / 2019 founded) right under
// the hero so the "why these guys?" question is answered while
// the reader is still scanning, then a single partner quote
// after sub-services so social proof lands once they've seen
// what's included.
import ServiceTrustStrip from "../../components/Services/ServiceTrustStrip/ServiceTrustStrip";
// Sticker FAQ accordion — sits between the trust signals and
// the book-call CTA so common pre-call objections (timing,
// commitment, team, exit, pricing) are answered before the
// user has to decide whether to book.
import ServiceFAQ from "../../components/Services/ServiceFAQ/ServiceFAQ";
import type { PortfolioItem, ServiceDetail } from "../../lib/adminServerApi";

// Same services-flavoured HireOrJoin copy as the parent service
// category page, so the closer reads consistently no matter which
// /services or /service-details URL the visitor lands on.
const SERVICES_HIRE_OR_JOIN_CARDS = [
  {
    variant: "primary",
    icon: FaHandshake,
    tag: "For brands & creators",
    title: "Hire Cocoma",
    pitch:
      "60-person in-house team. Custom scoping for your goals. Dedicated PM. End-to-end delivery from kickoff to launch.",
    ctaText: "Book a discovery call",
    to: "/ScheduleMeeting",
  },
  {
    variant: "secondary",
    icon: FaUsers,
    tag: "For creators & specialists",
    title: "Join Cocoma",
    pitch:
      "Editors, designers, animators, motion artists — we're hiring across India and remote. ~60 in-house, growing.",
    ctaText: "See open roles",
    to: "/career",
  },
];

interface SingleServiceProps {
  slug: string;
  initialService: ServiceDetail | null;
  initialOtherServices: ServiceDetail[] | null;
  initialPortfolio: PortfolioItem[] | null;
}

export default function SingleService({
  slug,
  initialService,
  initialOtherServices,
  initialPortfolio,
}: SingleServiceProps) {
  // isLoading retained so each section can opt into a skeleton later
  // if needed; we no longer block the entire page render on it.

  const [isLoading, setIsLoading] = useState(!initialService);
  const [service, setService] = useState(initialService);
  const [otherServices, setOtherServices] = useState(initialOtherServices);
  const [isError, setIsError] = useState("");
  const cartItemCount = useCartCount();
  const isMobile = useMediaQuery("(max-width: 500px)");


  useEffect(() => {
    if (initialService) {
      setService(initialService);
      setOtherServices(initialOtherServices);
      setIsLoading(false);
      return;
    }

    if (!slug) return;

    setService(undefined);
    setOtherServices(null);
    setIsLoading(true);

    let cancelled = false;

    const fetchServiceDetails = async () => {
      try {
        // 1. Try direct slug match.
        const svcUrl = new URL("/content-api/services", window.location.origin);
        svcUrl.searchParams.set("where[slug][equals]", slug);
        svcUrl.searchParams.set("limit", "1");
        svcUrl.searchParams.set("depth", "2");
        const svcRes = await fetch(svcUrl, { headers: { Accept: "application/json" } });
        if (cancelled) return;
        if (!svcRes.ok) throw new Error(`HTTP ${svcRes.status}`);
        const svcBody = await svcRes.json();
        let svc = svcBody?.docs?.[0];

        // 2. Fallback: the slug may belong to a GroupServiceItem (a
        //    sub-service one tier below the top-level service).
        if (!svc) {
          const groupUrl = new URL("/content-api/group-service-items", window.location.origin);
          groupUrl.searchParams.set("where[slug][equals]", slug);
          groupUrl.searchParams.set("limit", "1");
          const groupRes = await fetch(groupUrl, { headers: { Accept: "application/json" } });
          if (cancelled) return;
          if (groupRes.ok) {
            const groupBody = await groupRes.json();
            svc = groupBody?.docs?.[0];
          }
        }

        // 3. Last resort: search portfolio items in every service.
        //    Mirrors the server-side findDocByPortfolioItemSlug in page.tsx.
        if (!svc) {
          const allUrl = new URL("/content-api/services", window.location.origin);
          allUrl.searchParams.set("limit", "200");
          allUrl.searchParams.set("depth", "2");
          const allRes = await fetch(allUrl, { headers: { Accept: "application/json" } });
          if (cancelled) return;
          if (allRes.ok) {
            const allBody = await allRes.json();
            outer: for (const parentSvc of (allBody?.docs ?? [])) {
              for (const cat of (parentSvc.group_single_service_portfolio_category ?? [])) {
                for (const item of (cat.items ?? [])) {
                  const itemSlug = item.slug || titleToSlug(item.title ?? "");
                  if (itemSlug === slug) {
                    svc = {
                      id: item.id,
                      title: item.title,
                      slug: itemSlug,
                      image: item.image,
                      legacyImageUrl: item.legacyImageUrl ?? "",
                      description: item.description ?? "",
                      featured_description: item.description ?? "",
                      group_service_item_title: item.title,
                      group_service_item_description: item.description ?? "",
                      group_top_banner: parentSvc.group_top_banner ?? [],
                      group_single_service_portfolio_category:
                        parentSvc.group_single_service_portfolio_category ?? [],
                      faqs: parentSvc.faqs ?? [],
                      category: parentSvc.category,
                    };
                    break outer;
                  }
                }
              }
            }
          }
        }

        if (!svc) {
          setIsError("Service not found.");
          setIsLoading(false);
          return;
        }
        setService(svc);

        const categoryId =
          typeof svc?.category === "object" ? svc.category?.id : svc?.category;
        if (categoryId) {
          const sibUrl = new URL("/content-api/services", window.location.origin);
          sibUrl.searchParams.set("where[category][equals]", String(categoryId));
          sibUrl.searchParams.set("limit", "12");
          sibUrl.searchParams.set("depth", "1");
          const sibRes = await fetch(sibUrl, { headers: { Accept: "application/json" } });
          if (cancelled) return;
          if (sibRes.ok) {
            const sibBody = await sibRes.json();
            setOtherServices(
              (sibBody?.docs || []).filter((s: any) => s.id !== svc?.id).slice(0, 6),
            );
          }
        } else {
          setOtherServices([]);
        }
      } catch (err: any) {
        if (cancelled) return;
        setIsError(err?.message || "Error fetching service details");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchServiceDetails();
    return () => { cancelled = true; };
  }, [slug, initialService, initialOtherServices]);

  // Body class flag → tells the FloatingCallChip CSS to bump its
  // bottom offset upward when the mobile cart bar is rendered, so
  // the chip stacks ABOVE the bar instead of behind. Same pattern
  // as the parent /services/:slug page so chip behaviour is
  // identical between the two related pages.
  useEffect(() => {
    const cartBarVisible = isMobile && cartItemCount > 0;
    document.body.classList.toggle("services-cart-bar-visible", cartBarVisible);
    return () => {
      document.body.classList.remove("services-cart-bar-visible");
    };
  }, [isMobile, cartItemCount]);

  // Error early-return preserved — if the API itself fails we still
  // short-circuit rather than render a half-empty page. But we no
  // longer gate first paint on a full-page Loader; sections render
  // progressively as their data arrives (CredentialsStrip,
  // Section12, HireOrJoin paint immediately; SingleServiceSlider /
  // RecentWork / Portfolio appear once ServiceDetails resolves).
  if (isError) {
    return <p>{isError}</p>;
  }

  /* Per-route SEO metadata. Title + description fall back to a
     generic "Cocoma service" copy until the API resolves; once
     `service` is loaded, we use the admin-supplied title +
     featured_description so each /service/:slug has a
     unique search snippet + share preview. */
  const serviceTitle = service?.title || "Service";
  const serviceDescRaw =
    service?.featured_description || service?.group_service_item_description2 || "";
  // Strip HTML tags from the admin-supplied description (it's
  // wrapped in <p> etc.) and trim to a SERP-friendly length.
  const serviceDesc = (() => {
    if (!serviceDescRaw) return "Service from Cocoma — built and delivered by our 60-person Mumbai studio.";
    if (typeof document === "undefined") return serviceDescRaw.slice(0, 160);
    const tmp = document.createElement("div");
    tmp.innerHTML = serviceDescRaw;
    const txt = (tmp.textContent || tmp.innerText || "").trim();
    return txt.length > 160 ? `${txt.slice(0, 157)}…` : txt;
  })();


  const serviceSchema = service
    ? {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": serviceTitle,
      "description": serviceDesc,
      "url": `https://cocomadigital.com/service/${slug}`,
      "provider": { "@id": "https://cocomadigital.com/#organization" },
      "serviceType": service?.group_service_item_title || "Content service",
      "areaServed": [
        { "@type": "Country", "name": "India" },
        { "@type": "Country", "name": "United States" },
        { "@type": "Country", "name": "United Kingdom" },
        { "@type": "Country", "name": "Singapore" },
        { "@type": "Country", "name": "Australia" },
      ],
    }
    : null;

  const breadcrumbSchema = service
    ? {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://cocomadigital.com/",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Services",
          "item": service?.slug
            ? `https://cocomadigital.com/services/${service.slug}`
            : "https://cocomadigital.com/",
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": serviceTitle,
          "item": `https://cocomadigital.com/service/${slug}`,
        },
      ],
    }
    : null;

  return (
    <>
      <div className="home-main-wrapper">
        <div className="home-main">
          <SingleServiceSlider service={service} />

          {service && <ServiceTrustStrip />}

          {otherServices?.length > 0 &&
            <VideoEditingServices
              otherServices={otherServices}
              categoryName={service?.group_service_item_title}
            />}

          {/* "Recently Worked With" — admin-managed recent-work videos
              for this service item. Hidden when none are configured. */}
          {service?.group_single_service_recent_work?.length > 0 && (
            <RecentlyWorkedWith
              RecentWorkData={service.group_single_service_recent_work}
            />
          )}

          {service?.group_single_service_portfolio_category?.length > 0 &&
            <Portfolio
              portfolioCategories={service?.group_single_service_portfolio_category}
              serviceTitle={service?.title || service?.group_service_item_title}
              initialPortfolioData={initialPortfolio}
            />
          }

          {/* Categorical creative services explorer — six-card cross-
              sell of formats Cocoma covers (YouTube Videos, Shorts &
              Reels, Promos & Sizzles, Motion Graphics, Localisation,
              Trailers & Teasers). Sticker cards link to dedicated
              format pages. Reusing the SingleVideo CreativeHouseServices
              component; we don't pass serviceData so only the curated
              format grid renders, not the dynamic service row. */}
          <CreativeHouseServices />

          {/* Credibility crescendo + closing CTAs. Order builds
              credibility step by step before the book-call ask:
                CredentialsStrip → operational stats + pills
                TrustedByStrip   → recognisable client logos
                Section12        → in-page book-call CTA
                HireOrJoin       → final fork (Hire vs Join)
              Trusted-by sits BETWEEN the stats and the booking CTA so
              the brand logos land as the social-proof beat right
              before the user is asked to book. */}
          <CredentialsStrip />

          <TrustedByStrip />

          {/* FAQ — show service-specific FAQs when available,
              otherwise show default generic questions. Hidden
              entirely only if the API explicitly returns an
              empty array (no FAQs configured for this service). */}
          {(service?.faqs?.length > 0 || !service) && (
            <ServiceFAQ
              serviceId={service?.id}
              questions={
                service?.faqs?.length > 0
                  ? service.faqs.map((f: any) => ({ q: f.question, a: f.answer, id: f.id }))
                  : undefined
              }
            />
          )}

          <div className="home-book-call-container-wrapper">
            <div className="home-book-call-container">
              <BookCallBanner />
            </div>
          </div>

          <HireOrJoin cards={SERVICES_HIRE_OR_JOIN_CARDS} />
        </div>
      </div>

      {/* add to cart for mobile screen */}
      {/* Mobile cart sheet — slim floating sticker pill (not a
          full-width band). Mirrors the Services page sheet so
          both routes share the same cart UI on mobile. */}
      {cartItemCount > 0 && isMobile && (
        <div className="mobile-add-to-cart-wrapper">
          <p className="mobile-add-to-cart-count-icon">
            <span className="mobile-cart-badge" aria-hidden="true">
              {cartItemCount}
            </span>
            <span className="mobile-cart-label">on your call</span>
          </p>
          <Link
            className="mobile-add-to-cart-link"
            to="/cart"
            aria-label={`Your call agenda — ${cartItemCount} ${cartItemCount === 1 ? "topic" : "topics"}, schedule with Anil`}
          >
            Schedule <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Sticky bottom-right "Talk to Anil" chip. Auto-hides when
          the in-page Section12 enters viewport so the user never
          sees two booking asks competing. On mobile when the cart
          bar is up, the chip lifts to bottom: 88px via the
          services-cart-bar-visible body class set above. */}
      <FloatingCallChip />
    </>
  );
}
