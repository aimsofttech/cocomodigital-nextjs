import Link from "next/link";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import PodcastAuditForm from "./PodcastAuditForm";
import PodcastFaq from "./PodcastFaq";
import {
  AUDIENCES,
  FAQS,
  HERO,
  MONTH_ROWS,
  PROBLEM_STATS,
  PROCESS,
  SERVICES,
  SIGNATURE_LINE,
  STAGES,
  TRUST_STATS,
} from "./podcastGrowthData";

/**
 * /services/podcast-editing-and-growth-services
 *
 * Server component by design — only the FAQ accordion and the audit
 * form ship JavaScript. Everything above the fold is static HTML, which
 * is what keeps LCP down and gives crawlers (and AI assistants) the full
 * text without executing anything.
 */
export default function PodcastGrowthPage() {
  return (
    <div className="pod-page">
      {/* ---------------------------------------------------- hero */}
      <section className="pod-hero" aria-labelledby="pod-hero-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">{HERO.eyebrow}</p>
          <h1 id="pod-hero-title" className="pod-hero-title">
            {HERO.h1}
          </h1>
          <p className="pod-hero-sub">{HERO.sub}</p>
          <p className="pod-hero-signature">{SIGNATURE_LINE}</p>

          <div className="pod-hero-ctas">
            <a href={HERO.primaryCta.href} className="pod-cta pod-cta--primary">
              {HERO.primaryCta.label}
              <FaArrowRight aria-hidden="true" />
            </a>
            <a
              href={HERO.secondaryCta.href}
              className="pod-cta pod-cta--secondary"
            >
              {HERO.secondaryCta.label}
            </a>
          </div>

          {/* Studio-wide credentials, labelled as such. These are
              channel and video numbers from Cocoma's homepage — they
              are not podcast metrics and the caption says so. */}
          <div className="pod-trust">
            <p className="pod-trust-caption">
              Cocoma Digital, studio-wide, across seven years of channel and
              catalogue work:
            </p>
            <ul className="pod-trust-list">
              {TRUST_STATS.map((s) => (
                <li key={s.label} className="pod-trust-item">
                  <span className="pod-trust-value">{s.value}</span>
                  <span className="pod-trust-label">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- problem */}
      <section className="pod-problem" aria-labelledby="pod-problem-title">
        <div className="pod-shell">
          <h2 id="pod-problem-title" className="pod-section-title">
            The recording is the cheapest part
          </h2>
          <p className="pod-section-lead pod-problem-lead">
            Almost every show that stalls has the same shape of problem. The
            conversation is good, the guests are good, and nothing downstream of
            the record button is built to keep up. Episodes ship late or not at
            all, clips get made when someone has a spare afternoon, thumbnails
            are decided by whoever is nearest the file, and the back catalogue
            sits untouched. None of that is a talent problem — it is a capacity
            and systems problem, and it compounds quietly until the show feels
            like a cost centre.
          </p>
          <div className="pod-problem-grid">
            {PROBLEM_STATS.map((p) => (
              <article key={p.label} className="pod-problem-card">
                <p className="pod-problem-value">{p.value}</p>
                <p className="pod-problem-label">{p.label}</p>
                <p className="pod-problem-body">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------- signal-to-scale */}
      <section
        id="signal-to-scale"
        className="pod-method"
        aria-labelledby="pod-method-title"
      >
        <div className="pod-shell">
          <p className="pod-eyebrow">The method</p>
          <h2 id="pod-method-title" className="pod-section-title">
            The Signal-to-Scale method
          </h2>
          <p className="pod-section-lead">
            Four stages, run in order and then run again every month. Align sets
            the target, Engineer builds the craft, Amplify multiplies the
            output, Optimize decides what changes next.
          </p>

          <ol className="pod-stage-list">
            {STAGES.map((stage) => (
              <li key={stage.id} className="pod-stage">
                <div className="pod-stage-head">
                  <span className="pod-stage-step" aria-hidden="true">
                    {stage.step}
                  </span>
                  <h3 className="pod-stage-name">{stage.name}</h3>
                </div>
                <p className="pod-stage-promise">{stage.promise}</p>
                <p className="pod-stage-detail">{stage.detail}</p>
                <ul className="pod-stage-caps">
                  {stage.capabilities.map((c) => (
                    <li key={c}>
                      <FaCheck aria-hidden="true" className="pod-tick" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------ services */}
      <section className="pod-services" aria-labelledby="pod-services-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">What we run</p>
          <h2 id="pod-services-title" className="pod-section-title">
            Podcast production and growth services
          </h2>
          <p className="pod-section-lead">
            Every piece below is run by the same team against the same
            templates. You can take the whole system or the parts your team
            cannot hold at volume.
          </p>
          <div className="pod-service-grid">
            {SERVICES.map((s) => (
              <article key={s.title} className="pod-service-card">
                <h3 className="pod-service-title">{s.title}</h3>
                <p className="pod-service-body">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- audiences */}
      <section className="pod-audience" aria-labelledby="pod-audience-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">Who it&rsquo;s for</p>
          <h2 id="pod-audience-title" className="pod-section-title">
            Built for shows that have to earn their budget
          </h2>
          <div className="pod-audience-grid">
            {AUDIENCES.map((a) => (
              <article key={a.title} className="pod-audience-card">
                <h3 className="pod-audience-title">{a.title}</h3>
                <p className="pod-audience-body">{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- month table */}
      <section className="pod-month" aria-labelledby="pod-month-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">Output</p>
          <h2 id="pod-month-title" className="pod-section-title">
            What a month looks like
          </h2>
          <p className="pod-section-lead">
            A weekly show, running the full system. This is the deliverable
            volume — not a forecast of results.
          </p>

          {/* Wide table gets its own scroll container so the page body
              never scrolls sideways on a phone. tabindex makes the
              scrollable region reachable by keyboard. */}
          <div
            className="pod-table-scroll"
            tabIndex={0}
            role="region"
            aria-labelledby="pod-month-title"
          >
            <table className="pod-table">
              <caption className="pod-table-caption">
                Monthly deliverables for a weekly podcast
              </caption>
              <thead>
                <tr>
                  <th scope="col">Deliverable</th>
                  <th scope="col">Volume</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_ROWS.map((r) => (
                  <tr key={r.deliverable}>
                    <th scope="row">{r.deliverable}</th>
                    <td>{r.volume}</td>
                    <td>{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pod-midcta">
            <p className="pod-midcta-text">
              Want this mapped to your show, with the scope and the number
              together?
            </p>
            <a href="#podcast-audit" className="pod-cta pod-cta--primary">
              Get a free podcast audit
              <FaArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- process */}
      <section className="pod-process" aria-labelledby="pod-process-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">How engagements run</p>
          <h2 id="pod-process-title" className="pod-section-title">
            From audit to operating system
          </h2>
          <ol className="pod-process-list">
            {PROCESS.map((p) => (
              <li key={p.step} className="pod-process-step">
                <span className="pod-process-num" aria-hidden="true">
                  {p.step}
                </span>
                <div className="pod-process-body">
                  <h3 className="pod-process-name">{p.name}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------- proof */}
      <section className="pod-proof" aria-labelledby="pod-proof-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">Selected work</p>
          <h2 id="pod-proof-title" className="pod-section-title">
            Proof
          </h2>
          {/* TODO (Anil): replace with cleared podcast client work —
              named shows, real figures, written permission. Deliberately
              left as a pointer to existing published work rather than
              filled with placeholder logos or invented testimonials. */}
          <p className="pod-proof-body">
            Cocoma&rsquo;s published client work spans YouTube channel and
            catalogue operations for entertainment platforms and networks.
            Podcast-specific case studies are being prepared for publication
            and will appear here once the clients have cleared them.
          </p>
          <p className="pod-proof-body">
            What is worth saying plainly: the studio-wide figures at the top of
            this page are channel and catalogue numbers built across seven years
            of entertainment and creator work. They are not podcast metrics, and
            we will not dress them up as podcast metrics. The reason they belong
            on this page is that the operating capability behind them —
            high-volume editing, packaging tested against click-through,
            multi-platform publishing and localization across 20+ languages — is
            the same capability a serious podcast needs.
          </p>
          <p className="pod-proof-body">
            In the meantime the existing work is public and worth reading
            first-hand.
          </p>
          <div className="pod-proof-links">
            <Link href="/case-studies" className="pod-cta pod-cta--secondary">
              Read the case studies
            </Link>
            <Link
              href="/marketing-portfolio"
              className="pod-cta pod-cta--secondary"
            >
              See the portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- faq */}
      <section className="pod-faq" aria-labelledby="pod-faq-title">
        <div className="pod-shell pod-shell--narrow">
          <p className="pod-eyebrow">Questions</p>
          <h2 id="pod-faq-title" className="pod-section-title">
            Frequently asked questions
          </h2>
          <PodcastFaq items={FAQS} />
        </div>
      </section>

      {/* ------------------------------------------------ final cta */}
      <section
        id="podcast-audit"
        className="pod-final"
        aria-labelledby="pod-final-title"
      >
        <div className="pod-shell pod-shell--narrow">
          <h2 id="pod-final-title" className="pod-section-title pod-final-title">
            Get a free podcast audit
          </h2>
          <p className="pod-final-lead">
            Send the show link. We&rsquo;ll review packaging, retention,
            publishing cadence and back catalogue, then come back with what we
            would change first.
          </p>
          <PodcastAuditForm />
        </div>
      </section>
    </div>
  );
}
