import { useEffect, useState } from 'react';
import { podcastPageApi } from '@/services/adminApi';

/* Shared option lists for the Podcast module.
 *
 * ICON_OPTIONS must stay in sync with the web app's icon registry
 * (app/web/src/views/Services/PodcastGrowth/PodcastVisuals.tsx) — a name saved
 * here that the registry doesn't know renders as no icon at all on the page.
 * Both lists are checked by the same names, so add to both when extending.
 *
 * The labels spell out where each icon is already used, because the names on
 * their own ("thumb", "notes") don't say much in a dropdown.
 */
export const ICON_OPTIONS = [
  { value: 'video', label: 'video — camera + play (video editing)' },
  { value: 'audio', label: 'audio — waveform bars (audio editing)' },
  { value: 'clip', label: 'clip — vertical phone frame (short-form)' },
  { value: 'thumb', label: 'thumb — picture frame (thumbnails)' },
  { value: 'notes', label: 'notes — document (show notes, SEO)' },
  { value: 'publish', label: 'publish — upload arrow (publishing)' },
  { value: 'globe', label: 'globe — world (dubbing, localization)' },
  { value: 'chart', label: 'chart — rising line (analytics)' },
  { value: 'mic', label: 'mic — microphone (founders with a show)' },
  { value: 'brand', label: 'brand — building (brands)' },
  { value: 'network', label: 'network — connected nodes (networks)' },
  { value: 'clock', label: 'clock — time zones, working hours' },
  { value: 'dollar', label: 'dollar — pricing, currency' },
  { value: 'lock', label: 'lock — ownership, access' },
];

/** Bands that draw their figure tiles from the Stats collection. */
export const STAT_SECTION_OPTIONS = [
  { value: 'trust', label: 'Trust strip — the four numbers under the hero' },
  { value: 'problem', label: 'Problem band — "the recording is the cheapest part"' },
  { value: 'scale', label: 'Scale tiles — the four figures in the studio strip' },
];

/** Bands that draw their repeating items from the Cards collection. */
export const CARD_SECTION_OPTIONS = [
  { value: 'services', label: 'Services — the eight service cards' },
  { value: 'audiences', label: 'Audiences — "who it’s for"' },
  { value: 'operations', label: 'Time zones — "the practical questions"' },
  { value: 'process', label: 'Process — "from audit to operating system"' },
  { value: 'month', label: 'Month table — "what a full month looks like"' },
];

/** Which inline diagram is drawn beside a Signal-to-Scale stage. */
export const DIAGRAM_OPTIONS = [
  { value: 'align', label: 'Align — one goal with three pillars' },
  { value: 'engineer', label: 'Engineer — two packaging routes, one winning' },
  { value: 'amplify', label: 'Amplify — one session, many outputs' },
  { value: 'optimize', label: 'Optimize — retention curve with the drop-off' },
  { value: 'none', label: 'No diagram' },
];

/** Where a button or link renders on the page. */
export const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Hero — under the headline' },
  { value: 'pricing', label: 'Pricing — the footer of the price card' },
  { value: 'founder', label: 'Founder — under the founder note' },
  { value: 'proof', label: 'Proof — the two links in the proof band' },
];

export const CTA_VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary — filled yellow button with an arrow' },
  { value: 'secondary', label: 'Secondary — bordered link, no arrow' },
];

export const OG_TYPE_OPTIONS = [
  { value: 'website', label: 'Website — a standing page (use this for a service)' },
  { value: 'article', label: 'Article — a dated piece of writing' },
];

export const TWITTER_CARD_OPTIONS = [
  { value: 'summary_large_image', label: 'Large image — full-width card' },
  { value: 'summary', label: 'Summary — small square thumbnail' },
];

/** Recommended upload specs, matching what each slot renders at on the page. */
export const HERO_POSTER_SPEC = {
  width: 1200,
  height: 643,
  ratio: '1.87:1',
  formats: 'JPG, WebP',
  maxSizeMB: 1,
  note: 'the hero photograph — it is the page’s largest image, so keep it light',
};

export const PROBLEM_BG_SPEC = {
  width: 1920,
  height: 1080,
  ratio: '16:9',
  formats: 'JPG, WebP',
  maxSizeMB: 1,
  note: 'decorative backdrop, heavily scrimmed and cropped to fill the band',
};

export const PORTRAIT_SPEC = {
  width: 592,
  height: 682,
  ratio: '~6:7',
  formats: 'JPG, WebP',
  maxSizeMB: 1,
  note: 'the founder portrait — a vertical crop, head and shoulders',
};

/* The Signal-to-Scale illustrations. Wide and short, drawn as line art — an
   SVG keeps the strokes crisp at any size, which a screenshot would not. */
export const STAGE_ART_SPEC = {
  width: 320,
  height: 132,
  ratio: '~2.4:1',
  formats: 'SVG, PNG, WebP',
  maxSizeMB: 1,
  note: 'line art on a transparent background; it sits on a tinted panel',
};

export const STUDIO_SHOT_SPEC = {
  width: 1200,
  height: 675,
  ratio: '16:9',
  formats: 'JPG, WebP',
  maxSizeMB: 1,
  note: 'studio photograph, cropped to fit its frame',
};

export interface PodcastPageOption {
  _id: string;
  name: string;
  slug?: string;
}

/**
 * Every podcast page, for the "which page does this belong to?" dropdowns and
 * the server-side list filter. Loaded once per page mount; the set is tiny
 * (one row per page) so a single unpaginated request is enough.
 */
export function usePodcastPageOptions() {
  const [pages, setPages] = useState<PodcastPageOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    podcastPageApi
      .getAll({ limit: 100 })
      .then(({ data }) => setPages(data.data || []))
      .catch(() => setPages([]))
      .finally(() => setLoaded(true));
  }, []);

  return { pages, loaded };
}

/* Where the website serves the files that ship inside its own repo.
 *
 * Image fields on this page can hold either an uploaded S3 URL or a path under
 * the website's /public folder (which is what the seeded records carry). The
 * admin panel is served from a different origin, so a site-relative path would
 * resolve against the panel and draw a broken thumbnail. Preview them against
 * the live site instead; the stored value is never rewritten. */
export const SITE_MEDIA_BASE = 'https://cocomadigital.com';

/** Absolute URL for previewing an image field value in the admin panel. */
export const previewUrl = (value?: string) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_MEDIA_BASE}${value.startsWith('/') ? '' : '/'}${value}`;
};
