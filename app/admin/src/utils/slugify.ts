/**
 * Convert arbitrary text into a URL-friendly slug.
 * Mirrors the backend `slugify` ({ lower, strict, trim }) behaviour so the
 * value generated in the admin matches what the API would produce.
 */
export function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '') // drop non-alphanumerics
    .replace(/[\s_]+/g, '-') // spaces/underscores -> hyphen
    .replace(/-+/g, '-') // collapse repeats
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}
