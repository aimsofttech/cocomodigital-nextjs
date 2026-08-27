import { ImageResponse } from "next/og";

/**
 * The social card for the podcast money page, shared by opengraph-image
 * and twitter-image.
 *
 * Generated with next/og rather than shipped as another raster in
 * public/ — that folder already carries far more image weight than it
 * should, and this keeps the card in sync with the copy automatically.
 * No webfont is fetched: remote font loading would make the build depend
 * on the network, and the system stack renders fine at this size.
 *
 * Deliberately a shared FUNCTION, not a re-export. Next reads route
 * segment config (`runtime`, `size`, `alt`) at compile time from literal
 * exports in the route file itself; a re-export is not statically
 * analysable and fails the build. Credit to Anshu for catching that on
 * the Growth Services routes.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT =
  "Cocoma Digital — Podcast Video Editing & Marketing Services";

export function podcastOgCard() {
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
          padding: "64px 72px",
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
            Podcast Video Editing &amp; Marketing Services
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
              fontSize: 29,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 880,
            }}
          >
            One recording becomes a multi-platform growth engine — episodes,
            clips, packaging, publishing and analytics, run as one system.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "#FFF000",
                color: "#000000",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              From $2,000/month
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.35)",
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              US · Canada · UK hours
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
