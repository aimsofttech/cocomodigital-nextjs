/* X/Twitter reads the same 1200x630 card as Open Graph — one image to keep
   current instead of two that can drift. Re-exported rather than aliased so
   Next picks the file up as the twitter-image convention. */

export {
  default,
  alt,
  size,
  contentType,
  dynamic,
} from "./opengraph-image";
