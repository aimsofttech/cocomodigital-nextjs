import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import type { PodcastCta, PodcastPageData } from "@/src/lib/podcast";
import PodcastAuditForm from "./PodcastAuditForm";
import PodcastFaq from "./PodcastFaq";
import PodcastHeroMedia from "./PodcastHeroMedia";
import { Icon, StageDiagram } from "./PodcastVisuals";
import SectionEditLink from "@/src/components/common/SectionEditLink/SectionEditLink";

/**
 * /podcast-video-editing-marketing-services
 *
 * Server component by design — only the FAQ accordion and the audit form ship
 * JavaScript. Everything above the fold is static HTML with inline SVG, which
 * is what keeps LCP down and gives crawlers (and AI assistants) the full text
 * without executing anything.
 *
 * Every string, figure and photograph below comes from the API (admin panel →
 * Podcast). The route resolves the payload — falling back to the shipped copy
 * if the API is unreachable — and hands it in whole, so this file stays a pure
 * renderer with no fetching of its own.
 *
 * Optional content degrades rather than breaking: an empty band is skipped, a
 * missing image is simply not drawn, and the surrounding layout is unchanged.
 */

/* Which step of the admin's Podcast page wizard edits each band.
 *
 * The wizard already walks this page one band at a time, in page order, and
 * each of its steps carries that band's copy AND its repeating items — so the
 * Edit pencils need no new admin screens at all, only the step number. Keep
 * this in step with STEPS in app/admin/src/pages/podcast/PageWizard.tsx. */
const EDIT_STEP: Record<string, number> = {
  hero: 1,
  credentials: 2,
  problem: 3,
  method: 4,
  services: 5,
  audiences: 6,
  pricing: 7,
  month: 8,
  notFor: 9,
  founder: 10,
  operations: 11,
  studio: 12,
  process: 14,
  proof: 15,
  faq: 16,
  closing: 17,
};

/** The pencil for one band, addressed at its own step of the page editor. */
function EditSection({ pageId, section, label }: { pageId: string; section: string; label: string }) {
  return (
    <SectionEditLink
      module="podcast"
      to={`podcast/page/edit/${pageId}?step=${EDIT_STEP[section]}`}
      label={label}
    />
  );
}

/** The page's one button treatment, rendered from a CTA record. */
function Cta({ cta }: { cta: PodcastCta }) {
  const className = `pod-cta pod-cta--${cta.variant}`;

  /* Internal routes go through next/link for client-side navigation; in-page
     anchors and external links stay plain <a>, exactly as before. */
  if (cta.href.startsWith("/")) {
    return (
      <Link href={cta.href} className={className}>
        {cta.label}
        {cta.variant === "primary" && <FaArrowRight aria-hidden="true" />}
      </Link>
    );
  }

  return (
    <a href={cta.href} className={className}>
      {cta.label}
      {cta.variant === "primary" && <FaArrowRight aria-hidden="true" />}
    </a>
  );
}

