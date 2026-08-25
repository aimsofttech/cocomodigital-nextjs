import { ImageResponse } from "next/og";

/**
 * Designed OG card for the podcast money page.
 *
 * Generated with next/og at build time rather than shipped as another
 * raster in public/ — the folder is already carrying far more image
 * weight than it should, and this keeps the card in sync with the copy
 * automatically. No webfont is fetched: remote font loading would make
 * the build depend on the network, and the system stack renders fine at
 * this size.
 */
export const runtime = "nodejs";
export const alt =
  "Cocoma Digital — Podcast Editing & Growth Services";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#FFF000",
              fontWeight: 700,
            }}
          >
            Cocoma Digital
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 82,
              lineHeight: 1.05,
              fontWeight: 900,
              color: "#FFFFFF",
              maxWidth: 940,
            }}
          >
            Podcast Editing &amp; Growth Services
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 8,
              background: "#FFF000",
              marginBottom: 28,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 900,
            }}
          >
            One recording becomes a multi-platform growth engine — episodes,
            clips, packaging, publishing and analytics, run as one system.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
