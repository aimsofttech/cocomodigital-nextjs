/**
 * Phase 8a 2026-05-25: adapter that flattens a `solutions-pages`
 * the API doc into the shape `ProspectPage` consumes.
 *
 * Two reasons for the indirection (vs rewriting ProspectPage to
 * read snake_case the API field names directly):
 *
 *  1. ProspectPage is 740 lines of working JSX. Renaming 30+
 *     field references throughout invites typos / regressions.
 *  2. the API's field-naming conventions (snake_case groups,
 *     image_url text fields, array-of-objects deliverables) are
 *     editor-facing — the renderer cares about its own ergonomic
 *     names. Keep the boundary clean.
 *
 * Also handles two impedance mismatches:
 *  - Icon string keys (`"FaPlay"`) → React component references,
 *    via the icon map. Unknown keys render nothing.
 *  - Deliverables stored as `[{text: "…"}]` (the API's wrap-strings-
 *    in-objects shape) flattened back to `["…"]` for the renderer.
 */
import type { IconType } from "react-icons";
import {
  FaPlay,
  FaCog,
  FaSearch,
  FaDollarSign,
  FaUsers,
  FaCamera,
  FaPalette,
  FaChartLine,
  FaBullhorn,
  FaPencilAlt,
  FaMicrophone,
  FaFilm,
  FaMusic,
  FaShoppingCart,
  FaGraduationCap,
  FaHome,
  FaGlobe,
  FaHeart,
  FaStar,
  FaRocket,
  FaLightbulb,
  FaCheckCircle,
  FaHandshake,
  FaBriefcase,
  FaCode,
  FaMobile,
  FaDesktop,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaWhatsapp,
  FaBuilding,
  FaShoppingBag,
} from "react-icons/fa";
import { HiArrowUpRight } from "react-icons/hi2";

/**
 * String key → component map. Every react-icon a solution page
 * might reference goes here. Unknown keys are silently dropped.
 * Adding a new icon = one-line addition.
 */
export const SOLUTION_ICON_MAP: Record<string, IconType> = {
  FaPlay,
  FaCog,
  FaSearch,
  FaDollarSign,
  FaUsers,
  FaCamera,
  FaPalette,
  FaChartLine,
  FaBullhorn,
  FaPencilAlt,
  FaMicrophone,
  FaFilm,
  FaMusic,
  FaShoppingCart,
  FaGraduationCap,
  FaHome,
  FaGlobe,
  FaHeart,
  FaStar,
  FaRocket,
  FaLightbulb,
  FaCheckCircle,
  FaHandshake,
  FaBriefcase,
  FaCode,
  FaMobile,
  FaDesktop,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaWhatsapp,
  FaBuilding,
  FaShoppingBag,
  HiArrowUpRight,
};

const resolveIcon = (key?: string | null): IconType | undefined =>
  (key && SOLUTION_ICON_MAP[key]) || undefined;

/** Unwrap the API's [{text:"…"}] shape back into a plain string list. */
const unwrapDeliverables = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((row: any) => (typeof row === "string" ? row : row?.text))
    .filter((s: unknown): s is string => typeof s === "string" && s.length > 0);
};

const pick = <T>(...vals: Array<T | undefined | null>): T | undefined => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
};

/**
 * Convert a the API `solutions-pages` doc into the ProspectPage
 * `data` shape. Pure function — safe to call inside server
 * components.
 */
