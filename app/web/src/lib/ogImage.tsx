import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getGrowthService } from "./growthServices";
import { SITE_NAME, SITE_URL } from "./seo";

/**
 * The shared social-sharing card for the growth landing pages.
 *
 * Every service route exports `opengraph-image` and `twitter-image` files that
 * call `growthOgImage(slug, fallback)`, so Facebook, LinkedIn, WhatsApp and X
 * all resolve a real 1200x630 PNG at an absolute URL that Next wires into the
 * document head — no binary asset to commit, and the card restates whatever the
 * admin panel currently holds for that page.
 *
 * The card is drawn in the site's own language: near-black ground, the brand
 * yellow as a filled surface rather than as type (#fff000 on white is ~1.1:1
 * and unreadable as text), and the rounded chip the sticker cards use.
 *
 * A note on the markup: this is rendered by satori, not by a browser. Satori
 * implements a subset of CSS and requires an explicit `display` on any element
 * with more than one child, so every container below sets one, and text is
 * passed as a single interpolated string rather than as several adjacent
 * children. Getting that wrong fails the whole response rather than degrading,
 * which shows up as an empty share preview.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BRAND = "#fff000";
const INK = "#111111";
const PAPER = "#ffffff";

export interface GrowthOgFallback {
  /** Page name, shown as the card's headline. */
  title: string;
  /** One-line summary under the headline. */
  description: string;
  /** Small label above the headline (e.g. "YouTube Growth"). */
  eyebrow?: string;
}

/* Helvetica ships with the site already, so the card matches the pages rather
   than rendering in a stock UI font. A missing or unreadable font file is not
   worth failing a share preview over — returning undefined lets ImageResponse
   fall back to the font it bundles. */
async function loadFonts() {
  const dir = path.join(process.cwd(), "public", "helvetica-255");
  try {
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, "Helvetica.ttf")),
      readFile(path.join(dir, "Helvetica-Bold.ttf")),
    ]);
    return [
      { name: "Helvetica", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Helvetica", data: bold, weight: 700 as const, style: "normal" as const },
    ];
  } catch {
    return undefined;
  }
}

/** Keep the card's text from overflowing on very long service names. */
const clamp = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;

export async function growthOgImage(slug: string, fallback: GrowthOgFallback) {
  /* Live copy when the API is reachable, the route's own fallback when it is
     not, so a share preview never renders an empty card. */
  const service = await getGrowthService(slug).catch(() => null);

  const title = clamp(
    service?.seo.openGraph.title || service?.name || fallback.title,
    72,
  );
  const description = clamp(
    service?.seo.openGraph.description || service?.seo.description || fallback.description,
    150,
  );
  const eyebrow = clamp(
    fallback.eyebrow || service?.hero.badge.label || "Growth Services",
    44,
  );
  const displayUrl = `${SITE_URL.replace(/^https?:\/\//, "")}/services/${slug}`;
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: 64,
          fontFamily: fonts ? "Helvetica" : undefined,
        }}
      >
        {/* Brand rule down the right edge. The closing CTA band's dotted field
            would be the closer match, but satori does not rasterise repeating
            radial gradients — it drops them silently, which reads as a bug in
            the card rather than as a missing flourish. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 14,
            height: 630,
            display: "flex",
            background: BRAND,
          }}
        />

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: BRAND,
              color: INK,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 18,
              color: PAPER,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            {SITE_NAME.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: BRAND,
              color: INK,
              padding: "9px 20px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1.5,
              marginBottom: 28,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>

          <div
            style={{
              display: "flex",
              color: PAPER,
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              color: "rgba(255,255,255,0.76)",
              fontSize: 27,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 88, height: 8, background: BRAND, borderRadius: 4 }} />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              color: "rgba(255,255,255,0.7)",
              fontSize: 24,
            }}
          >
            {displayUrl}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(fonts ? { fonts } : {}) },
  );
}
