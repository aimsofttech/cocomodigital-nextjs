import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import type { PodcastCta, PodcastPageData } from "@/src/lib/podcast";
import PodcastAuditForm from "./PodcastAuditForm";
import PodcastFaq from "./PodcastFaq";
import PodcastAutoVideo from "./PodcastAutoVideo";
import PodcastHeroMedia from "./PodcastHeroMedia";
import { AudienceArt, GroupSketch, Icon, OperationSketch, ProblemContrast, StageDiagram } from "./PodcastVisuals";
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

/* Where each kind of repeating row is managed in the admin. `segment` is the
 * section list that owns it and `sectionKey` narrows the two collections that
 * carry more than one band. Together with the record id these produce a link
 * that opens that exact record's edit form. */
const ITEM_ROUTE: Record<string, { segment: string; sectionKey?: string }> = {
  trust: { segment: "stat", sectionKey: "trust" },
  problem: { segment: "stat", sectionKey: "problem" },
  scale: { segment: "stat", sectionKey: "scale" },
  services: { segment: "card", sectionKey: "services" },
  audiences: { segment: "card", sectionKey: "audiences" },
  operations: { segment: "card", sectionKey: "operations" },
  process: { segment: "card", sectionKey: "process" },
  month: { segment: "card", sectionKey: "month" },
  stage: { segment: "stage" },
  shot: { segment: "shot" },
  faq: { segment: "faq" },
  cta: { segment: "cta" },
};

/** The pencil for one card, row or question — opens that record's own form. */
function EditItem({
  pageId, kind, id, label,
}: { pageId: string; kind: string; id?: string; label: string }) {
  const route = ITEM_ROUTE[kind];
  if (!route || !id) return null;
  const section = route.sectionKey ? `&sectionKey=${route.sectionKey}` : "";
  return (
    <SectionEditLink
      module="podcast"
      compact
      to={`podcast/${route.segment}?podcastPageId=${pageId}${section}&editId=${id}`}
      label={label}
    />
  );
}

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
  /* Every CTA carries the arrow now, not just the primary one. Anil on
     the proof band's links: "this doesn't look like I can go and look" —
     a secondary button with no arrow reads as a label rather than a way
     through. */

  /* Internal routes go through next/link for client-side navigation; in-page
     anchors and external links stay plain <a>, exactly as before. */
  if (cta.href.startsWith("/")) {
    return (
      <Link href={cta.href} className={className}>
        {cta.label}
        <FaArrowRight aria-hidden="true" />
      </Link>
    );
  }

  return (
    <a href={cta.href} className={className}>
      {cta.label}
      <FaArrowRight aria-hidden="true" />
    </a>
  );
}

/* Eight separate service cards asked a podcaster to hold eight things in
   their head and work out which ones they needed. Anil's call: club them
   so the page offers three obvious answers instead.

   The grouping is by WHEN the work happens to a recording — make it,
   multiply it, get it seen — because that is the order a show owner
   already thinks in. Grouped by icon rather than by title so an editor
   can rewrite any card's wording in the admin without silently dropping
   it out of its group. Anything with an unrecognised icon falls into the
   last group rather than disappearing. */
const SERVICE_GROUPS: { key: string; title: string; blurb: string; icons: string[] }[] = [
  {
    key: "good",
    title: "Make it good",
    blurb: "The craft that decides whether anyone stays.",
    icons: ["video", "audio", "thumb"],
  },
  {
    key: "more",
    title: "Make more of it",
    blurb: "One recording, many pieces and many markets.",
    icons: ["clip", "globe"],
  },
  {
    key: "found",
    title: "Make it findable",
    blurb: "Published, searchable and measured every week.",
    icons: ["notes", "publish", "chart"],
  },
];


/* Icons we have drawn an audience scene for. Kept beside the component
   so adding a scene is one edit in PodcastVisuals plus one entry here. */
const AUDIENCE_HAS_ART = new Set(["mic", "brand", "network"]);