export function apiToProspectData(doc: any): any {
  if (!doc) return null;

  const out: any = {
    meta: {
      title: pick(doc.meta_title),
      description: pick(doc.meta_description),
    },
  };

  // ── HERO ──────────────────────────────────────────────────
  if (doc.hero) {
    const h = doc.hero;
    out.hero = {
      eyebrow: h.eyebrow ?? undefined,
      badgeLine: h.badgeLine ?? undefined,
      headline: h.headline ?? undefined,
      highlight: h.highlight ?? undefined,
      sub: h.subheadline ?? undefined,
      subNote: h.subNote ?? undefined,
      backgroundImage: h.background_image_url ?? undefined,
      primaryCta: h.primary_cta_text
        ? { label: h.primary_cta_text, to: h.primary_cta_url || "#" }
        : undefined,
      secondaryCta: h.secondary_cta_text
        ? { label: h.secondary_cta_text, to: h.secondary_cta_url || "#" }
        : undefined,
    };
  }

  // ── PAINS ─────────────────────────────────────────────────
  if (doc.pains_section?.items?.length) {
    out.painsSection = {
      eyebrow: doc.pains_section.eyebrow ?? undefined,
      heading: doc.pains_section.heading ?? undefined,
      items: doc.pains_section.items.map((p: any) => ({
        pain: p.pain,
        pillar: p.pillar,
        fix: p.fix,
      })),
    };
  }

  // ── HOUSE (pillars) ───────────────────────────────────────
  if (doc.house_section?.pillars?.length) {
    out.houseSection = {
      eyebrow: doc.house_section.eyebrow ?? undefined,
      heading: doc.house_section.heading ?? undefined,
      sub: doc.house_section.sub ?? undefined,
      pillars: doc.house_section.pillars.map((p: any) => ({
        id: p.key ?? p.id,
        iconKey: p.icon_key ?? undefined,
        title: p.title,
        blurb: p.blurb,
        deliverables: unwrapDeliverables(p.deliverables),
      })),
    };
  }

  // ── STATS ─────────────────────────────────────────────────
  if (doc.stats_section?.items?.length) {
    out.statsSection = {
      eyebrow: doc.stats_section.eyebrow ?? undefined,
      heading: doc.stats_section.heading ?? undefined,
      items: doc.stats_section.items.map((s: any) => ({
        prefix: s.prefix || "",
        value: Number(s.value) || 0,
        suffix: s.suffix || "",
        label: s.label,
      })),
    };
  }

  // ── RECEIPTS ──────────────────────────────────────────────
  if (doc.receipts_section?.items?.length) {
    out.receiptsSection = {
      eyebrow: doc.receipts_section.eyebrow ?? undefined,
      heading: doc.receipts_section.heading ?? undefined,
      sub: doc.receipts_section.sub ?? undefined,
      note: doc.receipts_section.note ?? undefined,
      items: doc.receipts_section.items.map((r: any) => ({
        image: r.image_url ?? null,
        caption: r.caption,
        kicker: r.kicker,
      })),
    };
  }

  // ── PROOF ─────────────────────────────────────────────────
  if (doc.proof_section?.items?.length) {
    out.proofSection = {
      eyebrow: doc.proof_section.eyebrow ?? undefined,
      heading: doc.proof_section.heading ?? undefined,
      trustedByLine: doc.proof_section.trustedByLine ?? undefined,
      items: doc.proof_section.items.map((p: any) => ({
        name: p.name,
        niche: p.niche,
        image: p.image_url ?? null,
        handle: p.handle,
        url: p.url,
        bullet: p.bullet,
      })),
    };
  }

  // ── POD ───────────────────────────────────────────────────
  if (doc.pod_section?.photos?.length) {
    out.podSection = {
      eyebrow: doc.pod_section.eyebrow ?? undefined,
      heading: doc.pod_section.heading ?? undefined,
      sub: doc.pod_section.sub ?? undefined,
      ctaLabel: doc.pod_section.cta_text ?? undefined,
      ctaTo: doc.pod_section.cta_url ?? undefined,
      photos: doc.pod_section.photos.map((p: any) => ({
        src: p.src,
        caption: p.caption,
      })),
    };
  }

  // ── PROCESS ───────────────────────────────────────────────
  if (doc.process_section?.items?.length) {
    out.processSection = {
      eyebrow: doc.process_section.eyebrow ?? undefined,
      heading: doc.process_section.heading ?? undefined,
      items: doc.process_section.items.map((s: any) => ({
        step: s.step,
        title: s.title,
        body: s.body,
      })),
    };
  }

  // ── TESTIMONIAL ───────────────────────────────────────────
  if (doc.testimonial?.quote) {
    out.testimonial = {
      quote: doc.testimonial.quote,
      author: doc.testimonial.author,
      meta: doc.testimonial.meta,
      avatar: doc.testimonial.avatar_url,
    };
  }

  // ── FAQ ───────────────────────────────────────────────────
  if (doc.faq_section?.items?.length) {
    out.faqSection = {
      eyebrow: doc.faq_section.eyebrow ?? undefined,
      heading: doc.faq_section.heading ?? undefined,
      items: doc.faq_section.items.map((f: any) => ({ q: f.q, a: f.a })),
    };
  }

  // ── CLOSER ────────────────────────────────────────────────
  if (doc.closer) {
    const c = doc.closer;
    out.closer = {
      eyebrow: c.eyebrow ?? undefined,
      eyebrowIconKey: c.eyebrow_icon_key ?? undefined,
      heading: c.heading ?? undefined,
      pitch: c.pitch ?? undefined,
      ctaLabel: c.cta_text ?? undefined,
      ctaTo: c.cta_url ?? undefined,
      avatar: c.avatar_url ?? undefined,
      teamCluster: Array.isArray(c.teamCluster)
        ? c.teamCluster.map((m: any) => ({
            name: m.name,
            photo: m.photo_url,
          }))
        : [],
    };
  }

  // ── WHATSAPP ──────────────────────────────────────────────
  if (doc.whatsapp?.number) {
    out.whatsapp = {
      number: doc.whatsapp.number,
      label: doc.whatsapp.label,
      text: doc.whatsapp.message_prefill,
    };
  }

  return out;
}
