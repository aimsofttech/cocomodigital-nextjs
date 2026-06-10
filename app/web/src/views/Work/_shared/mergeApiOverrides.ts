// @ts-nocheck
/**
 * mergeApiOverrides — shared helper for /work/* views.
 *
 * Mirrors the Solutions helper but for the WorkCategoryPage data
 * shape (hero / stats / audience / methodology / credentials /
 * studioLife / closingCta).
 *
 * Rules:
 *   - Text fields prefer the API doc when set
 *   - Icon-bearing structures stay hardcoded (admin can't store
 *     React icons)
 *   - Media uploads (studioLife photos) — the API wins if set,
 *     else fall back to hardcoded URLs
 */

const pick = <T,>(a: T | undefined | null, b: T): T =>
  a === undefined || a === null || a === "" ? b : a;

export const mergeApiOverrides = (data: any, doc: any): any => {
  if (!doc) return data;
  const h = doc.hero ?? {};
  const cc = doc.closingCta ?? {};

  return {
    ...data,
    meta: {
      title: pick(doc.meta_title, data.meta?.title),
      description: pick(doc.meta_description, data.meta?.description),
    },
    hero: {
      ...data.hero,
      eyebrow: pick(h.eyebrow, data.hero?.eyebrow),
      headline: pick(h.headline, data.hero?.headline),
      sub: pick(h.subheadline, data.hero?.sub),
      primaryCta: {
        label: pick(h.primary_cta_text, data.hero?.primaryCta?.label),
        to: pick(h.primary_cta_url, data.hero?.primaryCta?.to),
      },
      secondaryCta: {
        label: pick(h.secondary_cta_text, data.hero?.secondaryCta?.label),
        to: pick(h.secondary_cta_url, data.hero?.secondaryCta?.to),
      },
    },
    closingCta: {
      ...data.closingCta,
      eyebrow: pick(cc.eyebrow, data.closingCta?.eyebrow),
      heading: pick(cc.heading, data.closingCta?.heading),
      pitch: pick(cc.pitch, data.closingCta?.pitch),
      ctaLabel: pick(cc.cta_text, data.closingCta?.ctaLabel),
      ctaTo: pick(cc.cta_url, data.closingCta?.ctaTo),
    },
  };
};
