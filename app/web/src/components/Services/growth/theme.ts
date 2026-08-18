/**
 * Shared visual language for the three growth landing pages.
 *
 * These pages originally shipped with their own palette — a red (#EE2B2C)
 * accent over neutral greys, soft radii and blurred shadows. That is a
 * different design system from the rest of the site, which is built on
 * semantic tokens (tailwind.config.ts → --bg-page / --text-strong / --brand)
 * and a sticker look: 2px near-black borders, hard offset shadows, and yellow
 * used as a *surface* or highlight rather than as text.
 *
 * Everything below is expressed in those tokens so the pages inherit any
 * future theme change instead of pinning literal hexes.
 *
 * Contrast note: --brand (#fff000) against white is ~1.1:1, so it is never
 * used for text or thin glyphs on a light surface. It appears as a filled
 * chip/shadow behind near-black content (--brand-on is #000), or as the
 * marker-pen highlight the rest of the site uses for emphasis.
 *
 * These are plain strings so Tailwind's scanner still sees complete class
 * names (tailwind.config.ts globs `./src/**` and picks this file up).
 */

/* ── Surfaces ──────────────────────────────────────────────────────────── */

/** Section tones. `tint` is the site's standard alternating section break. */
export const SECTION_TONES = {
  page: "bg-page",
  tint: "bg-page-soft",
} as const;

/** Sticker card: white surface, hard black frame, yellow offset shadow. */
export const CARD =
  "rounded-sticker border-2 border-strong bg-page shadow-[4px_4px_0_var(--brand,#fff000)]";

/** Same frame, plus the site's lift-on-hover. Use on interactive cards. */
export const CARD_INTERACTIVE = `${CARD} transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--brand,#fff000)]`;

/** Quieter frame for dense grids where a yellow shadow on every tile shouts. */
export const CARD_FLAT =
  "rounded-sticker border-2 border-strong bg-page transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--brand,#fff000)]";

/* ── Accent marks ─────────────────────────────────────────────────────── */

/** Marker-pen highlight behind near-black text — the site's emphasis motif. */
export const HIGHLIGHT =
  "bg-[linear-gradient(transparent_55%,var(--brand,#fff000)_55%)] bg-no-repeat px-1";

/** Filled brand chip holding a near-black glyph. High contrast, on-brand. */
export const ICON_CHIP =
  "flex shrink-0 items-center justify-center rounded-sticker border-2 border-strong bg-brand text-brand-on";

/** Numbered/step marker — solid near-black disc, white numeral. */
export const STEP_MARKER =
  "flex items-center justify-center rounded-full border-2 border-strong bg-strong font-black text-page";

/* ── Buttons ───────────────────────────────────────────────────────────── */

export const CTA_BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill border-2 border-strong px-5 py-3 text-sm font-black tracking-wide uppercase transition-[transform,box-shadow,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-strong";

/**
 * `default` sits on a light surface, `onDark` on the near-black closing band.
 * Both keep the offset shadow that every other button on the site carries.
 */
export const CTA_VARIANTS = {
  default: {
    /* Near-black fill + yellow shadow — 21:1 on its own label. */
    solid:
      "bg-strong text-page shadow-[3px_3px_0_var(--brand,#fff000)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_var(--brand,#fff000)]",
    outline:
      "bg-page text-strong shadow-[3px_3px_0_var(--text-strong,#111)] hover:-translate-x-px hover:-translate-y-px hover:bg-page-soft hover:shadow-[5px_5px_0_var(--text-strong,#111)]",
  },
  onDark: {
    /* Brand yellow carries black text here — the one place it can. */
    solid:
      "border-strong bg-brand text-brand-on shadow-[3px_3px_0_rgba(255,255,255,0.9)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_rgba(255,255,255,0.9)]",
    outline:
      "border-white bg-transparent text-white hover:bg-white hover:text-strong",
  },
} as const;

export type CtaTone = keyof typeof CTA_VARIANTS;

/* ── Type scale helpers ───────────────────────────────────────────────── */

/** Section eyebrow: small, wide-tracked, near-black on a yellow marker. */
export const EYEBROW =
  "text-md sm:text-xl font-black tracking-[0.18em] text-strong uppercase";
