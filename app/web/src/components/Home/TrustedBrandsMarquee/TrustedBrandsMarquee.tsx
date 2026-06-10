"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Marquee from "react-fast-marquee";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

/**
 * Trusted-brand marquee. Takes `brands` as a prop when the parent
 * already fetched them (homepage server-fetches via homeServerFetch
 * and passes down — keeps that path zero-flicker).
 *
 * Phase 5+ 2026-05-23: self-fetch fallback when no brands prop is
 * supplied. /services/[slug], /solutions, /content-created,
 * /work/* etc. all dropped <TrustedBrandsMarquee /> with no prop,
 * so the marquee was rendering as a skeleton on every page that
 * isn't the homepage. Module-level cache avoids refetching across
 * route changes inside the same SPA session.
 *
 * Phase 5b: Redux fallback dropped. commonApiSlice is gone.
 */
interface Brand {
  id?: number | string;
  brand_image?: string;
  brand_name?: string;
}

interface TrustedBrandsMarqueeProps {
  brands?: Brand[];
}

/* Session-scoped cache. We resolve to the same promise so concurrent
   mounts in different sub-trees only hit the API once. */
let brandsPromise: Promise<Brand[]> | null = null;
const loadBrands = (): Promise<Brand[]> => {
  if (brandsPromise) return brandsPromise;
  brandsPromise = (async () => {
    try {
      const url = new URL("/content-api/brands", window.location.origin);
      url.searchParams.set("limit", "50");
      url.searchParams.set("sort", "order");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const body = await res.json();
      const docs: any[] = body?.docs || [];
      return docs.map((b) => ({
        id: b.id,
        brand_image:
          (typeof b.image === "object" && b.image?.url) ||
          b.legacyImageUrl ||
          (typeof b.image === "string" ? b.image : "") ||
          "",
        brand_name: b.title || b.brand_name || b.name || "",
      }));
    } catch {
      brandsPromise = null; // allow retry on next mount after error
      return [];
    }
  })();
  return brandsPromise;
};

export default function TrustedBrandsMarquee({
  brands: brandsProp,
}: TrustedBrandsMarqueeProps = {}) {
  const [brands, setBrands] = useState<Brand[]>(brandsProp || []);

  useEffect(() => {
    if (brandsProp && brandsProp.length) return;
    let cancelled = false;
    loadBrands().then((list) => {
      if (!cancelled) setBrands(list);
    });
    return () => {
      cancelled = true;
    };
  }, [brandsProp]);

  if (!brands?.length) {
    return (
      <div
        className="home-section-skeleton home-section-skeleton--brands"
        aria-hidden="true"
      />
    );
  }

  return (
    <section className="trusted-brand-wrapper">
      <div className="trusted-brand">
        <h2 className="trusted-brand-heading font-primary">
          Trusted by the brands building audiences at scale.
          <EditLink path={`${ADMIN_URL}/template/brands`} />
        </h2>

        <Marquee
          className="trusted-brand-row"
          direction="left"
          speed={35}
          gradient
          gradientColor="#000000"
          gradientWidth={80}
          pauseOnHover
          autoFill
        >
          {brands.map(({ brand_image, brand_name, id }, index) => brand_image ? (
            <div className="brand-logo-slot" key={`${id || index}-${index}`}>
              <Image
                className="brand-logo-mark"
                src={brand_image}
                alt={brand_name || "Brand Logo"}
                width={160}
                height={80}
              />
            </div>
          ) : null)}
        </Marquee>
      </div>
    </section>
  );
}
