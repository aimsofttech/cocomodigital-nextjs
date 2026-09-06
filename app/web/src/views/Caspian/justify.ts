/**
 * Justified row geometry, computed from stored dimensions.
 *
 * Every asset carries its own width and height, so the layout is a pure
 * function of the payload and one container width — no image has to load,
 * and nothing is measured in the DOM. That matters because measuring means
 * a reflow after every image lands, and a grid of sixty that rearranges
 * itself while you are reading it is worse than one that is slightly wrong.
 *
 * WHY JUSTIFIED AND NOT MASONRY
 *
 * The listing is RANKED when there is a search term — the controller sorts
 * by textScore. CSS-columns masonry fills column one top to bottom, then
 * column two, so result #1 ends up beside result #13 and result #2 is half
 * a screen away. Justified rows keep rank as strict reading order. That is
 * not a matter of taste; it is the difference between a ranked list and a
 * shuffled one.
 *
 * WHY NOT THE flex-grow TRICK
 *
 * The pure-CSS version (flex-grow: aspectRatio) distorts ratios and forces
 * object-fit: cover to hide it — which is exactly the crop this library
 * should not be doing. Computing the numbers costs one O(n) pass over at
 * most a hundred items and keeps every image at its true shape.
 */

export interface Sized {
  width: number | null;
  height: number | null;
  assetType?: string;
  kind?: string;
}

export interface Placed<T> {
  item: T;
  width: number;
  height: number;
}

export interface Row<T> {
  items: Placed<T>[];
  height: number;
}

/* A fallback shape for rows with no measured dimensions.
 *
 * The library predates the ingest that probes files, so migrated rows can
 * carry null width and height. Treating those as zero divides by zero and
 * treating them as square makes a wall of them; 3:2 is the commonest
 * photographic shape and is wrong in the least surprising direction. */
const FALLBACK_RATIO = 3 / 2;

/* Bounds on what counts as photographic. Outside these a file is some kind
 * of graphic — a wordmark, a banner strip, a tall key-art panel — whatever
 * assetType claims. A 6:1 lockup allowed into a row at its true ratio eats
 * the width of three photographs while carrying a tenth of the meaning. */
const GRAPHIC_TYPES = new Set([
  "logo-mark", "vector", "illustration", "blank-template", "deck-slide",
]);
const PHOTO_MIN = 0.5;
const PHOTO_MAX = 2.4;

export const ratioOf = (a: Sized): number => {
  if (!a.width || !a.height) return FALLBACK_RATIO;
  const r = a.width / a.height;
  return Number.isFinite(r) && r > 0 ? r : FALLBACK_RATIO;
};

/**
 * Which of the two tile families an asset belongs to.
 *
 * Two rules, because neither alone is enough. The ratio test catches wide
 * wordmarks and tall strips using dimensions every row has. The assetType
 * test catches the square black-on-transparent logo that sits comfortably
 * inside photographic bounds and would otherwise be cropped like a photo.
 */
export const familyOf = (a: Sized): "photo" | "graphic" => {
  if (a.assetType && GRAPHIC_TYPES.has(a.assetType)) return "graphic";
  const r = ratioOf(a);
  return r > PHOTO_MAX || r < PHOTO_MIN ? "graphic" : "photo";
};

/** The ratio a tile actually occupies in a row. */
const layoutRatio = (a: Sized): number => {
  const r = ratioOf(a);
  /* Graphics are clamped into the row rather than admitted at their true
   * shape. A 6:1 wordmark enters as 2.2:1 and is letterboxed inside that
   * box — which is the right answer for artwork and the wrong one for a
   * photograph. The original code's mistake was not choosing `contain`; it
   * was applying `contain` to everything. */
  if (familyOf(a) === "graphic") return Math.min(Math.max(r, 0.7), 2.2);
  return r;
};

/**
 * Lay items out in justified rows.
 *
 * `targetHeight` is a target, not a rule — a row is accepted when its
 * computed height lands within tolerance, and the greedy fill takes
 * whichever of "with this item" or "without it" sits closer to the target.
 */
export function justify<T extends Sized>(
  items: T[],
  containerWidth: number,
  targetHeight: number,
  gap: number,
  { maxPerRow = 8, minHeight = 72 }: { maxPerRow?: number; minHeight?: number } = {},
): Row<T>[] {
  const rows: Row<T>[] = [];
  if (!items.length || containerWidth <= 0) return rows;

  /* Below this the greedy fill degenerates: a single 3:2 photo at the
   * target height is already wider than the viewport, so every row holds
   * one item and the result is a column of full-bleed pictures. Invert the
   * driver — fix the count, solve for height — and the same equation gives
   * a usable phone layout. */
  const narrow = containerWidth < 640;
  const perRow = containerWidth < 420 ? 2 : 3;

  let i = 0;
  while (i < items.length) {
    const row: T[] = [];
    let sumR = 0;
    let height = targetHeight;

    while (i < items.length) {
      const candidate = items[i];
      const r = layoutRatio(candidate);
      const nextSum = sumR + r;
      const nextH = (containerWidth - row.length * gap) / nextSum;

      if (narrow) {
        row.push(candidate); sumR = nextSum; i += 1;
        if (row.length >= perRow) break;
        continue;
      }

      /* Accept the item if the row is still too tall without it. Once
       * adding it would drop below the target, take whichever side of the
       * target is closer — that is what stops a row of two enormous tiles
       * appearing next to a row of six small ones. */
      if (!row.length || nextH >= targetHeight) {
        row.push(candidate); sumR = nextSum; height = nextH; i += 1;
        if (row.length >= maxPerRow) break;
      } else {
        const withIt = Math.abs(nextH - targetHeight);
        const withoutIt = Math.abs(height - targetHeight);
        if (withIt <= withoutIt) {
          row.push(candidate); sumR = nextSum; height = nextH; i += 1;
        }
        break;
      }
    }

    if (!row.length) break;
    let h = (containerWidth - (row.length - 1) * gap) / sumR;

    /* The last row is never stretched. Two items justified across a full
     * container become enormous and the page ends on a lie about how much
     * is left. Lay it at the target height, left aligned, ragged. */
    const isLast = i >= items.length;
    if (isLast && h > targetHeight * 1.15) h = targetHeight;
    h = Math.max(minHeight, h);

    const placed: Placed<T>[] = row.map((item) => ({
      item,
      width: Math.round(layoutRatio(item) * h),
      height: Math.round(h),
    }));

    /* Distribute the rounding error a pixel at a time, or the right edge
     * comes out 1–3px ragged and reads as a rendering fault on a dark
     * ground. Only for full rows — a ragged last row is deliberate. */
    if (!isLast || h !== targetHeight) {
      const used = placed.reduce((n, p) => n + p.width, 0) + (placed.length - 1) * gap;
      let slack = Math.round(containerWidth - used);
      for (let k = 0; slack !== 0 && k < placed.length; k += 1) {
        const step = slack > 0 ? 1 : -1;
        placed[k].width += step;
        slack -= step;
      }
    }

    rows.push({ items: placed, height: Math.round(h) });
  }

  return rows;
}