/* Icons with a hand-drawn sketch in the operations band. */
const OPS_HAS_SKETCH = new Set(["clock", "dollar", "lock"]);

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

  /* The wrong-call band splits into two columns only when there is something
     to put in the second one — which is now simply "is there a video?". The
     band has no still of its own to manage: a YouTube video brings its own
     thumbnail and a file plays its own first frame, so the video is the whole
     of the media and the only thing worth testing. */
  const hasNotForMedia = Boolean(notFor.media?.videoId || notFor.media?.videoSrc);

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
                    <EditItem pageId={data.id} kind="trust" id={s.id} label={s.label} />
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

          {/* Draws the argument the lead paragraph makes in prose. Sits
              between the two because it explains the problem and frames
              the numbers below as evidence for it. */}
          <ProblemContrast />

          {/* The three stat cards (4–8 hrs / 60+ / 1 editor) stood here.
              Removed on Anil's call once the contrast block landed: two of
              them had become restatements of it — the diagram says "60+
              pieces, every week" verbatim, and "Without a system / Run as a
              system" IS "one editor can't carry that load". The 4–8 hrs
              figure was the only fact they carried that the diagram did not,
              so it moved up into the diagram itself where it explains why
              the fork happens at all.

              `data.problemStats` still arrives from the API and is simply not
              rendered, so nothing needs deleting in the admin panel. */}
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
                    <EditItem pageId={data.id} kind="stage" id={stage.id} label={stage.name} />
                    {/* Placeholder illustration until real photography
                        exists. Draws the stage's argument rather than
                        filling space, and imitates nothing — no fake
                        screenshot, no implied number. */}
                    <div
                      className={
                        stage.image
                          ? "pod-stage-figure pod-stage-figure--photo"
                          : "pod-stage-figure"
                      }
                    >
                      <span className="pod-stage-ordinal" aria-hidden="true">
                        {stage.step}
                      </span>
                      {/* The illustration now comes from the API, so an editor
                          can replace it. A plain <img> rather than next/image:
                          the field accepts SVGs, which the image optimiser
                          refuses unless SVG handling is enabled site-wide, and
                          that is not a trade worth making for four figures.
                          With no image stored, the diagram the page shipped
                          with is still drawn inline — so a stage is never
                          left blank.

                          The dimensions are the admin panel's recommended
                          upload (STAGE_ART_SPEC), which is the 16:9 the panel
                          crops to. CSS sizes the picture either way; these
                          only tell the browser what shape to reserve. */}
                      {stage.image ? (
                        <img
                          className="pod-stage-art"
                          src={stage.image}
                          alt={stage.imageAlt || ""}
                          width={1200}
                          height={675}
                          loading="lazy"
                          decoding="async"
                          {...(stage.imageAlt ? {} : { role: "presentation" })}
                        />
                      ) : (
                        <StageDiagram id={stage.diagramKey} />
                      )}
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
            <div className="pod-service-groups">
              {SERVICE_GROUPS.map((g, gi) => {
                const used = new Set(
                  SERVICE_GROUPS.flatMap((x) => x.icons),
                );
                const cards = data.serviceCards.filter((c) =>
                  gi === SERVICE_GROUPS.length - 1
                    ? g.icons.includes(c.icon) || !used.has(c.icon)
                    : g.icons.includes(c.icon),
                );
                if (!cards.length) return null;
                return (
                  <section key={g.key} className="pod-service-group">
                    <header className="pod-service-group-head">
                      <div className="pod-service-group-words">
                        <h3 className="pod-service-group-title">{g.title}</h3>
                        <p className="pod-service-group-blurb">{g.blurb}</p>
                      </div>
                      <GroupSketch id={g.key} />
                    </header>
                    <div className="pod-service-grid pod-reveal-group">
                      {cards.map((s, i) => (
                <article
                  key={s.title}
                  /* Staggered purely in CSS off an index custom property —
                     no JS, no observer, and the whole thing is disabled
                     under prefers-reduced-motion. */
                  style={{ "--i": i } as React.CSSProperties}
                  className={
                    s.image
                      ? "pod-service-card pod-reveal pod-service-card--art"
                      : "pod-service-card pod-reveal"
                  }
                >
                  {/* Backdrop, not an illustration. It sits under the card's
                      own words at low opacity and is hidden from assistive
                      tech unless someone gives it a description, because a
                      texture behind text has nothing to announce. */}
                  {s.image && (
                    <img
                      className="pod-service-card-bg"
                      src={s.image}
                      alt={s.imageAlt || ""}
                      loading="lazy"
                      decoding="async"
                      {...(s.imageAlt ? {} : { "aria-hidden": true })}
                    />
                  )}
                  <EditItem pageId={data.id} kind="services" id={s.id} label={s.title} />
                  {/* The icon only appears when there is no photograph.
                      With one, the card had two accents competing in a
                      300px box — the same mistake the distribution band
                      had. The picture is the visual; the yellow tile was
                      a second one. */}
                  {!s.image && (
                    <span className="pod-service-icon">
                      <Icon name={s.icon} />
                    </span>
                  )}
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
                  </section>
                );
              })}
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
                  <EditItem pageId={data.id} kind="audiences" id={a.id} label={a.title} />
                  {/* Draws the shape of this reader's operation rather than
                      decorating the card. Falls back to the icon when an
                      editor picks something we have no scene for. */}
                  {AUDIENCE_HAS_ART.has(a.icon) ? (
                    <div className="pod-audience-figure">
                      <AudienceArt id={a.icon} />
                    </div>
                  ) : (
                    <span className="pod-audience-icon">
                      <Icon name={a.icon} />
                    </span>
                  )}
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
                    <th scope="row">
                      <EditItem pageId={data.id} kind="month" id={r.id} label={r.title} />
                      {r.title}
                    </th>
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
      {/* Heading across the top, then two columns: the disqualifiers on the
          left, a video on the right, so the frame sits level with the list
          rather than floating beside the heading with the items below it.
          The media is optional and admin-controlled — with no poster set,
          `hasNotForMedia` is false, the shell narrows back to its original
          900px and the copy renders exactly as it did before this column
          existed. So the band is never half-empty waiting for an asset. */}
      <section className="pod-notfor" aria-labelledby="pod-notfor-title">
        <EditSection pageId={data.id} section="notFor" label="the wrong-call band" />
        <div
          className={
            hasNotForMedia
              ? "pod-shell pod-notfor-inner"
              : "pod-shell pod-shell--narrow"
          }
        >
          <div className="pod-notfor-head">
            {notFor.eyebrow && <p className="pod-eyebrow">{notFor.eyebrow}</p>}
            <h2 id="pod-notfor-title" className="pod-section-title">
              {notFor.heading}
            </h2>
            {notFor.lead && <p className="pod-section-lead">{notFor.lead}</p>}
          </div>

          {hasNotForMedia && (
            <div className="pod-notfor-media">
              {/* Sits directly after the heading and its opening line, on
                  Anil's call — it is the human face of a band that is
                  otherwise a list of reasons to walk away, so it should
                  arrive before the list, not beside or below it.
                  Plays itself, muted, with no chrome at all. */}
              <PodcastAutoVideo media={notFor.media} />
            </div>
          )}

          <div className="pod-notfor-copy">
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

        </div>
      </section>

      {/* -------------------------------------------- founder note */}
      <section className="pod-founder" aria-labelledby="pod-founder-title">
        <EditSection pageId={data.id} section="founder" label="the founder note" />
        <div className="pod-shell">
          {/* "Who you are actually dealing with" leads, then the face, then
              the words. Anil's call: the portrait was arriving before the
              line that frames it. */}
          {founder.eyebrow && (
            <p className="pod-eyebrow pod-founder-eyebrow">{founder.eyebrow}</p>
          )}
        </div>
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
                  <EditItem pageId={data.id} kind="operations" id={o.id} label={o.title} />
                  {OPS_HAS_SKETCH.has(o.icon) ? (
                    <span className="pod-us-figure">
                      <OperationSketch id={o.icon} />
                    </span>
                  ) : (
                    <span className="pod-us-icon">
                      <Icon name={o.icon} />
                    </span>
                  )}
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
                    <EditItem pageId={data.id} kind="shot" id={shot.id} label={shot.caption || "this photograph"} />
                    <Image
                      src={shot.image}
                      alt={shot.alt}
                      width={1200}
                      height={675}
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 46vw"
                      className="pod-studio-img"
                    />
                    <span className="pod-studio-caption">{shot.caption}</span>
                  </li>
                ))}
            </ul>
          )}

          {/* Anil will add more studio photographs, and a fixed grid of six
              gives them nowhere to go. This is the door: it points at the
              gallery that already exists rather than growing this band. */}
          <p className="pod-studio-more">
            <a href="/gallery" className="pod-textlink">
              See more of the studio
              <FaArrowRight aria-hidden="true" />
            </a>
          </p>

          {/* The 60 people / 60+ partner channels / $600K+ / 20+ languages
              strip lived here, plus its footnote. Removed on Anil's call: the
              credentials band near the top already carries the studio's scale,
              and restating it this far down was the same argument twice.
              `data.scaleStats` still arrives from the API and is simply not
              rendered, so nothing needs deleting in the admin panel. */}
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
                <EditItem pageId={data.id} kind="process" id={p.id} label={p.title} />
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
          {/* Two columns, because this band is doing two jobs at once: it
              admits what does not exist yet, and it points at what does.
              Run together as one stack of paragraphs, the admission buried
              the links — which are the only actionable thing here. */}
          <div className="pod-proof-split">
            <div className="pod-proof-statement">
              {proof.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="pod-proof-body">
                  {p}
                </p>
              ))}
            </div>

            {data.ctas.proof.length > 0 && (
              <aside className="pod-proof-aside">
                <p className="pod-proof-aside-kicker">Go and look</p>
                <div className="pod-proof-links">
                  {data.ctas.proof.map((c) => (
                    <Cta key={c.href} cta={c} />
                  ))}
                  <EditItem pageId={data.id} kind="cta" id={data.ctas.proof[0].id} label="these links" />
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- faq */}
      {data.faqs.length > 0 && (
        <section className="pod-faq" aria-labelledby="pod-faq-title">
        <EditSection pageId={data.id} section="faq" label="the FAQ band" />
          {/* Full-width shell, not --narrow. The 900px cap left this band
              inset from every other one on a landscape iPad (900 against
              1017 at 1024px, 900 against 1173 at 1180px) which read as a
              mistake. The cap was there to protect the reading measure, so
              that job moves to the answer text itself — the accordion now
              lines up with the page, the prose still stops at a sensible
              line length. */}
          <div className="pod-shell">
            {faq.eyebrow && <p className="pod-eyebrow">{faq.eyebrow}</p>}
            <h2 id="pod-faq-title" className="pod-section-title">
              {faq.title}
            </h2>
            <PodcastFaq items={data.faqs} pageId={data.id} />
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
            {/* A face on the last thing they read before the form. Anil:
                "it's people behind it, not just some website." The name
                and role come from the founder band so there is one place
                to change them, and the whole thing is skipped if no
                portrait has been set. */}
            {founder.portrait && (
              <div className="pod-final-signoff">
                <Image
                  src={founder.portrait}
                  alt={founder.portraitAlt}
                  width={112}
                  height={112}
                  loading="lazy"
                  sizes="72px"
                  className="pod-final-face"
                />
                <p className="pod-final-signoff-copy">
                  <span className="pod-final-signoff-name">{founder.name}</span>
                  <span className="pod-final-signoff-role">{founder.role}</span>
                  <span className="pod-final-signoff-note">
                    Reads every audit request himself.
                  </span>
                </p>
              </div>
            )}
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
