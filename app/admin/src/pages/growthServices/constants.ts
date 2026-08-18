import { useEffect, useState } from 'react';
import { growthServiceApi } from '@/services/adminApi';

/* Shared option lists for the Growth Services module.
 *
 * ICON_OPTIONS must stay in sync with the web app's icon registry
 * (app/web/src/components/Services/growth/icons.ts) — a name saved here that
 * the registry doesn't know renders as no icon at all on the page. Both lists
 * are checked by the same names, so add to both when extending. */

export const ICON_OPTIONS = [
  'FiActivity', 'FiAward', 'FiBarChart2', 'FiBookOpen', 'FiCalendar', 'FiCheckCircle',
  'FiClipboard', 'FiClock', 'FiCrop', 'FiEdit3', 'FiEye', 'FiFileText', 'FiFilm',
  'FiFrown', 'FiGlobe', 'FiHeadphones', 'FiHeart', 'FiImage', 'FiLayers', 'FiLayout',
  'FiMessageSquare', 'FiMic', 'FiMonitor', 'FiPackage', 'FiPenTool', 'FiPlay',
  'FiRefreshCw', 'FiRss', 'FiScissors', 'FiSearch', 'FiSend', 'FiSettings', 'FiShare2',
  'FiShield', 'FiSliders', 'FiSmartphone', 'FiStar', 'FiTarget', 'FiThumbsUp',
  'FiTrendingDown', 'FiTrendingUp', 'FiType', 'FiUser', 'FiUsers', 'FiVideo',
  'FiVideoOff', 'FiVolume2', 'FiZap',
  'FaYoutube', 'FaInstagram', 'FaTiktok', 'FaLinkedin', 'FaFacebook', 'FaXTwitter',
  'FaSpotify', 'FaApple', 'FaPodcast',
];

/** How a section's items are drawn on the page. */
export const RENDERER_OPTIONS = [
  { value: 'grid', label: 'Icon card grid — items from Features' },
  { value: 'timeline', label: 'Numbered timeline — items from Features' },
  { value: 'showcase', label: 'Platform showcase — items from Showcases' },
  { value: 'format-panels', label: 'Format panels — items from Showcases' },
  { value: 'case-study', label: 'Case study — uses Case Metrics + service fields' },
  { value: 'faq', label: 'FAQ accordion — items from FAQs' },
];

/** Renderers whose items live in the Features collection. */
export const FEATURE_RENDERERS = ['grid', 'timeline'];
/** Renderers whose items live in the Showcases collection. */
export const SHOWCASE_RENDERERS = ['showcase', 'format-panels'];

export const TONE_OPTIONS = [
  { value: 'page', label: 'Page (white)' },
  { value: 'tint', label: 'Tint (soft grey)' },
];

export const COLUMN_OPTIONS = [2, 3, 4, 6];

export const LAYOUT_OPTIONS = [
  { value: 'row', label: 'Row — icon beside the copy' },
  { value: 'stack', label: 'Stack — icon above centred copy' },
];

export const FAQ_VARIANT_OPTIONS = [
  { value: 'plain', label: 'Plain — plus / minus toggle' },
  { value: 'marked', label: 'Marked — brand bullet + chevron' },
];

export const DASHBOARD_OPTIONS = [
  { value: 'channel', label: 'Channel analytics (YouTube growth)' },
  { value: 'social', label: 'Social reach (video editing)' },
  { value: 'podcast', label: 'Podcast episodes' },
  { value: 'none', label: 'No dashboard' },
];

export const ILLUSTRATION_OPTIONS = [
  { value: 'youtube', label: 'Play tile + rising bars' },
  { value: 'social', label: 'Vertical tile + rising bars' },
  { value: 'podcast', label: 'Mic disc + rising bars' },
  { value: 'none', label: 'No illustration' },
];

export const CASE_ACCENT_OPTIONS = [
  { value: 'one', label: 'First line' },
  { value: 'two', label: 'Second line' },
  { value: 'none', label: 'Neither' },
];

export const CASE_BADGE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'youtube', label: 'YouTube subscribe pill' },
  { value: 'play', label: 'Play button' },
  { value: 'mic', label: 'Microphone' },
];

export const SHOWCASE_BADGE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'ratio', label: '9:16 ratio pill (platform card)' },
  { value: 'play', label: 'Audio waveform player (format panel)' },
  { value: 'video', label: 'Video frame (format panel)' },
];

export const SHOWCASE_TONE_OPTIONS = [
  { value: 'page', label: 'Page (white card)' },
  { value: 'brand', label: 'Brand tint (yellow)' },
  { value: 'soft', label: 'Soft grey' },
];

export const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Hero — under the headline' },
  { value: 'closing', label: 'Closing — the dark CTA band' },
];

export const CTA_VARIANT_OPTIONS = [
  { value: 'solid', label: 'Solid (filled)' },
  { value: 'outline', label: 'Outline (bordered)' },
];

export interface GrowthServiceOption {
  _id: string;
  name: string;
  slug?: string;
}

/**
 * All growth services, for the "which page does this belong to?" dropdowns and
 * the server-side list filter. Loaded once per page mount; the set is tiny
 * (one row per landing page) so a single unpaginated request is enough.
 */
export function useGrowthServiceOptions() {
  const [services, setServices] = useState<GrowthServiceOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    growthServiceApi
      .getAll({ limit: 100 })
      .then(({ data }) => setServices(data.data || []))
      .catch(() => setServices([]))
      .finally(() => setLoaded(true));
  }, []);

  return { services, loaded };
}
