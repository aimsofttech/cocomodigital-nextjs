// @ts-nocheck
"use client";
import TrustedBrandsMarquee from "../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";

const titleToSlug = (title: string): string =>
  String(title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
import ServiceCategorySlider from "../../components/Services/ServiceCategorySlider/ServiceCategorySlider";
import HowItWorksSteps from "../../components/Services/HowItWorksSteps/HowItWorksSteps";
import { Link, useParams } from "@/src/lib/navigation";
import { useCartCount } from "@/src/lib/cart";
import { FaHandshake, FaUsers, FaArrowRight } from "react-icons/fa";
import { useCallback, useEffect, useRef, useState } from "react";
import ServiceCategoryHero from "../../components/Services/ServiceCategoryHero/ServiceCategoryHero";

// Trust + closing-CTA components reused from the SingleVideo page so
// the credibility crescendo lands the same on every conversion-
// oriented page on the site.
import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
import HireOrJoin from "../../components/SingleVideo/HireOrJoin/HireOrJoin";
// Sticky bottom-right "Talk to Anil — Book a 15-min call" chip,
// reused from SingleVideo. Auto-hides when BookCallBanner enters view
// via its own scroll listener (targets .home-book-call-container-
// wrapper which the JSX below already uses).
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";

// Custom HireOrJoin copy for Services pages — broader than the
// video-production framing the SingleVideo page uses since this
// page might be a YouTube Channel Management or Advertising page,
// not just video editing.
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

interface ServicesProps {
  slug?: string;
  initialGroupService?: unknown;
}

function getGroupServicePayload(groupService) {
  return (
    groupService?.services ??
    groupService?.service ??
    groupService?.group_service ??
    groupService ??
    null
  );
}

export default function Services({
  slug: initialSlug,
  initialGroupService,
}: ServicesProps = {}) {
  const params = useParams();
  const slug = initialSlug || params?.slug;
  const initialServicesData = getGroupServicePayload(initialGroupService);
  const [isLoading, setIsLoading] = useState(!initialServicesData);
  const [error, setError] = useState("");
  // null → skeleton, [] → no banner, array → render slides
  const [banner, setBanner] = useState(
    initialServicesData?.group_top_banner || null
  );
  const [services, setServices] = useState(
    initialServicesData?.group_service_category || []
  );
  // Cart UI hooks
  const cartItemCount = useCartCount();
  // SSR-safe: start false (matches server), then sync to real value after hydration.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 500px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);


  const [showFloatingTitle, setShowFloatingTitle] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);

  const sectionsContainerRef = useRef(null);

  const floatingTitleRef = useRef(null);

  const sectionRefs = useRef({});

  useEffect(() => {
    if (!services?.length) return;
    const onScroll = () => {
      const containerEl = sectionsContainerRef.current;
      if (!containerEl) return;

      const headerOffset = window.innerWidth >= 1024 ? 72 : 68;

      const containerRect = containerEl.getBoundingClientRect();
      const pastTop = containerRect.top < headerOffset;
      const beforeBottom = containerRect.bottom > headerOffset + 40;
      setShowFloatingTitle(pastTop && beforeBottom);


      const barHeight = floatingTitleRef.current?.offsetHeight || 60;
      const threshold = headerOffset + barHeight + 40;
      let currentId = null;
      for (const section of services) {
        const el = sectionRefs.current[section?.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          currentId = section.id;
        }
      }
      // Fallback to the first section before any have crossed
      // the threshold, so the bar always has something to display
      // the moment it becomes visible.
      if (!currentId && services.length > 0) {
        currentId = services[0]?.id;
      }
      setActiveSectionId((prev) => (prev === currentId ? prev : currentId));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [services]);

  // Active section derived from id state — the dynamic part of
  // the floating-bar label. Index drives the yellow number chip
  // ("01 / 02 / 03"), matching the visual rhythm of the
  // homepage bar.
  const activeIndex = services?.findIndex(
    (s) => s?.id === activeSectionId
  );
  const activeSection =
    activeIndex >= 0 ? services[activeIndex] : services?.[0];
  const activeNumber =
    activeIndex >= 0
      ? String(activeIndex + 1).padStart(2, "0")
      : "01";


  useEffect(() => {
    const barEl = floatingTitleRef.current;
    if (!barEl) return;

    const supportsHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    if (!supportsHover) return;

    let rafId = null;
    let lastEvent = null;

    const apply = () => {
      rafId = null;
      if (!lastEvent) return;
      const rect = barEl.getBoundingClientRect();
      const x = lastEvent.clientX - rect.left;
      const y = lastEvent.clientY - rect.top;
      barEl.style.setProperty("--spotlight-x", `${x}px`);
      barEl.style.setProperty("--spotlight-y", `${y}px`);
    };

    const onMouseMove = (e) => {
      lastEvent = e;
      if (rafId == null) {
        rafId = requestAnimationFrame(apply);
      }
    };

    // Drive the spotlight ::before opacity via a CSS variable
    // instead of relying on CSS :hover state — that was
    // unreliable through the fixed-positioned slot wrapper
    // (rule existed at the right specificity, browser still
    // computed opacity: 0 on hover). JS-driven is rock-solid.
    const onMouseEnter = () => {
      barEl.style.setProperty("--spotlight-opacity", "1");
    };
    const onMouseLeave = () => {
      barEl.style.setProperty("--spotlight-opacity", "0");
    };

    barEl.addEventListener("mousemove", onMouseMove, { passive: true });
    barEl.addEventListener("mouseenter", onMouseEnter, { passive: true });
    barEl.addEventListener("mouseleave", onMouseLeave, { passive: true });

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      barEl.removeEventListener("mousemove", onMouseMove);
      barEl.removeEventListener("mouseenter", onMouseEnter);
      barEl.removeEventListener("mouseleave", onMouseLeave);
    };
    // Dep on services so when the bar mounts (gated on
    // services.length > 1) the listener binds against the real
    // ref instead of the null at first render.
  }, [services]);


  const scrollToSection = useCallback((sectionId) => {
    const el = sectionRefs.current[sectionId];
    if (!el) return;
    const headerOffset = window.innerWidth >= 1024 ? 72 : 68;
    const barHeight = floatingTitleRef.current?.offsetHeight || 60;
    const offset = headerOffset + barHeight + 12;
    const top =
      el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!slug) return;

    const shouldUseInitialData = initialSlug === slug && initialServicesData;
    if (shouldUseInitialData) {
      setError("");
      setBanner(initialServicesData?.group_top_banner || null);
      setServices(initialServicesData?.group_service_category || []);
      setIsLoading(false);
      return;
    }

    // Reset stale data on slug change. Functional setters bail out
    // when the value is already at its reset state (Object.is check),
    // preventing a spurious re-render on the very first mount.
    setError("");
    setBanner(null);
    setServices((prev) => (prev.length === 0 ? prev : []));
    setIsLoading(true);

    // Cancelled flag prevents a stale fetch (e.g. from React Strict
    // Mode's double-invoke or a fast slug change) from overwriting
    // state after the effect has already re-run and reset the page.
    let cancelled = false;

    const fetchGroupService = async () => {
      try {
        /* Phase 5l: fetch parent service + sibling services from
           the API. Mirrors the server-side adapter in
           src/app/services/[slug]/page.tsx. */
        const parentUrl = new URL("/content-api/services", window.location.origin);
        parentUrl.searchParams.set("where[slug][equals]", slug);
        parentUrl.searchParams.set("limit", "1");
        parentUrl.searchParams.set("depth", "1");
        const parentRes = await fetch(parentUrl, { headers: { Accept: "application/json" } });
        if (cancelled) return;
        if (!parentRes.ok) throw new Error(`HTTP ${parentRes.status}`);
        const parentBody = await parentRes.json();
        const parent = parentBody?.docs?.[0];
        if (!parent) {
          /* No service exists for this slug → no banner. Use an empty
             array (not null) so ServiceCategoryHero renders its
             "Banner Not Available" empty state instead of an endless
             loading skeleton. */
          setBanner([]);
          setServices([]);
          return;
        }
        const categoryId =
          typeof parent.category === "object" ? parent.category?.id : parent.category;
        let children: any[] = [];
        if (categoryId) {
          const siblingsUrl = new URL("/content-api/services", window.location.origin);
          siblingsUrl.searchParams.set("where[category][equals]", String(categoryId));
          siblingsUrl.searchParams.set("limit", "12");
          siblingsUrl.searchParams.set("depth", "1");
          const sibRes = await fetch(siblingsUrl, { headers: { Accept: "application/json" } });
          if (sibRes.ok) {
            const sibBody = await sibRes.json();
            children = (sibBody?.docs || []).filter((s: any) => s.id !== parent.id);
          }
        }
        const groupServiceData = {
          services: {
            title: parent.title,
            slug: parent.slug,
            group_top_banner: parent.group_top_banner ?? [],
            group_service_category: [
              /* Phase 5+ 2026-05-22: Services.tsx render reads
                 `api_group_service_items` (legacy field name); our
                 the API schema stores `items`. Same with per-item
                 `thumbnail` vs `image`. Alias both here so the
                 renderer doesn't need to change. Mirrors the SSR
                 adapter in src/app/services/[slug]/page.tsx. */
              ...(Array.isArray(parent.group_single_service_portfolio_category)
                ? parent.group_single_service_portfolio_category.map((cat: any) => ({
                  ...cat,
                  api_group_service_items: (Array.isArray(cat.items) ? cat.items : []).map(
                    (it: any) => ({
                      ...it,
                      slug: it.slug || titleToSlug(it.title),
                      thumbnail:
                        (typeof it.image === "object" && it.image?.url) ||
                        it.legacyImageUrl ||
                        "",
                    }),
                  ),
                }))
                : []),
              ...children.map((c: any) => ({
                category_name: c.title,
                slug: c.slug,
                image:
                  (typeof c.image === "object" && c.image?.url) || c.legacyImageUrl,
                items: [],
                api_group_service_items: [],
              })),
            ],
          },
        };
        const servicesData = getGroupServicePayload(groupServiceData);
        /* Empty array (not null) when the service has no banners, so
           the hero shows "Banner Not Available" rather than a skeleton. */
        setBanner(servicesData?.group_top_banner || []);
        setServices(servicesData?.group_service_category || []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Error fetching group services");
        console.error("Error fetching group services:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchGroupService();

    return () => { cancelled = true; };
  }, [slug, initialSlug, initialServicesData]);


  useEffect(() => {
    const cartBarVisible = isMobile && cartItemCount > 0;
    document.body.classList.toggle("services-cart-bar-visible", cartBarVisible);
    return () => {
      document.body.classList.remove("services-cart-bar-visible");
    };
  }, [isMobile, cartItemCount]);

  if (error) {
    return <p className="text-danger">Error: {error}</p>;
  }


  const categoryTitle = banner?.[0]?.heading || "YouTube & Social Media Services";
  const serviceMetaTitle = `${categoryTitle} — Cocoma Digital`;
  const serviceMetaDesc = `${categoryTitle} from India's leading YouTube & social media growth studio. 60-person in-house team, 70% recurring partnerships, founder-led discovery calls.`;


  const categoryServiceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": categoryTitle,
    "description": serviceMetaDesc,
    "url": `https://cocomadigital.com/services/${slug}`,
    "provider": { "@id": "https://cocomadigital.com/#organization" },
    "serviceType": categoryTitle,
    "areaServed": [
      { "@type": "Country", "name": "India" },
      { "@type": "Country", "name": "United States" },
      { "@type": "Country", "name": "United Kingdom" },
      { "@type": "Country", "name": "Singapore" },
      { "@type": "Country", "name": "Australia" },
    ],
    /* If the API resolved sub-services, expose them as a
       hasOfferCatalog. Search engines + AI use this to enumerate
       what's offered under the category. */
    ...(services?.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        "name": categoryTitle,
        "itemListElement": services
          .flatMap((cat) => cat?.api_group_service_items || [])
          .filter((item) => item?.title && item?.slug)
          .slice(0, 20)
          .map((item) => ({
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": item.title,
              "url": `https://cocomadigital.com/service/${item.slug}`,
            },
          })),
      },
    }),
  };

  const categoryBreadcrumbSchema = {
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
        "name": categoryTitle,
        "item": `https://cocomadigital.com/services/${slug}`,
      },
    ],
  };

  return (
    <>
      {services?.length > 1 && (
        <div
          className={`services-page-floating-title-slot ${showFloatingTitle ? "is-visible" : ""
            }`}
          aria-hidden={!showFloatingTitle}
        >
          <div
            ref={floatingTitleRef}
            className="services-page-floating-title"
          >
            <div className="services-page-floating-title-inner">
              {/* Left cluster — chip + section name. flex: 1 1 auto
                so the title takes available space; dots cluster
                stays right-aligned. */}
              <div className="services-page-floating-title-left">
                {/* Chip keyed on activeSectionId so React remounts it
                on each swap — that retriggers the pop+rotate CSS
                animation declared in services-chip-pop. */}
                <span
                  className="services-page-floating-title-chip"
                  aria-hidden="true"
                  key={`chip-${activeSectionId || "default"}`}
                >
                  {activeNumber}
                </span>
                {/* Text wrapper keyed on activeSectionId so the per-
                letter spans below remount on swap; each letter's
                CSS animation-delay (set via inline --i) gives a
                staggered cascade reveal. aria-label on the
                wrapper preserves the full title for screen
                readers — the per-letter spans are aria-hidden
                so assistive tech doesn't read them as 30+ stray
                characters. */}
                <span
                  className="services-page-floating-title-text"
                  key={`text-${activeSectionId || "default"}`}
                  aria-label={activeSection?.category_name || ""}
                >
                  {(() => {
                    const text = activeSection?.category_name || "";
                    let charIdx = 0;
                    return text.split(" ").flatMap((word, wi, arr) => {
                      // Each word is wrapped in its OWN atomic span so
                      // the browser can only break BETWEEN words, never
                      // mid-word. Letters within a word are still
                      // individually animated (inline-block + per-
                      // letter --i), but they sit inside the word-span
                      // box and ride together when the word wraps.
                      const wordSpan = (
                        <span
                          key={`word-${wi}`}
                          className="services-page-floating-title-word"
                          aria-hidden="true"
                        >
                          {word.split("").map((char, ci) => (
                            <span
                              key={`${wi}-${ci}`}
                              className="services-page-floating-title-letter"
                              style={{ "--i": charIdx++ }}
                            >
                              {char}
                            </span>
                          ))}
                        </span>
                      );
                      // Real text-node space between word spans is the
                      // ONLY allowable break point — keeps the title
                      // wrapping cleanly on narrow viewports while
                      // never splitting "PLATFORMS" into "PLATFOR" +
                      // "MS" across lines.
                      return wi < arr.length - 1
                        ? [wordSpan, " "]
                        : [wordSpan];
                    });
                  })()}
                </span>
              </div>
              {/* Scrubbable progress strip — one dot per section,
                active dot fills yellow with a sticker shadow.
                Click any dot to smooth-scroll to that section.
                Hover (desktop) shows a tooltip with the full
                section name. Hidden on small phones (≤375px)
                where horizontal real estate is tightest and the
                dots would compete with the title for space. */}
              <nav
                className="services-page-floating-title-dots"
                aria-label="Sections on this page"
              >
                {services?.map((section, idx) => {
                  const isActive = section?.id === activeSectionId;
                  const sectionName = section?.category_name || "";
                  return (
                    <button
                      type="button"
                      key={section?.id || idx}
                      className={`services-page-floating-title-dot${isActive ? " is-active" : ""
                        }`}
                      onClick={() => scrollToSection(section?.id)}
                      aria-label={`Jump to ${sectionName}`}
                      aria-current={isActive ? "true" : undefined}
                      data-section-name={sectionName}
                    />
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      <div className="home-main-wrapper">
        <div className="home-main mb-5 flex flex-col justify-center content-center">
          {/* Render the matched banner data */}

          <ServiceCategoryHero bannerData={banner} />

          <TrustedBrandsMarquee />

          <HowItWorksSteps />

          {/* Sections container — ref'd so the scroll listener knows
            when the user has entered/left the stack of section
            blocks (for showFloatingTitle gating). */}
          <div ref={sectionsContainerRef} className="services-sections-stack">
            {
              services?.map((card, index) => {
                const categoryName = card?.category_name;
                const items = card?.api_group_service_items;
                const id = card?.id;
                const item_id = card?.item_id;
                // Render ServiceCategorySlider only if categoryName and items exist
                return categoryName && items && items?.length > 0 ? (
                  <div
                    key={id ?? index}
                    ref={(el) => {
                      // Callback ref — keeps sectionRefs in sync with
                      // mounts/unmounts. Cleanup nulls the entry so
                      // the scroll handler doesn't read a stale
                      // detached node after a section unmounts (e.g.
                      // navigating /services/A → /services/B).
                      if (el) {
                        sectionRefs.current[id] = el;
                      } else {
                        delete sectionRefs.current[id];
                      }
                    }}
                  >
                    <ServiceCategorySlider
                      categoryName={categoryName}
                      serviceData={Array.isArray(items) ? items : [items]}
                      id={id}
                      item_id={item_id}
                    />
                  </div>
                ) : null;
              })
            }
          </div>


          <CredentialsStrip />

          <div className="home-book-call-container-wrapper">
            <div className="home-book-call-container">
              <BookCallBanner />
            </div>
          </div>

          <HireOrJoin cards={SERVICES_HIRE_OR_JOIN_CARDS} />

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

        </div>
      </div>


      <FloatingCallChip />
    </>
  );
}
