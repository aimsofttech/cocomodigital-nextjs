/**
 * Normalize a video URL for playback.
 *
 * YouTube links copied while a playlist is open carry `&list=…&index=…`
 * params. react-player v2 treats any URL containing `list=` as a
 * playlist and discards the video id (getID returns null), so the
 * YouTube player throws "Invalid video id" and renders an empty
 * iframe. Reducing the URL to its canonical watch?v=<id> form makes
 * the single video play reliably.
 *
 * Non-YouTube URLs (mp4, Vimeo, …) pass through unchanged.
 */
const YOUTUBE_ID_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function cleanVideoUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(YOUTUBE_ID_PATTERN);
  if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
  return url;
}
