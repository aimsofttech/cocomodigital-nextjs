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
 * Run with `npm run og:cover -w @cocoma/web` after changing the logo or the
 * brand colours. The output is deterministic, so re-running with no source
 * change produces a byte-identical file.
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

/** Full "butterfly + cocoma digital" lockup — the mark people recognise. */
const LOGO = "Images/logo/logo-01.png";
const LOGO_WIDTH = 760;

const OUTPUT = "Images/og-cover.png";

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const outputPath = path.join(publicDir, OUTPUT);

  const logo = await sharp(path.join(publicDir, LOGO))
    .resize({ width: LOGO_WIDTH, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const { height: logoHeight = 0 } = await sharp(logo).metadata();

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
      /* Optically centred: sitting the lockup a little above the true middle
         reads as centred once the bottom rule is in place. */
      { input: logo, top: Math.round((HEIGHT - logoHeight) / 2) - 18, left: Math.round((WIDTH - LOGO_WIDTH) / 2) },
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
