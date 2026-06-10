// @ts-nocheck
/**
 * <ServiceTrustStrip />
 *
 * Lightweight 3-tile credibility row that sits IMMEDIATELY below
 * the hero on /service/:slug (and any other conversion-
 * oriented page that wants quick numerical credibility before the
 * fold).
 *
 * Why this exists separately from the deeper <CredentialsStrip/>
 * + <TrustedByStrip/> sections:
 *   - Those live BELOW the fold. By the time a reader reaches them
 *     they've already decided whether to stay or leave.
 *   - This strip surfaces three hard credibility signals high on
 *     the page so the "why these guys?" question is answered while
 *     the reader is still scanning.
 *
 * Tile picks intentionally DON'T duplicate <CredentialsStrip/>
 * lower on the page (which already shows years-in-business,
 * in-house team count, videos shipped, monthly volume). These
 * three pick up complementary trust angles that strip doesn't:
 *
 *   1. 70% recurring → "clients stick around" (stickiness)
 *   2. 100% in-house → "no subcontractors" (quality control)
 *   3. Anil takes the call → "founder-accessible" (real people)
 *
 * The qualitative third tile uses the founder's first name as
 * the "value" — feels human, not corporate, and matches the
 * founder-letter framing on /about-us.
 */
const TRUST_TILES = [
  {
    value: "70%",
    label: "of revenue is recurring",
  },
  {
    value: "100%",
    label: "in-house, no subcontractors",
  },
  {
    value: "Anil",
    label: "takes every discovery call",
  },
];

export default function ServiceTrustStrip() {
  return (
    <section
      className="service-trust-strip"
      aria-label="Why work with Cocoma"
    >
      <div className="service-trust-strip-inner">
        {TRUST_TILES.map((tile, idx) => (
          <div className="service-trust-tile" key={idx}>
            <span className="service-trust-tile-value font-primary">
              {tile.value}
            </span>
            <span className="service-trust-tile-label">{tile.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
