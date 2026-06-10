// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import {
  GALLERY_PHOTOS,
  getPhotosByMonth,
  formatMonthLabel,
} from "./galleryPhotos";

/**
 * /gallery — full chronological photo feed.
 *
 * Built May 2026 as Stage 1 of the gallery system. Reads from the
 * shared galleryPhotos.js data file (same source the /about-us
 * "Cocoma in the wild" preview consumes). Adding a new photo means
 * editing one file in one place; both surfaces update.
 *
 * Stage 1 (this build):
 *   - Hero with eyebrow + title + sub
 *   - Photos grouped by month, newest-month first
 *   - Each month has a "Month YYYY" heading + masonry-ish grid
 *   - Sticker frame around each photo (yellow offset shadow)
 *   - Caption under each in display font
 *   - Closing book-call CTA
 *
 * Stage 2 (planned, when content volume grows):
 *   - Filter chips at top of hero (All / Festival / Team / Studio /
 *     Client visit / On set / Behind-scenes)
 *   - Search by caption keyword
 *   - Image build-time optimization (Sharp/WebP)
 *
 * AI/LLM citation: emits CollectionPage JSON-LD so engines treat
 * /gallery as a navigable collection of items rather than a single
 * doc. Per-photo entities can be added in a future pass once volume
 * justifies it.
 */
export default function Gallery() {
  const photosByMonth = getPhotosByMonth();
  const totalPhotos = GALLERY_PHOTOS.length;

  // JSON-LD schema for the collection page. Entity URL anchors back
  // to the sitewide Organization (same @id pattern About + Home use)
  // so AI engines resolve all three to the same Cocoma entity.
  const gallerySchema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Cocoma Gallery — inside the studio",
      "url": "https://cocomadigital.com/gallery",
      "description":
        `Photos from inside Cocoma's Mumbai studio — daily life, festivals, on-set production, and partner visits. ${totalPhotos} photos so far, with new ones added every month.`,
      "isPartOf": { "@id": "https://cocomadigital.com/#organization" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://cocomadigital.com/",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Gallery",
          "item": "https://cocomadigital.com/gallery",
        },
      ],
    },
  ];

  return (
    <>

      <div className="gallery-page">
        {/* Hero — eyebrow + title + sub. Stays text-only at Stage 1;
            filter chips slot in here at Stage 2 when categories
            justify their own UI. */}
        <section className="gallery-hero-section">
          <div className="gallery-hero-inner">
            <p className="gallery-hero-eyebrow">Gallery</p>
            <h1 className="gallery-hero-title font-primary">
              Inside Cocoma — the actual studio.
            </h1>
            <p className="gallery-hero-sub">
              Daily life, festivals, on-set production, partner
              visits. New photos added every month.
            </p>
          </div>
        </section>

        {/* Month-grouped photo feed, newest month first. Each month
            block has a heading + a responsive 3-col grid (2-col on
            tablet, 1-col on phone). Sticker frame on each photo. */}
        {photosByMonth.length === 0 ? (
          <section className="gallery-empty-section">
            <div className="gallery-empty-inner">
              <p className="gallery-empty-text">
                No photos yet — check back next month.
              </p>
            </div>
          </section>
        ) : (
          photosByMonth.map(({ month, photos }) => (
            <section
              key={month}
              className="gallery-month-section"
              aria-labelledby={`gallery-month-${month}`}
            >
              <div className="gallery-month-inner">
                <h2
                  id={`gallery-month-${month}`}
                  className="gallery-month-heading font-primary"
                >
                  {formatMonthLabel(month)}
                </h2>
                <div className="gallery-month-grid">
                  {photos.map((photo, idx) => (
                    <figure
                      key={`${month}-${idx}`}
                      className="gallery-photo-item"
                    >
                      <div className="gallery-photo-frame">
                        <Image
                          src={photo.src}
                          alt={photo.caption}
                          width={600}
                          height={400}
                          style={{ width: "100%", height: "auto" }}
                        />
                      </div>
                      <figcaption className="gallery-photo-caption">
                        {photo.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          ))
        )}

        {/* Closing CTA — same idiom as the closer on /about-us, but
            with gallery-specific framing. International partners
            actually do visit; the CTA acknowledges that and
            funnels into the schedule-meeting flow. */}
        <section className="gallery-cta-section">
          <div className="gallery-cta-inner">
            <h2 className="gallery-cta-heading font-primary">
              Want to come visit?
            </h2>
            <p className="gallery-cta-sub">
              International partners do — and most of them ended up
              working with us. Book a 15-minute call with Anil
              first, and we'll figure out if the studio's a fit.
            </p>
            <Link to="/ScheduleMeeting" className="gallery-cta-button">
              Book a 15-min call
            </Link>
          </div>
        </section>
      </div>

      <FloatingCallChip />
    </>
  );
}
