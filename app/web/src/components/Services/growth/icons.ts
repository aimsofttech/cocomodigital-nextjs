import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCrop,
  FiEdit3,
  FiEye,
  FiFileText,
  FiFilm,
  FiFrown,
  FiGlobe,
  FiHeadphones,
  FiHeart,
  FiImage,
  FiLayers,
  FiLayout,
  FiMessageSquare,
  FiMic,
  FiMonitor,
  FiPackage,
  FiPenTool,
  FiPlay,
  FiRefreshCw,
  FiRss,
  FiScissors,
  FiSearch,
  FiSend,
  FiSettings,
  FiShare2,
  FiShield,
  FiSliders,
  FiSmartphone,
  FiStar,
  FiTarget,
  FiThumbsUp,
  FiTrendingDown,
  FiTrendingUp,
  FiType,
  FiUser,
  FiUsers,
  FiVideo,
  FiVideoOff,
  FiVolume2,
  FiZap,
} from "react-icons/fi";
import {
  FaApple,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPodcast,
  FaSpotify,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

/* Icon registry for the growth landing pages.
 *
 * The API stores icons as names, not components, so the admin can pick one
 * without the CMS knowing anything about React. This map is the other half of
 * that contract: it must stay in sync with ICON_OPTIONS in the admin panel
 * (app/admin/src/pages/growthServices/constants.ts). A name the admin offers
 * but this map lacks would silently fall back to the neutral placeholder.
 *
 * Importing each icon by name (rather than the whole icon pack) keeps the
 * bundle to only what these pages can actually render.
 */
export const GROWTH_ICONS: Record<string, IconType> = {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCrop,
  FiEdit3,
  FiEye,
  FiFileText,
  FiFilm,
  FiFrown,
  FiGlobe,
  FiHeadphones,
  FiHeart,
  FiImage,
  FiLayers,
  FiLayout,
  FiMessageSquare,
  FiMic,
  FiMonitor,
  FiPackage,
  FiPenTool,
  FiPlay,
  FiRefreshCw,
  FiRss,
  FiScissors,
  FiSearch,
  FiSend,
  FiSettings,
  FiShare2,
  FiShield,
  FiSliders,
  FiSmartphone,
  FiStar,
  FiTarget,
  FiThumbsUp,
  FiTrendingDown,
  FiTrendingUp,
  FiType,
  FiUser,
  FiUsers,
  FiVideo,
  FiVideoOff,
  FiVolume2,
  FiZap,
  FaApple,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPodcast,
  FaSpotify,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
};

/** Shown where the layout needs an icon but the stored name is empty/unknown. */
const FALLBACK_ICON: IconType = FiCheckCircle;

/** Resolve a stored icon name, or `undefined` when the slot is optional. */
export const optionalIcon = (name?: string | null): IconType | undefined =>
  name ? GROWTH_ICONS[name] : undefined;

/** Resolve a stored icon name, falling back so a required slot never renders empty. */
export const requiredIcon = (name?: string | null): IconType =>
  optionalIcon(name) ?? FALLBACK_ICON;
