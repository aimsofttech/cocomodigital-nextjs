"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, useLocation } from "@/src/lib/navigation";
import {
  FaArrowRight,
  FaCheck,
  FaPlus,
  FaMinus,
  FaWhatsapp,
} from "react-icons/fa";
import { HiArrowUpRight } from "react-icons/hi2";
import FloatingCallChip from "../../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import { SOLUTION_ICON_MAP } from "./apiToProspectData";
const ProspectPage = ({ data }) => {
  const location = useLocation();
  if (!data) return null;

  const metaTitle =
    data.meta?.title ||
    (data.hero?.eyebrow && data.hero?.title
      ? `${data.hero.title} — ${data.hero.eyebrow}`
      : data.hero?.title) ||
    "Solutions";
  const metaDesc =
    data.meta?.description ||
    data.hero?.sub ||
    "How Cocoma Digital builds growth for entertainment brands — case studies, process, partner playbook.";

  const solutionPath = location.pathname;
  const solutionSlug = solutionPath.split("/").pop();
  const solutionLabel = data.hero?.title || data.hero?.eyebrow || solutionSlug;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": metaTitle,
    "description": metaDesc,
    "url": `https://cocomadigital.com${solutionPath}`,
    "provider": { "@id": "https://cocomadigital.com/#organization" },
    "audience": {
      "@type": "Audience",
      "audienceType": solutionLabel,
    },
    "areaServed": [
      { "@type": "Country", "name": "India" },
      { "@type": "Country", "name": "United States" },
      { "@type": "Country", "name": "United Kingdom" },
      { "@type": "Country", "name": "Singapore" },
      { "@type": "Country", "name": "Australia" },
    ],
  };

  const breadcrumbSchema = {
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
        "name": "Solutions",
        "item": "https://cocomadigital.com/solutions",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": solutionLabel,
        "item": `https://cocomadigital.com${solutionPath}`,
      },
    ],
  };

  const faqSchema = data.faqSection?.items?.length
    ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": data.faqSection.items.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a,
        },
      })),
    }
    : null;

  const schemas = faqSchema
    ? [serviceSchema, breadcrumbSchema, faqSchema]
    : [serviceSchema, breadcrumbSchema];

  return (
    <>
      <main className="prospect-page mt-8 mb-10">
        {data.hero && <Hero hero={data.hero} />}
        {data.painsSection && <Pains section={data.painsSection} />}
        {data.houseSection && <House section={data.houseSection} />}
        {data.statsSection && <Stats section={data.statsSection} />}
        {/* Receipts (real dashboard screenshots) — sits between
            Stats and Proof so the page goes from abstract scale
            to concrete proof to specific channels. Opt-in via
            data.receiptsSection. */}
        {data.receiptsSection && (
          <Receipts section={data.receiptsSection} />
        )}
        {data.proofSection && <Proof section={data.proofSection} />}
        {/* Pod (team strip) — humans behind the receipts +
            channels. Opt-in via data.podSection. */}
        {data.podSection && <Pod section={data.podSection} />}
        {data.processSection && <Process section={data.processSection} />}
        {data.testimonial && <Testimonial t={data.testimonial} />}
        {data.faqSection && <Faq section={data.faqSection} />}
        {data.closer && <Closer closer={data.closer} />}
      </main>
      <FloatingCallChip />
      {/* WhatsApp sticky chip — second contact-channel option for
          visitors who'd rather message than book a calendar slot.
          Renders only when data.whatsapp.number is set (E.164
          format, no plus sign). Position offset above the
          existing Talk-to-Anil floating chip. */}
      {data.whatsapp?.number && (
        <Link
          href={`https://wa.me/${data.whatsapp.number}?text=${encodeURIComponent(
            data.whatsapp.text || "Hi Anil, saw the page on cocomadigital.com."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="prospect-whatsapp-chip"
          aria-label={data.whatsapp.label || "WhatsApp Anil"}
        >
          <FaWhatsapp aria-hidden="true" />
          <span className="prospect-whatsapp-chip-label">
            {data.whatsapp.label || "WhatsApp Anil"}
          </span>
        </Link>
      )}
    </>
  );
};

export default ProspectPage;

// ============================================================
// Sections
// ============================================================

const Hero = ({ hero }) => {
  const headline = hero.headline ?? "";
  const headlineParts = hero.highlight && headline
    ? headline.split(hero.highlight)
    : [headline];
  return (
    <section className="prospect-hero" aria-labelledby="prospect-hero-headline">
      <div className="prospect-hero-inner">
        <p className="prospect-hero-eyebrow">{hero.eyebrow}</p>
        {/* Optional social-proof badge line under the eyebrow.
            Plain-text, dot-separated. Renders before the headline
            so scale registers at first scroll. */}
        {hero.badgeLine && (
          <p className="prospect-hero-badge-line">{hero.badgeLine}</p>
        )}
        <h1
          className="prospect-hero-headline font-primary"
          id="prospect-hero-headline"
        >
          {headlineParts[0]}
          {hero.highlight && (
            <span className="prospect-hero-headline-highlight">
              {hero.highlight}
            </span>
          )}
          {headlineParts[1]}
        </h1>
        {hero.sub && <p className="prospect-hero-sub">{hero.sub}</p>}
        <div className="prospect-hero-ctas">
          {hero.primaryCta && (
            <Link to={hero.primaryCta.to} className="prospect-cta-primary">
              {hero.primaryCta.label}
              <HiArrowUpRight aria-hidden="true" />
            </Link>
          )}
          {hero.secondaryCta && (
            <Link href={hero.secondaryCta.to} className="prospect-cta-secondary">
              {hero.secondaryCta.label}
              <FaArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
        {/* Risk-reversal microcopy under the CTAs — used to
            surface "free audit / no commitment" framing right
            where the decision happens. Renders only when
            hero.subNote is set on the data object. */}
        {hero.subNote && (
          <p className="prospect-hero-sub-note">{hero.subNote}</p>
        )}
      </div>
    </section>
  );
};

const Pains = ({ section }) => (
  <section className="prospect-pain" aria-labelledby="prospect-pain-heading">
    <SectionHeader
      eyebrow={section.eyebrow}
      heading={section.heading}
      id="prospect-pain-heading"
    />
    <div className="prospect-pain-grid">
      {section.items.map((p, i) => (
        <article key={i} className="prospect-pain-card">
          <div className="prospect-pain-pill">{p.pillar}</div>
          <h3 className="prospect-pain-title">{p.pain}</h3>
          <p className="prospect-pain-fix">{p.fix}</p>
        </article>
      ))}
    </div>
  </section>
);

const House = ({ section }) => (
  <section
    className="prospect-house"
    id="prospect-house"
    aria-labelledby="prospect-house-heading"
  >
    <SectionHeader
      eyebrow={section.eyebrow}
      heading={section.heading}
      sub={section.sub}
      id="prospect-house-heading"
      center
    />
    <div className="prospect-house-grid">
      {section.pillars.map((pillar) => {
        const Icon = pillar.iconKey ? SOLUTION_ICON_MAP[pillar.iconKey] : undefined;
        return (
          <article key={pillar.id} className="prospect-house-card">
            <div className="prospect-house-card-head">
              {Icon && (
                <span className="prospect-house-icon" aria-hidden="true">
                  <Icon />
                </span>
              )}
              <h3 className="prospect-house-card-title font-primary">
                {pillar.title}
              </h3>
            </div>
            {pillar.blurb && (
              <p className="prospect-house-card-blurb">{pillar.blurb}</p>
            )}
            {pillar.deliverables && pillar.deliverables.length > 0 && (
              <ul className="prospect-house-card-list">
                {pillar.deliverables.map((d, i) => (
                  <li key={i}>
                    <FaCheck aria-hidden="true" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  </section>
);

const STATS_ANIM_MS = 2200;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const formatStat = (item, n) => `${item.prefix || ""}${n}${item.suffix || ""}`;

const Stats = ({ section }) => {

  const items = useMemo(() => section.items || [], [section.items]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const numberRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let started = false;
    let cancelled = false;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      items.forEach((s, i) => {
        const node = numberRefs.current[i];
        if (node) node.textContent = formatStat(s, s.value);
      });
      setDone(true);
      return;
    }

    const start = () => {
      if (started || cancelled) return;
      started = true;
      const t0 = performance.now();
      const tick = (now) => {
        if (cancelled) return;
        const p = Math.min((now - t0) / STATS_ANIM_MS, 1);
        const eased = easeOutCubic(p);
        items.forEach((s, i) => {
          const node = numberRefs.current[i];
          if (node) node.textContent = formatStat(s, Math.round(s.value * eased));
        });
        if (p < 1) requestAnimationFrame(tick);
        else setDone(true);
      };
      requestAnimationFrame(tick);
    };

    const check = () => {
      if (started) return;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (r.top < vh * 0.75 && r.bottom > 0) {
        start();
        window.removeEventListener("scroll", check);
      }
    };

    check();
    if (!started) window.addEventListener("scroll", check, { passive: true });
    const fallback = setTimeout(() => {
      if (!started) start();
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener("scroll", check);
    };
  }, [items]);

  return (
    <section
      ref={sectionRef}
      className="prospect-stats mt-5"
      aria-labelledby="prospect-stats-heading"
    >
      <SectionHeader
        eyebrow={section.eyebrow}
        heading={section.heading}
        id="prospect-stats-heading"
        center
      />
      <div className="prospect-stats-grid">
        {items.map((s, i) => (
          <div key={s.label} className="prospect-stat-tile">
            <div
              className="prospect-stat-number font-primary"
              ref={(el) => {
                numberRefs.current[i] = el;
              }}
            >
              {formatStat(s, done ? s.value : 0)}
            </div>
            <div className="prospect-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Proof = ({ section }) => (
  <section className="prospect-proof" aria-labelledby="prospect-proof-heading">
    <SectionHeader
      eyebrow={section.eyebrow}
      heading={section.heading}
      id="prospect-proof-heading"
    />
    <div className="prospect-proof-grid">
      {section.items.map((p, i) => (
        <Link
          key={i}
          href={p.url}
          target={p.url?.startsWith("http") ? "_blank" : undefined}
          rel={p.url?.startsWith("http") ? "noopener noreferrer" : undefined}
          className="prospect-proof-card"
        >
          <div className="prospect-proof-image-wrapper">
            {p.image ? (
              <Image
                src={p.image}
                alt={p.name}
                className="prospect-proof-image"
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              /* Sticker placeholder for channels without imagery
                 yet — yellow + black stripe pattern, on-brand,
                 reads as "asset coming" not "broken thumbnail".
                 Set `image:` on the data once channel art lands. */
              <div
                className="prospect-proof-placeholder"
                aria-hidden="true"
              >
                <span className="prospect-proof-placeholder-text font-primary">
                  {p.name}
                </span>
              </div>
            )}
          </div>
          <div className="prospect-proof-body">
            {p.niche && <p className="prospect-proof-niche">{p.niche}</p>}
            <h3 className="prospect-proof-name font-primary">{p.name}</h3>
            {p.bullet && (
              <p className="prospect-proof-bullet">{p.bullet}</p>
            )}
            {p.handle && (
              <span className="prospect-proof-handle">
                {p.handle}
                <HiArrowUpRight aria-hidden="true" />
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
    {/* "Trusted by" overflow line — covers breadth without padding
        the proof grid with thin extra cards. Renders only when
        section.trustedByLine is set. */}
    {section.trustedByLine && (
      <p className="prospect-proof-trusted-by">{section.trustedByLine}</p>
    )}
  </section>
);

/* "Real receipts" — between Stats and Proof. Each tile is a
   slot for an anonymised YouTube Studio dashboard screenshot +
   a caption describing the partner without naming them. When
   item.image is null the tile renders a sticker placeholder
   ready to be swapped for the real screenshot. The note pill
   at the bottom echoes hero.subNote so anyone scrolling deep
   gets reminded the discovery call is consequence-free. */
const Receipts = ({ section }) => (
  <section
    className="prospect-receipts"
    aria-labelledby="prospect-receipts-heading"
  >
    <SectionHeader
      eyebrow={section.eyebrow}
      heading={section.heading}
      sub={section.sub}
      id="prospect-receipts-heading"
      center
    />
    <div className="prospect-receipts-grid">
      {section.items?.map((item, i) => (
        <article key={i} className="prospect-receipts-tile">
          <div className="prospect-receipts-tile-image">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.caption}
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <div
                className="prospect-receipts-placeholder"
                aria-hidden="true"
              >
                <span className="prospect-receipts-placeholder-tag font-primary">
                  Dashboard {i + 1}
                </span>
              </div>
            )}
          </div>
          <div className="prospect-receipts-body">
            {item.kicker && (
              <p className="prospect-receipts-kicker font-primary">
                {item.kicker}
              </p>
            )}
            <p className="prospect-receipts-caption">{item.caption}</p>
          </div>
        </article>
      ))}
    </div>
    {section.note && (
      <p className="prospect-receipts-note">{section.note}</p>
    )}
  </section>
);

/* "Meet the pod" — team strip between Proof and Process.
   Photos are passed via data.podSection.photos as an explicit
   array (vs the old CRA which pulled from a shared gallery
   data file — keeping it inline here until the gallery system
   is rebuilt in the new repo). Capped at 5 photos for tight
   visual rhythm. */
const Pod = ({ section }) => {
  const photos = section.photos?.slice(0, 5) || [];
  if (photos.length === 0) return null;
  return (
    <section
      className="prospect-pod"
      aria-labelledby="prospect-pod-heading"
    >
      <SectionHeader
        eyebrow={section.eyebrow}
        heading={section.heading}
        sub={section.sub}
        id="prospect-pod-heading"
      />
      <div className="prospect-pod-grid">
        {photos.map((photo, i) => (
          <Link
            key={i}
            to={section.ctaTo || "/team"}
            className="prospect-pod-card"
            aria-label={photo.caption || photo.alt}
          >
            <Image
              src={photo.src}
              alt={photo.caption || photo.alt || ""}
              width={400}
              height={400}
              style={{ width: "100%", height: "auto" }}
            />
          </Link>
        ))}
      </div>
      {section.ctaLabel && (
        <div className="prospect-pod-cta-wrap">
          <Link
            to={section.ctaTo || "/team"}
            className="prospect-pod-cta"
          >
            <span>{section.ctaLabel}</span>
            <HiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
};

const Process = ({ section }) => (
  <section
    className="prospect-process"
    aria-labelledby="prospect-process-heading"
  >
    <SectionHeader
      eyebrow={section.eyebrow}
      heading={section.heading}
      id="prospect-process-heading"
      center
    />
    <ol className="prospect-process-steps">
      {section.items.map((s) => (
        <li key={s.step} className="prospect-process-step">
          <span className="prospect-process-step-num font-primary">
            {s.step}
          </span>
          <div className="prospect-process-step-body">
            <h3 className="prospect-process-step-title font-primary">
              {s.title}
            </h3>
            <p className="prospect-process-step-text">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

const Testimonial = ({ t }) => (
  <section
    className="prospect-testimonial"
    aria-labelledby="prospect-testimonial-heading"
  >
    <h2 className="visually-hidden" id="prospect-testimonial-heading">
      What clients say
    </h2>
    <blockquote className="prospect-testimonial-card">
      <p className="prospect-testimonial-quote font-primary">“{t.quote}”</p>
      <footer className="prospect-testimonial-meta">
        {t.avatar && (
          <Image
            src={t.avatar}
            alt={t.author}
            className="prospect-testimonial-avatar"
            width={64}
            height={64}
          />
        )}
        <div>
          <div className="prospect-testimonial-author">{t.author}</div>
          {t.meta && (
            <div className="prospect-testimonial-role">{t.meta}</div>
          )}
        </div>
      </footer>
    </blockquote>
  </section>
);

const Faq = ({ section }) => {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="prospect-faq" aria-labelledby="prospect-faq-heading">
      <SectionHeader
        eyebrow={section.eyebrow}
        heading={section.heading}
        id="prospect-faq-heading"
        center
      />
      <div className="prospect-faq-list">
        {section.items.map((f, i) => {
          const open = i === openIndex;
          return (
            <div
              key={i}
              className={`prospect-faq-item ${open ? "is-open" : ""}`}
            >
              <button
                type="button"
                className="prospect-faq-q"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? -1 : i)}
              >
                <span className="prospect-faq-q-text">{f.q}</span>
                <span className="prospect-faq-q-icon" aria-hidden="true">
                  {open ? <FaMinus /> : <FaPlus />}
                </span>
              </button>
              {open && <p className="prospect-faq-a">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const Closer = ({ closer }) => {
  const EyebrowIcon = closer.eyebrowIconKey ? SOLUTION_ICON_MAP[closer.eyebrowIconKey] : undefined;
  return (
    <section
      className="prospect-closer mt-4"
      aria-labelledby="prospect-closer-heading"
    >
      <div className="prospect-closer-card">
        {/* When teamCluster is provided, render Anil's primary
            avatar with 2 small team-lead avatars overlapping
            behind it — reads as "founder + senior team" rather
            than "solo founder". Falls back to the single-avatar
            layout when teamCluster is omitted. */}
        {closer.avatar && closer.teamCluster?.filter((m) => m.photo)?.length ? (
          <span
            className="prospect-closer-avatar--cluster"
            aria-hidden="true"
          >
            {closer.teamCluster.filter((m) => m.photo).map((m, i) => (
              <Image
                key={`team-${i}`}
                src={m.photo}
                alt=""
                width={48}
                height={48}
                className="prospect-closer-avatar-side"
                style={{ zIndex: i + 1 }}
              />
            ))}
            <Image
              src={closer.avatar}
              alt=""
              width={64}
              height={64}
              className="prospect-closer-avatar-main"
            />
          </span>
        ) : (
          closer.avatar && (
            <span className="prospect-closer-avatar" aria-hidden="true">
              <Image
                src={closer.avatar}
                alt=""
                width={64}
                height={64}
              />
            </span>
          )
        )}
        <div className="prospect-closer-body">
          {closer.eyebrow && (
            <p className="prospect-closer-eyebrow">
              {EyebrowIcon && <EyebrowIcon aria-hidden="true" />}
              {closer.eyebrow}
            </p>
          )}
          <h2
            className="prospect-closer-heading font-primary"
            id="prospect-closer-heading"
          >
            {closer.heading}
          </h2>
          {closer.pitch && (
            <p className="prospect-closer-pitch">{closer.pitch}</p>
          )}
          {closer.ctaTo && closer.ctaLabel && (
            <Link to={closer.ctaTo} className="prospect-closer-cta">
              {closer.ctaLabel}
              <HiArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================
// Shared little component — section header (eyebrow + h2 +
// optional sub). Both left-aligned and centered variants.
// ============================================================

const SectionHeader = ({ eyebrow, heading, sub = "", id, center = false }) => (
  <header
    className={`prospect-section-header ${center ? "prospect-section-header--center" : ""
      }`}
  >
    {eyebrow && <p className="prospect-section-eyebrow">{eyebrow}</p>}
    {heading && (
      <h2 className="prospect-section-heading font-primary" id={id}>
        {heading}
      </h2>
    )}
    {sub && <p className="prospect-section-sub">{sub}</p>}
  </header>
);
