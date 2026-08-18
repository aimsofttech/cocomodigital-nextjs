import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Builds the site-wide social sharing card at public/Images/og-cover.png.
 *
 * This is the image every page falls back to when it has no picture of its own
 * (see DEFAULT_OG_IMAGE in src/lib/seo.ts), so it is what WhatsApp, Facebook,
 * LinkedIn and X show for the home page, the legal pages, and any detail page
 * whose record has no media.
 *
 * It is generated into a committed static file rather than rendered per
 * request. Scrapers fetch og:image anonymously, once, with a short timeout and
 * no retry — a static file under /public is served by the CDN in one hop,
 * where a rendered route risks a cold start and a silently dropped preview.
 *
 * Run with `npm run og:cover` after changing the logo or the brand colours.
 * The output is deterministic, so re-running with no source change produces a
 * byte-identical file.
 */

/* 1200x630 is the 1.91:1 box Facebook, LinkedIn and X all crop to, and the
   size WhatsApp needs to render a large preview rather than a thumbnail. */
const WIDTH = 1200;
const HEIGHT = 630;

/* The brand yellow is ~1.1:1 on white, so the logo can only carry itself on
   the near-black ground the site uses everywhere else. On a transparent or
   white card it would be effectively invisible in a feed. */
const INK = "#111111";
const BRAND = "#fff000";

/* The lockup is composed from its two parts rather than using the single-line
   logo-01.png, because the brand's stacked arrangement — butterfly on the
   left, "cocoma" over "digital" on the right — reads far better in a 1.91:1
   share card. The one-line version has to shrink to fit the width, which
   leaves the mark small and the card mostly empty. */
const MARK = "Images/logo/main-logo.png";
const WORDMARK = "Images/logo/name-logo.png";

/* Sized by height so both parts share a centre line whatever their source
   dimensions. The mark is set slightly shorter than the wordmark: matching
   them exactly makes the butterfly look oversized next to two text lines. */
const WORDMARK_HEIGHT = 232;
const MARK_HEIGHT = 214;
const GAP = 58;

const OUTPUT = "Images/og-cover.png";

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const outputPath = path.join(publicDir, OUTPUT);

  const resizeToHeight = async (file: string, height: number) => {
    const buffer = await sharp(path.join(publicDir, file))
      .resize({ height, fit: "inside" })
      .png()
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
  };

  const mark = await resizeToHeight(MARK, MARK_HEIGHT);
  const wordmark = await resizeToHeight(WORDMARK, WORDMARK_HEIGHT);

  /* The two parts are laid out as one block, then the block is centred — so
     changing either height keeps the lockup centred without re-tuning offsets. */
  const lockupWidth = mark.width + GAP + wordmark.width;
  const lockupLeft = Math.round((WIDTH - lockupWidth) / 2);
  const centreY = Math.round(HEIGHT / 2) - 7;

  /* A brand rule along the bottom edge, matching the offset-shadow motif the
     site's cards use. Drawn as SVG so it stays crisp at any scale. */
  const rule = Buffer.from(
    `<svg width="${WIDTH}" height="14" xmlns="http://www.w3.org/2000/svg">
       <rect width="${WIDTH}" height="14" fill="${BRAND}"/>
     </svg>`,
  );

  const card = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: INK,
    },
  })
    .composite([
      /* Both parts hang off the same centre line, which sits a few pixels
         above true middle so the block reads as centred with the rule below. */
      {
        input: mark.buffer,
        top: centreY - Math.round(mark.height / 2),
        left: lockupLeft,
      },
      {
        input: wordmark.buffer,
        top: centreY - Math.round(wordmark.height / 2),
        left: lockupLeft + mark.width + GAP,
      },
      { input: rule, top: HEIGHT - 14, left: 0 },
    ])
    /* Flattened to RGB: a transparent PNG is composited against an unknown
       colour by each platform, and several of them pick white — which would
       drop a yellow logo to unreadable. */
    .flatten({ background: INK })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, card);

  const kb = (card.length / 1024).toFixed(1);
  console.log(`✅ ${OUTPUT} — ${WIDTH}x${HEIGHT}, ${kb} KB`);
  /* WhatsApp gives up on images much past ~300 KB and falls back to a
     text-only preview, which is the exact failure this card exists to fix. */
  if (card.length > 300 * 1024) {
    console.warn("⚠️  Over 300 KB — WhatsApp may skip it. Lower the quality or simplify the card.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
