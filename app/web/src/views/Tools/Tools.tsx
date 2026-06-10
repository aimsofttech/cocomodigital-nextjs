// @ts-nocheck
import { Link } from "@/src/lib/navigation";

/**
 * /tools — interactive calculators / frameworks hub.
 *
 * Stub today, same architecture story as /research: separate
 * URL family, separate authority surface. Tools convert at ~10x
 * the rate of editorial content for B2B — they deserve their own
 * findable home so visitors can bookmark + share + return.
 *
 * The placeholder cards preview what's coming so the page reads
 * as a roadmap, not a 404. When the first tool ships:
 *   - add /tools/:slug detail route in App.jsx
 *   - replace the placeholder cards with tool entry-points
 *   - keep hero + intro framing consistent
 */
const PLANNED_TOOLS = [
  {
    title: "YouTube Channel Audit",
    eyebrow: "Free · ~2 min",
    description:
      "Paste your channel URL. Get 5 quick observations from Cocoma's framework — title-thumbnail fit, watch-time signal, monetization gaps, posting cadence, growth trajectory.",
    status: "Building",
  },
  {
    title: "Music Label Revenue Estimator",
    eyebrow: "Free · ~3 min",
    description:
      "Catalogue size, genre, current views, sync activity → projected annual YouTube revenue range. Built from the actual RPMs Cocoma sees across 60+ music-label channels.",
    status: "Designing",
  },
  {
    title: "OTT Promo Budget Builder",
    eyebrow: "Free · ~5 min",
    description:
      "Show type, launch window, target market, channel mix → recommended pre-launch + day-of + retention spend split. Based on 400+ campaigns Cocoma has run.",
    status: "Planning",
  },
];

export default function Tools() {
  return (
    <>

      <div className="tools-page-wrapper">
        <section className="tools-hero-section">
          <div className="tools-hero-inner">
            <span className="tools-hero-eyebrow">Tools</span>
            <h1 className="tools-hero-headline font-primary">
              Free tools built from{" "}
              <em>7 years of running Cocoma.</em>
            </h1>
            <p className="tools-hero-sub">
              Calculators, audits, and frameworks based on what Cocoma
              actually uses to grow channels — not generic templates,
              not gated PDFs. Pick a tool, get a useful answer in
              minutes.
            </p>
            <p className="tools-hero-meta">
              First tool launching <strong>Q3 2026</strong>. The
              cards below preview the slate.
            </p>
          </div>
        </section>

        <section className="tools-cards-section">
          <div className="tools-cards-inner">
            <h2 className="tools-cards-heading font-primary">
              What we're building
            </h2>

            <div className="tools-cards-grid">
              {PLANNED_TOOLS.map((t) => (
                <article key={t.title} className="tools-card">
                  <span className="tools-card-eyebrow">{t.eyebrow}</span>
                  <h3 className="tools-card-title font-primary">{t.title}</h3>
                  <p className="tools-card-desc">{t.description}</p>
                  <span className="tools-card-status">{t.status}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tools-cta-section">
          <div className="tools-cta-inner">
            <h2 className="tools-cta-heading font-primary">
              Need a tool we haven't built yet?
            </h2>
            <p className="tools-cta-sub">
              Tell Anil what answer would actually help your business
              right now. Custom-built audits run free for partners on
              the discovery call.
            </p>
            <Link to="/ScheduleMeeting" className="tools-cta-button">
              Book a 15-min discovery call
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