export default function PodcastGrowthPage({ data }: { data: PodcastPageData }) {
  const {
    hero,
    credentials,
    problem,
    method,
    services,
    audience,
    pricing,
    month,
    notFor,
    founder,
    operations,
    studio,
    process,
    proof,
    faq,
    final,
    auditForm,
  } = data;

  const heroCta = data.ctas.hero[0];
  const pricingCta = data.ctas.pricing[0];
  const founderCta = data.ctas.founder[0];

  return (
    <div className="pod-page">
      {/* ---------------------------------------------------- hero */}
      <section className="pod-hero" aria-labelledby="pod-hero-title">
        <EditSection pageId={data.id} section="hero" label="the hero" />
        <div className="pod-shell pod-hero-inner">
          <div className="pod-hero-copy">
            {hero.eyebrow && <p className="pod-eyebrow">{hero.eyebrow}</p>}
            <h1 id="pod-hero-title" className="pod-hero-title">
              {hero.title}
            </h1>
            {hero.sub && <p className="pod-hero-sub">{hero.sub}</p>}

            {/* Exactly one action. "See how it works" was a second
                decision to make in the fold, and the thing it pointed at
                is simply the next screen down — scrolling already does
                it. The site header contributes its own "Get started"
                button to this viewport, so one here is really two. */}
            {heroCta && (
              <div className="pod-hero-ctas">
                <Cta cta={heroCta} />
              </div>
            )}

            {/* Metadata, not controls: no border, no pill, so nothing
                here reads as a third and fourth button. */}
            {(hero.priceBadge || hero.hoursBadge) && (
              <ul className="pod-meta">
                {hero.priceBadge && (
                  <li className="pod-meta-item">
                    <Icon name={hero.priceBadgeIcon} className="pod-meta-icon" />
                    {hero.priceBadge}
                  </li>
                )}
                {hero.hoursBadge && (
                  <li className="pod-meta-item">
                    <Icon name={hero.hoursBadgeIcon} className="pod-meta-icon" />
                    {hero.hoursBadge}
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="pod-hero-visual">
            <PodcastHeroMedia media={hero.media} />
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
        <EditSection pageId={data.id} section="credentials" label="the credentials strip" />
        <div className="pod-shell">
          {credentials.signature && (
            <p className="pod-hero-signature pod-credentials-line">
              {credentials.signature}
            </p>
          )}
          {data.trustStats.length > 0 && (
            <div className="pod-trust">
              {credentials.caption && (
                <p className="pod-trust-caption">{credentials.caption}</p>
              )}
              <ul className="pod-trust-list">
                {data.trustStats.map((s) => (
                  <li key={s.label} className="pod-trust-item">
                    <span className="pod-trust-value">{s.value}</span>
                    <span className="pod-trust-label">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- problem */}
      <section className="pod-problem" aria-labelledby="pod-problem-title">
        <EditSection pageId={data.id} section="problem" label="the problem band" />
        {/* Backdrop, not an illustration. Deliberately decorative:
            aria-hidden, and scrimmed hard on the left so it never
            competes with the text sitting on it.
            A close-up of an editor mid-cut argues "post-production is
            the expensive half" faster than a wide room does, and the
            wall behind him is already the brand yellow — which is why
            this one is only partly desaturated. */}
        {problem.backgroundImage && (
          <div className="pod-problem-bg" aria-hidden="true">
            <Image
              src={problem.backgroundImage}
              alt=""
              fill
              sizes="100vw"
              className="pod-problem-bg-img"
            />
          </div>
        )}
        <div className="pod-shell">
          <h2 id="pod-problem-title" className="pod-section-title">
            {problem.title}
          </h2>
          {problem.lead && (
            <p className="pod-section-lead pod-problem-lead">{problem.lead}</p>
          )}
          {data.problemStats.length > 0 && (
            <div className="pod-problem-grid">
              {data.problemStats.map((p) => (
                <article key={p.label} className="pod-problem-card">
                  <p className="pod-problem-value">{p.value}</p>
                  <p className="pod-problem-label">{p.label}</p>
                  <p className="pod-problem-body">{p.description}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------- signal-to-scale */}
      <section
        id="signal-to-scale"
        className="pod-method"
        aria-labelledby="pod-method-title"
      >
        <EditSection pageId={data.id} section="method" label="the Signal-to-Scale band" />
        <div className="pod-shell">
          {method.eyebrow && <p className="pod-eyebrow">{method.eyebrow}</p>}
          <h2 id="pod-method-title" className="pod-section-title">
            {method.title}
          </h2>
          {method.lead && <p className="pod-section-lead">{method.lead}</p>}

          {data.stages.length > 0 && (
            <div className="pod-stage-wrap">
              <ol className="pod-stage-list">
                {data.stages.map((stage) => (
                  <li key={stage.name} className="pod-stage">
                    {/* Placeholder illustration until real photography
                        exists. Draws the stage's argument rather than
                        filling space, and imitates nothing — no fake
                        screenshot, no implied number. */}
                    <div className="pod-stage-figure">
                      <span className="pod-stage-ordinal" aria-hidden="true">
                        {stage.step}
                      </span>
                      <StageDiagram id={stage.diagramKey} />
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
          )}
        </div>
      </section>

      {/* ------------------------------------------------ services */}
      <section className="pod-services" aria-labelledby="pod-services-title">
        <EditSection pageId={data.id} section="services" label="the services band" />
        <div className="pod-shell">
          {services.eyebrow && <p className="pod-eyebrow">{services.eyebrow}</p>}
          <h2 id="pod-services-title" className="pod-section-title">
            {services.title}
          </h2>
          {services.lead && <p className="pod-section-lead">{services.lead}</p>}
          {data.serviceCards.length > 0 && (
            <div className="pod-service-grid">
              {data.serviceCards.map((s) => (
                <article key={s.title} className="pod-service-card">
                  <span className="pod-service-icon">
                    <Icon name={s.icon} />
                  </span>
                  <h3 className="pod-service-title">{s.title}</h3>
                  <p className="pod-service-body">{s.body}</p>
                  <ul className="pod-service-tags">
                    {s.points.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------- audiences */}
      <section className="pod-audience" aria-labelledby="pod-audience-title">
        <EditSection pageId={data.id} section="audiences" label="the audience band" />
        <div className="pod-shell">
          {audience.eyebrow && <p className="pod-eyebrow">{audience.eyebrow}</p>}
          <h2 id="pod-audience-title" className="pod-section-title">
            {audience.title}
          </h2>
          {data.audienceCards.length > 0 && (
            <div className="pod-audience-grid">
              {data.audienceCards.map((a) => (
                <article key={a.title} className="pod-audience-card">
                  <span className="pod-audience-icon">
                    <Icon name={a.icon} />
                  </span>
                  <h3 className="pod-audience-title">{a.title}</h3>
                  <p className="pod-audience-body">{a.body}</p>
                  <p className="pod-audience-signal">{a.meta}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- pricing */}
      <section id="pricing" className="pod-pricing" aria-labelledby="pod-pricing-title">
        <EditSection pageId={data.id} section="pricing" label="the pricing band" />
        <div className="pod-shell">
          <div className="pod-pricing-card">
            <div className="pod-pricing-head">
              {pricing.eyebrow && <p className="pod-eyebrow">{pricing.eyebrow}</p>}
              <h2 id="pod-pricing-title" className="pod-section-title">
                {pricing.heading}
              </h2>
              <p className="pod-pricing-figure">
                <span className="pod-pricing-prefix">{pricing.prefix}</span>
                <span className="pod-pricing-amount">{pricing.floor}</span>
                <span className="pod-pricing-unit">{pricing.unit}</span>
              </p>
              <p className="pod-pricing-lead">{pricing.lead}</p>
            </div>

            <div className="pod-pricing-cols">
              <div className="pod-pricing-col">
                <h3 className="pod-pricing-col-title">{pricing.includedTitle}</h3>
                <ul className="pod-pricing-list">
                  {pricing.included.map((i) => (
                    <li key={i}>
                      <FaCheck aria-hidden="true" className="pod-tick" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pod-pricing-col">
                <h3 className="pod-pricing-col-title">{pricing.scalesTitle}</h3>
                <ul className="pod-pricing-list pod-pricing-list--plain">
                  {pricing.scales.map((i) => (
                    <li key={i}>
                      <span className="pod-dash" aria-hidden="true" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pod-pricing-foot">
              <p className="pod-pricing-note">{pricing.note}</p>
              {pricingCta && <Cta cta={pricingCta} />}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- month table */}
      <section className="pod-month" aria-labelledby="pod-month-title">
        <EditSection pageId={data.id} section="month" label="the month table" />
        <div className="pod-shell">
          {month.eyebrow && <p className="pod-eyebrow">{month.eyebrow}</p>}
          <h2 id="pod-month-title" className="pod-section-title">
            {month.title}
          </h2>
          {month.lead && <p className="pod-section-lead">{month.lead}</p>}

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
            {month.tableNote}
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
                  <th scope="col">{month.columns.deliverable}</th>
                  <th scope="col">{month.columns.volume}</th>
                  <th scope="col">{month.columns.detail}</th>
                </tr>
              </thead>
              <tbody>
                {data.monthRows.map((r) => (
                  <tr key={r.title}>
                    <th scope="row">{r.title}</th>
                    <td>
                      <span className="pod-vol">{r.meta}</span>
                    </td>
                    <td>{r.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --------------------------------------- who this is not for */}
      <section className="pod-notfor" aria-labelledby="pod-notfor-title">
        <EditSection pageId={data.id} section="notFor" label="the wrong-call band" />
        <div className="pod-shell pod-shell--narrow">
          {notFor.eyebrow && <p className="pod-eyebrow">{notFor.eyebrow}</p>}
          <h2 id="pod-notfor-title" className="pod-section-title">
            {notFor.heading}
          </h2>
          {notFor.lead && <p className="pod-section-lead">{notFor.lead}</p>}
          <ul className="pod-notfor-list">
            {notFor.items.map((i) => (
              <li key={i.slice(0, 24)}>
                <span className="pod-cross" aria-hidden="true">&times;</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
          <p className="pod-notfor-foot">{notFor.footnote}</p>
        </div>
      </section>

      {/* -------------------------------------------- founder note */}
      <section className="pod-founder" aria-labelledby="pod-founder-title">
        <EditSection pageId={data.id} section="founder" label="the founder note" />
        <div className="pod-shell pod-founder-inner">
          {founder.portrait && (
            <div className="pod-founder-portrait">
              <Image
                src={founder.portrait}
                alt={founder.portraitAlt}
                width={592}
                height={682}
                loading="lazy"
                sizes="(max-width: 900px) 60vw, 320px"
                className="pod-founder-img"
              />
            </div>
          )}
          <div className="pod-founder-copy">
            {founder.eyebrow && <p className="pod-eyebrow">{founder.eyebrow}</p>}
            <h2 id="pod-founder-title" className="pod-section-title">
              {founder.name}
            </h2>
            <p className="pod-founder-role">{founder.role}</p>
            {founder.lines.map((line) => (
              <p key={line.slice(0, 24)} className="pod-founder-line">
                {line}
              </p>
            ))}
            {founderCta && <Cta cta={founderCta} />}
          </div>
        </div>
      </section>

      {/* --------------------------------------- working with a US show */}
      <section className="pod-us" aria-labelledby="pod-us-title">
        <EditSection pageId={data.id} section="operations" label="the time zones band" />
        <div className="pod-shell">
          {operations.eyebrow && <p className="pod-eyebrow">{operations.eyebrow}</p>}
          <h2 id="pod-us-title" className="pod-section-title">
            {operations.title}
          </h2>
          {data.operationCards.length > 0 && (
            <div className="pod-us-grid">
              {data.operationCards.map((o) => (
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
          )}
        </div>
      </section>

      {/* -------------------------------------------- studio strip */}
      <section className="pod-studio" aria-labelledby="pod-studio-title">
        <EditSection pageId={data.id} section="studio" label="the studio strip" />
        <div className="pod-shell">
          <div className="pod-studio-copy">
            {studio.eyebrow && <p className="pod-eyebrow">{studio.eyebrow}</p>}
            <h2 id="pod-studio-title" className="pod-section-title">
              {studio.heading}
            </h2>
            {studio.body && <p className="pod-section-lead">{studio.body}</p>}
          </div>

          {/* Capability frames, captioned. Each caption names only what
              is actually visible in the photograph — no frame is
              labelled with work it does not show. */}
          {data.studioShots.length > 0 && (
            <ul className="pod-studio-grid">
              {data.studioShots
                .filter((shot) => shot.image)
                .map((shot) => (
                  <li
                    key={shot.image}
                    className={`pod-studio-item${shot.wide ? " pod-studio-item--wide" : ""}`}
                  >
                    <Image
                      src={shot.image}
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
          )}

          {data.scaleStats.length > 0 && (
            <ul className="pod-scale">
              {data.scaleStats.map((m) => (
                <li key={m.label} className="pod-scale-item">
                  <span className="pod-scale-value">{m.value}</span>
                  <span className="pod-scale-label">{m.label}</span>
                  <span className="pod-scale-sub">{m.description}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="pod-scale-note">{studio.scaleNote}</p>
        </div>
      </section>

      {/* ------------------------------------------------- process */}
      <section className="pod-process" aria-labelledby="pod-process-title">
        <EditSection pageId={data.id} section="process" label="the process band" />
        <div className="pod-shell">
          {process.eyebrow && <p className="pod-eyebrow">{process.eyebrow}</p>}
          <h2 id="pod-process-title" className="pod-section-title">
            {process.title}
          </h2>
          <ol className="pod-process-list">
            {data.processSteps.map((p) => (
              <li key={p.title} className="pod-process-step">
                <span className="pod-process-num" aria-hidden="true">
                  {p.step}
                </span>
                <div className="pod-process-body">
                  <div className="pod-process-headline">
                    <h3 className="pod-process-name">{p.title}</h3>
                    <span className="pod-process-duration">{p.meta}</span>
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
        <EditSection pageId={data.id} section="proof" label="the proof band" />
        <div className="pod-shell">
          {proof.eyebrow && <p className="pod-eyebrow">{proof.eyebrow}</p>}
          <h2 id="pod-proof-title" className="pod-section-title">
            {proof.title}
          </h2>
          {/* When a podcast client clears a case study, this section becomes a
              real proof block. Until then it must not imply a podcast roster
              exists — which is now an editorial decision made in the admin
              panel rather than a code change. */}
          {proof.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="pod-proof-body">
              {p}
            </p>
          ))}
          {data.ctas.proof.length > 0 && (
            <div className="pod-proof-links">
              {data.ctas.proof.map((c) => (
                <Cta key={c.href} cta={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- faq */}
      {data.faqs.length > 0 && (
        <section className="pod-faq" aria-labelledby="pod-faq-title">
        <EditSection pageId={data.id} section="faq" label="the FAQ band" />
          <div className="pod-shell pod-shell--narrow">
            {faq.eyebrow && <p className="pod-eyebrow">{faq.eyebrow}</p>}
            <h2 id="pod-faq-title" className="pod-section-title">
              {faq.title}
            </h2>
            <PodcastFaq items={data.faqs} />
          </div>
        </section>
      )}

      {/* ------------------------------------------------ final cta */}
      <section
        id="podcast-audit"
        className="pod-final"
        aria-labelledby="pod-final-title"
      >
        <EditSection pageId={data.id} section="closing" label="the closing band" />
        <div className="pod-shell pod-final-inner">
          <div className="pod-final-copy">
            <h2 id="pod-final-title" className="pod-section-title pod-final-title">
              {final.title}
            </h2>
            <p className="pod-final-lead">{final.lead}</p>
            <ul className="pod-final-points">
              {final.points.map((t) => (
                <li key={t}>
                  <FaCheck aria-hidden="true" className="pod-tick" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pod-final-form">
            <PodcastAuditForm copy={auditForm} />
          </div>
        </div>
      </section>
    </div>
  );
}
