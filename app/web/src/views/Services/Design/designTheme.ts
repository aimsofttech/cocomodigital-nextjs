import { CTA_BASE, CTA_VARIANTS } from "@/src/components/Services/growth/theme";

/**
 * Class strings shared by the /services/design sections.
 *
 * The page is Tailwind-only against the site's semantic tokens, the same way
 * the growth landing pages are. Buttons reuse the growth CTA classes so the
 * outlined pill here is the outlined pill everywhere else on the site.
 */

/** 1200px content column with 40px gutters (20px on phones). */
export const WRAP = "mx-auto w-full max-w-[1200px] px-5 md:px-10";

export const EYEBROW = "text-[13px] font-black tracking-[1.4px] text-strong uppercase";

/** Section title: Satoshi 900, tight, 30px on phones → 44px on desktop. */
export const H2 =
  "font-primary text-[30px] leading-[1.05] font-black tracking-[-1.2px] text-strong md:text-[44px]";

/** Lead paragraph under a heading. */
export const LEAD = "text-[17px] leading-[1.35] font-medium text-muted md:text-xl";

/** White outlined pill with the hard black offset — "EXPLORE MORE ↗". */
export const BTN_OUTLINE = `${CTA_BASE} ${CTA_VARIANTS.default.outline} min-h-11`;

/** Solid black pill, no shadow — the "Add to call" idiom from the service cards. */
export const BTN_DARK =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border-2 px-5 py-2.5 text-[15px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-strong";
export const BTN_DARK_IDLE = "border-black bg-black text-white hover:bg-neutral-800";
export const BTN_DARK_ACTIVE = "border-black bg-[#fff000] text-black hover:bg-[#f4e600]";

/** Bordered sticker frame used for every tile and card on the page. */
export const FRAME = "overflow-hidden rounded-sticker border-2 border-strong";
