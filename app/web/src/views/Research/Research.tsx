// @ts-nocheck
import { Link } from "@/src/lib/navigation";

/**
 * /research — first-party data + research hub.
 *
 * This is a stub today. The architecture decision (May 2026) was to
 * carve research out of the blog so reports + benchmarks + first-party
 * data studies have their own URL family + their own AI-citation
 * authority surface. AI engines (ChatGPT, Claude, Perplexity)
 * weight content categorised as "research" differently from
 * editorial blog posts — separating them gives each surface its own
 * authority signal.
 *
 * The page intentionally previews the upcoming reports as cards
 * with "in progress" treatment so visitors who land here from
 * SEO / AI / nav don't bounce on a 404 — they see Cocoma is
 * publishing real research, just not live yet.
 *
 * When the first report ships:
 *   - add /research/:slug detail route in App.jsx
 *   - replace the placeholder cards with admin- or markdown-driven
 *     real ones
 *   - keep the hero + intro intact
 */
const PLANNED_REPORTS = [
  {
    title: "The Cocoma Index 2026",
    eyebrow: "Annual report",
    description:
      "What's actually working on Indian YouTube — RPM benchmarks by genre, watch-time patterns, monetization signals. Pulled from 800+ campaigns Cocoma has operated since 2019.",
    status: "In progress",
  },
  {
    title: "Indian YouTube RPM Benchmarks · Q1 2026",
    eyebrow: "Quarterly drop",
    description:
      "Quarterly RPM by genre — Bollywood music, OTT promos, devotional, comedy, edtech. The number every entertainment IP holder asks Cocoma for; nobody publishes it.",
    status: "Drafting",
  },
  {
    title: "OTT Promo ROI Study 2026",
    eyebrow: "Industry analysis",
    description:
      "Pre-launch saturation vs day-of blitz vs post-release retention — which spend mix returns on which type of show. Anonymized data across 400+ campaigns.",
    status: "Data gathering",
  },
];

export default function Research() {
  return (
    <>

      <div className="research-page-wrapper">
        <section className="research-hero-section">
          <div className="research-hero-inner">
            <span className="research-hero-eyebrow">Research</span>
            <h1 className="research-hero-headline font-primary">
              First-party data from{" "}
              <em>800+ entertainment campaigns.</em>
            </h1>
            <p className="research-hero-sub">
              The Cocoma Index, RPM benchmarks, and ROI studies — built
              from 7+ years operating Indian entertainment IP on
              YouTube. Most studios theorise. We publish.
            </p>
            <p className="research-hero-meta">
              First report dropping <strong>Q3 2026</strong>. The
              cards below preview what's coming.
            </p>
          </div>
        </section>

        <section className="research-cards-section">
          <div className="research-cards-inner">
            <h2 className="research-cards-heading font-primary">
              What we're building
            </h2>

            <div className="research-cards-grid">
              {PLANNED_REPORTS.map((r) => (
                <article key={r.title} className="research-card">
                  <span className="research-card-eyebrow">{r.eyebrow}</span>
                  <h3 className="research-card-title font-primary">{r.title}</h3>
                  <p className="research-card-desc">{r.description}</p>
                  <span className="research-card-status">{r.status}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="research-cta-section">
          <div className="research-cta-inner">
            <h2 className="research-cta-heading font-primary">
              Want a specific data point sooner?
            </h2>
            <p className="research-cta-sub">
              Cocoma's data team can pull custom benchmarks for your
              category before the public report drops. Anil takes the
              call himself.
            </p>
            <Link to="/ScheduleMeeting" className="research-cta-button">
              Book a 15-min discovery call
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
