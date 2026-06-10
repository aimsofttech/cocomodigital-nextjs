// @ts-nocheck
"use client";
import React from "react";
import Image from "next/image";
/**
 * <TrustedByStrip />
 *
 * Static "Trusted by" brand grid for the single-video page.
 * Renders the brands list as a static multi-column grid (not
 * a marquee), so every logo is visible at once on first paint
 * — built for instant trust, not motion.
 *
 * Phase 5b: pure client — takes `brands` prop. Redux fallback dropped.
 */
export default function TrustedByStrip({ brands = [] } = {}) {

  if (!brands?.length) return null;

  // Cap at 12 logos to keep the grid tidy. Admin can still
  // reorder via the brands list — earliest entries win.
  const visible = brands.slice(0, 12);

  return (
    <section className="trusted-by-strip" aria-labelledby="trusted-by-heading">
      <div className="trusted-by-inner">
        <p className="trusted-by-eyebrow" id="trusted-by-heading">
          Trusted by
        </p>
        <div className="trusted-by-grid">
          {visible.map((brand, index) => (
            <div
              className="trusted-by-logo-slot"
              key={brand?.id || index}
            >
              {brand?.brand_image && (
                <Image
                  className="trusted-by-logo"
                  src={brand.brand_image}
                  alt={brand?.brand_name || "Brand"}
                  width={120}
                  height={60}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
