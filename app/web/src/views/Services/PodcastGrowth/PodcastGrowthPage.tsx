import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import PodcastAuditForm from "./PodcastAuditForm";
import PodcastFaq from "./PodcastFaq";
import PodcastHeroMedia from "./PodcastHeroMedia";
import { Icon, StageDiagram } from "./PodcastVisuals";
import {
  AUDIENCES,
  DISTRIBUTION,
  FAQS,
  FOUNDER,
  HERO,
  MONTH_ROWS,
  NOT_FOR,
  PRICING,
  PROBLEM_STATS,
  PROCESS,
  SERVICES,
  SIGNATURE_LINE,
  STAGES,
  STUDIO_SCALE,
  STUDIO_SCALE_NOTE,
  STUDIO_SHOTS,
  STUDIO_STRIP,
  TRUST_STATS,
  US_OPERATIONS,
} from "./podcastGrowthData";

/**
 * /services/podcast-editing-and-growth-services
 *
 * Server component by design — only the FAQ accordion and the audit
 * form ship JavaScript. Everything above the fold is static HTML with
 * inline SVG, which is what keeps LCP down and gives crawlers (and AI
 * assistants) the full text without executing anything.
 */
export default function PodcastGrowthPage() {
  return (
    <div className="pod-page">
      {/* ---------------------------------------------------- hero */}
      <section className="pod-hero" aria-labelledby="pod-hero-title">
        <div className="pod-shell pod-hero-inner">
          <div className="pod-hero-copy">
            <p className="pod-eyebrow">{HERO.eyebrow}</p>
            <h1 id="pod-hero-title" className="pod-hero-title">
              {HERO.h1}
            </h1>
            <p className="pod-hero-sub">{HERO.sub}</p>

            {/* Exactly one action. "See how it works" was a second
                decision to make in the fold, and the thing it pointed at
                is simply the next screen down — scrolling already does
                it. The site header contributes its own "Get started"
                button to this viewport, so one here is really two. */}
            <div className="pod-hero-ctas">
              <a href={HERO.primaryCta.href} className="pod-cta pod-cta--primary">
                {HERO.primaryCta.label}
                <FaArrowRight aria-hidden="true" />
              </a>
            </div>

            {/* Metadata, not controls: no border, no pill, so nothing
                here reads as a third and fourth button. */}
            <ul className="pod-meta">
              <li className="pod-meta-item">
                <Icon name="dollar" className="pod-meta-icon" />
                {HERO.priceBadge}
              </li>
              <li className="pod-meta-item">
                <Icon name="clock" className="pod-meta-icon" />
                {HERO.hoursBadge}
              </li>
            </ul>
          </div>

          <div className="pod-hero-visual">
            <PodcastHeroMedia />
          </div>
        </div>

      </section>

      {/* --------------------------------------------- credentials */}
      {/* Both of these were inside the hero. Eight competing blocks in
          the first screen meant nothing led it. The hero now carries the
          headline, the promise, the photograph and one button; the
          positioning line and the numbers arrive a beat later, where
          they get read instead of scanned past. */}
      <section className="pod-credentials" aria-label="Studio credentials">
        <div className="pod-shell">
          <p className="pod-hero-signature pod-credentials-line">
            {SIGNATURE_LINE}
          </p>
          <div className="pod-trust">
            <p className="pod-trust-caption">
              Cocoma Digital, studio-wide, across seven years of channel and
              catalog work:
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
        {/* Backdrop, not an illustration. Deliberately decorative:
            aria-hidden, and scrimmed hard on the left so it never
            competes with the text sitting on it.
            A close-up of an editor mid-cut argues "post-production is
            the expensive half" faster than a wide room does, and the
            wall behind him is already the brand yellow — which is why
            this one is only partly desaturated.
            This IS shot A-03 from the shot list — the wide, heads-down
            floor — now that it exists. Four editors in a row, screens
            lit, nobody looking at the camera. */}
        <div className="pod-problem-bg" aria-hidden="true">
          <Image
            src="/Images/about/2026-08/edit-floor-row.jpg"
            alt=""
            fill
            sizes="100vw"
            className="pod-problem-bg-img"
          />
        </div>
        <div className="pod-shell">
          <h2 id="pod-problem-title" className="pod-section-title">
            The recording is the cheapest part
          </h2>
          <p className="pod-section-lead pod-problem-lead">
            Almost every show that stalls has the same shape of problem. The
            conversation is good, the guests are good, and nothing downstream of
            the record button is built to keep up. Episodes ship late or not at
            all, clips get made when someone has a spare afternoon, thumbnails
            are decided by whoever is nearest the file, and the back catalog
            sits untouched. None of that is a talent problem — it is a capacity
            and systems problem, and it compounds quietly until the show feels
            like a cost center.
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

          <div className="pod-stage-wrap">
            <ol className="pod-stage-list">
              {STAGES.map((stage) => (
                <li key={stage.id} className="pod-stage">
                  {/* Placeholder illustration until shots M-01 to M-04
                      exist. Draws the stage's argument rather than
                      filling space, and imitates nothing — no fake
                      screenshot, no implied number. */}
                  <div className="pod-stage-figure">
                    <span className="pod-stage-ordinal" aria-hidden="true">
                      {stage.step}
                    </span>
                    <StageDiagram id={stage.id} />
                  </div>

                  <div className="pod-stage-body">
                    <div className="pod-stage-head">
                      <h3 className="pod-stage-name">{stage.name}</h3>
                      <span className="pod-stage-rule" aria-hidden="true" />
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
                  </div>
                </li>
              ))}
            </ol>
          </div>
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
                <span className="pod-service-icon">
                  <Icon name={s.icon} />
                </span>
                <h3 className="pod-service-title">{s.title}</h3>
                <p className="pod-service-body">{s.body}</p>
                <ul className="pod-service-tags">
                  {s.includes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------- distribution */}
      <section className="pod-dist" aria-labelledby="pod-dist-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">{DISTRIBUTION.eyebrow}</p>
          <h2 id="pod-dist-title" className="pod-section-title">
            {DISTRIBUTION.heading}
          </h2>
          <p className="pod-section-lead">{DISTRIBUTION.lead}</p>
          <div className="pod-dist-grid">
            {DISTRIBUTION.pillars.map((d) => (
              <article key={d.title} className="pod-dist-card">
                <p className="pod-dist-stat">
                  <span className="pod-dist-stat-value">{d.stat}</span>
                  <span className="pod-dist-stat-label">{d.statLabel}</span>
                </p>
                <h3 className="pod-dist-title">
                  <Icon name={d.icon} className="pod-dist-icon" />
                  {d.title}
                </h3>
                <p className="pod-dist-body">{d.body}</p>
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
                <span className="pod-audience-icon">
                  <Icon name={a.icon} />
                </span>
                <h3 className="pod-audience-title">{a.title}</h3>
                <p className="pod-audience-body">{a.body}</p>
                <p className="pod-audience-signal">{a.signal}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- pricing */}
      <section id="pricing" className="pod-pricing" aria-labelledby="pod-pricing-title">
        <div className="pod-shell">
          <div className="pod-pricing-card">
            <div className="pod-pricing-head">
              <p className="pod-eyebrow">{PRICING.eyebrow}</p>
              <h2 id="pod-pricing-title" className="pod-section-title">
                {PRICING.heading}
              </h2>
              <p className="pod-pricing-figure">
                <span className="pod-pricing-prefix">{PRICING.prefix}</span>
                <span className="pod-pricing-amount">{PRICING.floor}</span>
                <span className="pod-pricing-unit">{PRICING.unit}</span>
              </p>
              <p className="pod-pricing-lead">{PRICING.lead}</p>
            </div>

            <div className="pod-pricing-cols">
              <div className="pod-pricing-col">
                <h3 className="pod-pricing-col-title">{PRICING.includedTitle}</h3>
                <ul className="pod-pricing-list">
                  {PRICING.included.map((i) => (
                    <li key={i}>
                      <FaCheck aria-hidden="true" className="pod-tick" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pod-pricing-col">
                <h3 className="pod-pricing-col-title">{PRICING.scalesTitle}</h3>
                <ul className="pod-pricing-list pod-pricing-list--plain">
                  {PRICING.scales.map((i) => (
                    <li key={i}>
                      <span className="pod-dash" aria-hidden="true" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pod-pricing-foot">
              <p className="pod-pricing-note">{PRICING.note}</p>
              <a href={PRICING.cta.href} className="pod-cta pod-cta--primary">
                {PRICING.cta.label}
                <FaArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- month table */}
      <section className="pod-month" aria-labelledby="pod-month-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">Output</p>
          <h2 id="pod-month-title" className="pod-section-title">
            What a full month looks like
          </h2>
          <p className="pod-section-lead">
            A weekly show running the complete system. This is deliverable
            volume at a full engagement — not a forecast of results, and not the
            entry tier. Your audit comes back with the scope that fits your
            cadence.
          </p>

          {/* Wide table lives in its own scroll container so the page
              body never scrolls sideways on a phone. tabindex makes the
              scrollable region reachable by keyboard. */}
          {/* The caption lives OUTSIDE the scroll container. A <caption>
              belongs to the table, so it inherited the table's 640px
              min-width and was clipped on any viewport narrower than
              that — you had to scroll sideways to read a label. It is a
              paragraph now, tied back to the table with
              aria-describedby so the association survives. */}
          <p id="pod-month-caption" className="pod-table-note">
            Monthly deliverables for a weekly podcast at a full engagement
          </p>

          <div
            className="pod-table-scroll"
            tabIndex={0}
            role="region"
            aria-labelledby="pod-month-title"
          >
            <table className="pod-table" aria-describedby="pod-month-caption">
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
                    <td>
                      <span className="pod-vol">{r.volume}</span>
                    </td>
                    <td>{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --------------------------------------- who this is not for */}
      <section className="pod-notfor" aria-labelledby="pod-notfor-title">
        <div className="pod-shell pod-shell--narrow">
          <p className="pod-eyebrow">{NOT_FOR.eyebrow}</p>
          <h2 id="pod-notfor-title" className="pod-section-title">
            {NOT_FOR.heading}
          </h2>
          <p className="pod-section-lead">{NOT_FOR.lead}</p>
          <ul className="pod-notfor-list">
            {NOT_FOR.items.map((i) => (
              <li key={i.slice(0, 24)}>
                <span className="pod-cross" aria-hidden="true">&times;</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
          <p className="pod-notfor-foot">{NOT_FOR.footnote}</p>
        </div>
      </section>

      {/* -------------------------------------------- founder note */}
      <section className="pod-founder" aria-labelledby="pod-founder-title">
        <div className="pod-shell pod-founder-inner">
          <div className="pod-founder-portrait">
            <Image
              src={FOUNDER.portrait}
              alt={FOUNDER.alt}
              width={592}
              height={682}
              loading="lazy"
              sizes="(max-width: 900px) 60vw, 320px"
              className="pod-founder-img"
            />
          </div>
          <div className="pod-founder-copy">
            <p className="pod-eyebrow">{FOUNDER.eyebrow}</p>
            <h2 id="pod-founder-title" className="pod-section-title">
              {FOUNDER.name}
            </h2>
            <p className="pod-founder-role">{FOUNDER.role}</p>
            {FOUNDER.lines.map((line) => (
              <p key={line.slice(0, 24)} className="pod-founder-line">
                {line}
              </p>
            ))}
            <a href={FOUNDER.cta.href} className="pod-cta pod-cta--primary">
              {FOUNDER.cta.label}
              <FaArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------- working with a US show */}
      <section className="pod-us" aria-labelledby="pod-us-title">
        <div className="pod-shell">
          <p className="pod-eyebrow">Working across time zones</p>
          <h2 id="pod-us-title" className="pod-section-title">
            The practical questions, answered up front
          </h2>
          <div className="pod-us-grid">
            {US_OPERATIONS.map((o) => (
              <article key={o.title} className="pod-us-card">
                <span className="pod-us-icon">
                  <Icon name={o.icon} />
                </span>
                <div>
                  <h3 className="pod-us-title">{o.title}</h3>
                  <p className="pod-us-body">{o.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------- studio strip */}
      <section className="pod-studio" aria-labelledby="pod-studio-title">
        <div className="pod-shell">
          <div className="pod-studio-copy">
            <p className="pod-eyebrow">{STUDIO_STRIP.eyebrow}</p>
            <h2 id="pod-studio-title" className="pod-section-title">
              {STUDIO_STRIP.heading}
            </h2>
            <p className="pod-section-lead">{STUDIO_STRIP.body}</p>
          </div>

          {/* Capability frames, captioned. Each caption names only what
              is actually visible in the photograph — no frame is
              labelled with work it does not show. */}
          <ul className="pod-studio-grid">
            {STUDIO_SHOTS.map((shot) => (
              <li
                key={shot.src}
                className={`pod-studio-item${shot.wide ? " pod-studio-item--wide" : ""}`}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={1200}
                  height={675}
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  className="pod-studio-img"
                />
                <span className="pod-studio-caption">{shot.caption}</span>
              </li>
            ))}
          </ul>

          <ul className="pod-scale">
            {STUDIO_SCALE.map((m) => (
              <li key={m.label} className="pod-scale-item">
                <span className="pod-scale-value">{m.value}</span>
                <span className="pod-scale-label">{m.label}</span>
                <span className="pod-scale-sub">{m.sub}</span>
              </li>
            ))}
          </ul>
          <p className="pod-scale-note">{STUDIO_SCALE_NOTE}</p>
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
                  <div className="pod-process-headline">
                    <h3 className="pod-process-name">{p.name}</h3>
                    <span className="pod-process-duration">{p.duration}</span>
                  </div>
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
          <p className="pod-eyebrow">What we can show you</p>
          <h2 id="pod-proof-title" className="pod-section-title">
            The capability — and what it is not
          </h2>
          {/* TODO (Anil): when a podcast client clears a case study, this
              section becomes a real proof block. Until then it must not
              imply a podcast roster exists. */}
          <p className="pod-proof-body">
            We do not publish podcast case studies yet. Saying otherwise
            would be the easiest sentence on this page to write and the
            fastest one to get caught on.
          </p>
          <p className="pod-proof-body">
            What we can show you is the work the studio does publish, and be
            precise about how it transfers. The figures at the top of this
            page — 12B+ organic views, 35,000+ videos, 45M+ subscribers — are
            channel and catalog numbers built across seven years. They are
            not podcast metrics and we will not dress them up as podcast
            metrics. What carries across is the operating capability behind
            them: high-volume editing, packaging tested against
            click-through, multi-platform publishing, and localization
            across 20+ languages.
          </p>
          <p className="pod-proof-body">
            On a call we will walk you through that work and the exact
            process we would run on your show.
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
        <div className="pod-shell pod-final-inner">
          <div className="pod-final-copy">
            <h2 id="pod-final-title" className="pod-section-title pod-final-title">
              Get a free podcast audit
            </h2>
            <p className="pod-final-lead">
              Send the show link. We&rsquo;ll review packaging, retention,
              publishing cadence and back catalog, then come back with what we
              would change first — and what it would cost.
            </p>
            <ul className="pod-final-points">
              {[
                "Findings are yours whether or not we work together",
                "Scope and price come back together, in USD",
                "No obligation and no discovery-call gauntlet",
              ].map((t) => (
                <li key={t}>
                  <FaCheck aria-hidden="true" className="pod-tick" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pod-final-form">
            <PodcastAuditForm />
          </div>
        </div>
      </section>
    </div>
  );
}
