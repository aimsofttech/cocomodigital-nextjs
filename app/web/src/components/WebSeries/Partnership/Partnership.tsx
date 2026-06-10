// @ts-nocheck
import React from "react";
import { FaHandshake } from "react-icons/fa";

/**
 * Partnership / collaboration callout shown below Client Goals on a
 * case study page. Reads as: "this campaign was a partnership between
 * <Brand> and Cocoma Digital."
 *
 * Visual: two logos side by side with a yellow handshake chip between
 * them, framed in a sticker card (black border + yellow hard drop-shadow)
 * so it matches the rest of the comic-strip language on the page.
 *
 * The brand logo URL is looked up by client name from a small frontend
 * map below — these URLs are the same brand pngs the homepage clients
 * row already uses, so no new assets are needed. If we don't have a
 * logo for the client we render the client name as a typeset chip
 * (e.g. an indie production house we haven't catalogued yet) so the
 * component never falls back to nothing.
 *
 * Long term, Anshu can add a `client_logo_url` field on the marketing
 * house item and we'd read it directly from itemData — but the map
 * works for the launches we ship today.
 */

const BRAND_LOGO_MAP = {
  // Streaming / platforms
  "Amazon MX Player":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773924313_Amazon-mx-player.png",
  "Amazon Prime Video":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922897_resized.png",
  "Amazon Mini TV":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923034_mini-tv.png",
  "Amazon Mini Tv":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923034_mini-tv.png",
  IMDb: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922872_imdb.png",
  // Music / labels
  "T-Series":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923629_t-series.png",
  "Ivy Music":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773925154_Ivy-Music.png",
  "Sony Music":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923629_t-series.png", // fallback shape — replace when Sony asset ships
  // Other partners surfaced on the homepage logo wall
  "TATA EV":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922859_tata%20EV.png",
  B4U: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773922799_revised.png",
  "Progetto Happiness":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923943_Progetto-Happiness.png",
  "The Trailer Park Group":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923833_Trailer-prak-Group.png",
  vshowcards:
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773923264_Vshow-Cards.png",
  "MadFad Media":
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773925687_Madfad-Media.png",
  Langistan:
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1774096883_Langistan-resized.png",
  Unpolished:
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/brand-image/1773926082_Unpolished.png",
};

/** Loose match: case-insensitive equality first, then substring. */
function lookupBrandLogo(clientName) {
  if (!clientName || typeof clientName !== "string") return null;
  const target = clientName.trim().toLowerCase();
  // exact (case-insensitive)
  for (const k of Object.keys(BRAND_LOGO_MAP)) {
    if (k.toLowerCase() === target) return BRAND_LOGO_MAP[k];
  }
  // substring either direction (handles "Amazon Mini Tv" vs "Amazon Mini TV" etc.)
  for (const k of Object.keys(BRAND_LOGO_MAP)) {
    const kl = k.toLowerCase();
    if (kl.includes(target) || target.includes(kl)) return BRAND_LOGO_MAP[k];
  }
  return null;
}

const Partnership = ({ clientName }) => {
  if (!clientName) return null;

  const brandLogo = lookupBrandLogo(clientName);

  return (
    <section className="partnership-wrapper" aria-label="Campaign partnership">
      <div className="partnership-inner">
        <p className="partnership-eyebrow">A campaign collaboration between</p>

        <div className="partnership-row">
          {/* Client side */}
          <div className="partnership-tile partnership-tile--brand">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={clientName}
                className="partnership-logo"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="partnership-text-logo">{clientName}</span>
            )}
          </div>

          {/* Handshake chip in the middle — yellow disc, black border,
              comic-strip drop-shadow. */}
          <div className="partnership-handshake" aria-hidden="true">
            <FaHandshake />
          </div>

          {/* Cocoma side */}
          <div className="partnership-tile partnership-tile--cocoma">
            <img
              src="/Images/logo/main-logo.png"
              alt="Cocoma Digital"
              className="partnership-logo partnership-logo--cocoma"
              loading="lazy"
              decoding="async"
            />
            <span className="partnership-cocoma-name">
              cocoma <strong>digital</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partnership;
