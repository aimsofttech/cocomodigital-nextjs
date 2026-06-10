// @ts-nocheck
"use client";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
/* Phase 5b: useSelector removed — about.tsx now takes brands as prop. */
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import { getFeaturedPhotos } from "../Gallery/galleryPhotos";
import { getFeaturedMembers } from "../Team/teamMembers";


const FOUNDER_PORTRAIT_URL = "/Images/about/anil-mahato-cocoma-founder.jpg";

const STORY_CHAPTERS = [
  {
    year: "2019",
    title: "The pitch that wasn't mine.",
    body: "A friend asked me to fill in for him on a YouTube pitch to Amazon Prime Video. I went, pitched something different — a whole content culture, not just trailers and ads — and they said yes. The friend didn't continue with it. The work was on me. Cocoma started forming around that one decision.",
  },
  {
    year: "2020",
    title: "Lockdown — and the call we didn't make.",
    body: "Pipeline froze. Most studios cut their teams in half. We didn't fire a single editor. That decision is why 70% of partnerships still recur today — we kept the people who built the work, so the work kept compounding.",
  },
  {
    /* TODO: Anil to confirm the year you went from solo to a
       full in-house team. Placeholder copy below. */
    year: "2022–23",
    title: "Solo → in-house, no subcontracting.",
    body: "Stopped subcontracting entirely. Built the team in-house — editors, designers, marketers under one roof in Mumbai. Quality became something we owned, not chased.",
  },
  {
    year: "Today",
    title: "Three lines. One studio.",
    body: "Cocoma now runs Code + Content + Marketing as one operation. 70% of partnerships are recurring — same partners, year after year, because the work earns its way back every month.",
  },
];

/* Manifesto rewritten May 2026. Anil's brief: align with the
   Netflix culture book ("No Rules Rules") tone — short, opinionated,
   actionable principles. Lines 1-3 are Anil's own (polished into
   manifesto rhythm); 4-5 carry forward Cocoma's distinct beliefs
   in Netflix-style brevity (context-over-control = how the studio
   runs day-to-day; recurring = Cocoma's strongest commercial
   conviction). Easy to swap any line later — this array is the
   single source of truth for the manifesto section. */
const MANIFESTO = [
  "Best idea wins. Not best person on the floor.",
  "Feedback is actionable. And aimed to assist.",
  "Numbers don't say everything. But they don't lie either.",
  "Context, not control.",
  "Recurring is the only kind of trust.",
];

const NUMBERS = [
  { value: "60", label: "specialists in-house" },
  { value: "2019", label: "founded in Mumbai" },
  { value: "70%", label: "of revenue is recurring" },
  { value: "3", label: "lines under one roof" },
];

/* Partners section now reads from the same admin-managed
   `brands` Redux feed Section02 uses on the homepage — single
   source of truth, real logo images, Pearl/Anil edit centrally
   via admin (template/brands). The previous hardcoded text-pill
   list (Amazon Prime, Psycho Saiyaan, Hip Hop India, BKSF, etc.)
   is deprecated; if any partner is missing from the about-us
   logo wall, add them in admin and they appear on home + about.

   PARTNERS_FALLBACK kept as a graceful-degrade if the commonApi
   hasn't resolved yet (or returned empty) — text pills render
   instead of an empty section. */
const PARTNERS_FALLBACK = [
  "Amazon Prime Video",
  "IMDb",
  "Amazon MX Player",
  "T-Series",
  "B4U",
  "MxFatafat",
];

/* PARTNER_QUOTES removed May 2026: per CONTENT_BRIEF.md rule 4,
   attributed quotes are skipped entirely until Anil gets specific
   permission per quote. The section was rendering literal
   "[Partner name TBD]" placeholders to visitors. Logo pills above
   carry the partner-trust signal on their own — name-dropping
   real partners is fine by default. If/when a real attributed
   quote is approved, it can be added back here as a single
   testimonial card pattern. */

/* TEAM_LEADS legacy placeholder — superseded May 2026 by the
   data-file-driven Team system. /about-us now reads featured
   members from teamMembers.js (single source of truth, also
   powers /team page). The 4 anonymized placeholder cards that
   previously lived here are gone; the section now renders real
   photos + names + roles for members with consent: true, plus
   anonymized initials cards for any consent: false members.
   Add or remove members in src/views/Team/teamMembers.js. */
/* TEAM_LEADS placeholder consts removed May 2026 — replaced by
   teamMembers.js single-source-of-truth. JSX below now uses
   getFeaturedMembers() from "../Team/teamMembers". */

/* STUDIO_GLIMPSES removed May 2026: the section was rendering
   gradient placeholder tiles ("Editing bay", "Recording booth",
   etc.) without real photos — felt pretentious. The "60 people.
   All in-house. All here." team section already carries the
   "real studio" signal. When Anil sends 6 actual studio photos,
   restore the section below + the const here as <img> tiles. */

const WONT_DO = [
  {
    title: "Vanity views over real outcomes.",
    body: "We won't chase a thumbnail-bait viral hit if it costs the channel's long-term audience.",
  },
  {
    title: "Briefs we can't measure.",
    body: "Internal saying: if we can't measure, we can't manage — and if we can't manage, we can't grow. So we'll push to define what 'this worked' looks like before we start. Yours and ours.",
  },
  {
    title: "Lock-in retainers that don't earn renewal.",
    body: "Month-to-month is the default. The work has to earn its way back, not hide behind a contract.",
  },
];

/* Phase 4 strangle: accepts `brands` prop with Redux fallback.
   Parent page (src/app/about-us/page.tsx) can pass server-fetched
   the API brands; legacy callers fall back to Redux. */
interface AboutUsProps {
  brands?: any[];
}

const AboutUs = ({ brands: brandsProp }: AboutUsProps = {}) => {
  /* Partner logos — reads the same admin-managed `brands` feed
     Section02 (homepage brand strip) uses, so the about-page
     logo wall stays in lock-step with the homepage. If commonApi
     hasn't resolved yet, fall back to text pills (PARTNERS_FALLBACK
     above) so the section never renders empty. */
  /* Phase 5b: Redux fallback dropped. /about-us page now always
     passes server-fetched the API brands via prop. */
  const brands = brandsProp ?? [];

  /* Featured gallery photos — reads from the shared galleryPhotos
     data file (single source of truth, also consumed by /gallery
     full feed). Only photos with featured: true land here. Adding
     or removing a photo from the about-us preview = flipping the
     flag in galleryPhotos.js. */
  const featuredPhotos = getFeaturedPhotos();

  /* /about-us schema: AboutPage (Schema.org type for company "about"
     pages) + BreadcrumbList. The AboutPage links back to the
     sitewide Organization via @id so AI engines can resolve the
     same entity across pages. */
  const aboutSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Cocoma Digital",
      "url": "https://cocomadigital.com/about-us",
      "mainEntity": { "@id": "https://cocomadigital.com/#organization" },
      "description":
        "The story of Cocoma Digital — founded in 2019 by Anil Mahato. From a single freelance gig to a 60-person Mumbai studio building YouTube channels, social audiences, and entertainment brands.",
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
          "name": "About",
          "item": "https://cocomadigital.com/about-us",
        },
      ],
    },
  ];

  return (
    <>
      <div className="about-page">
        {/* 1. Founder hero — real face + signed letter */}
        <section className="about-founder-section">
          <div className="about-founder-inner">
            <div className="about-founder-portrait-wrapper">
              <Image
                className="about-founder-portrait"
                src={FOUNDER_PORTRAIT_URL}
                alt="Anil Mahato, founder of Cocoma Digital"
                width={400}
                height={400}
                priority
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            <div className="about-founder-letter">
              <p className="about-founder-eyebrow">A note from the founder</p>
              <h1 className="about-founder-title font-primary">
                I'm Anil. Cocoma was an accident.
              </h1>
              <div className="about-founder-body">
                <p>
                  In 2019, a friend asked me to fill in for him on a
                  pitch to Amazon Prime Video. He couldn't make it.
                  I went in his place — with no agenda except making
                  the meeting happen.
                </p>
                <p>
                  Back then, Prime Video's YouTube was trailers,
                  teasers, and paid ads. No content system. No
                  editorial strategy.
                </p>
                <p>
                  So instead of pitching what I was supposed to pitch,
                  I told them something different: what their YouTube
                  strategy <em>should</em> be. A whole content
                  culture, not just promo cuts.
                </p>
                <p>
                  The friend didn't continue with it. My face and my
                  name were already on the work. Either I delivered
                  what I'd pitched, or the whole thing fell apart. So
                  I delivered.
                </p>
                <p>
                  The Prime Video channel started growing. More titles
                  came. Then more clients. Then a team.{" "}
                  <strong>Cocoma never really got founded — it just
                    kept forming.</strong>
                </p>
                <p>
                  Six years later, we're a team in Mumbai. Editors,
                  designers, marketers — and unofficially, the chai
                  uncle downstairs who knows everyone's order. Most of
                  us aren't from Mumbai. Most aren't from cities you've
                  heard of.
                </p>
                <p>
                  Today the same team works on Amazon MX Player,
                  IMDb, B4U, T-Series and others across India's
                  biggest entertainment brands.{" "}
                  <strong>Nobody on this team grew up thinking that
                    was possible.</strong> Because for people from where
                  they're from — it usually isn't.
                </p>
                <p>
                  That gap — between "where they're from" and "what
                  they ship" — is the whole reason Cocoma exists. We
                  think the model can work for a lot more than just
                  us. <em>More on that below.</em>
                </p>
                <p>
                  If you're considering working with us, I take the
                  call myself. Not because it scales. Because it's the
                  fastest way for both of us to find out if we should
                  do this together.
                </p>
                <p className="about-founder-signoff">— Anil</p>
              </div>
              <Link to="/ScheduleMeeting" className="about-founder-cta">
                Book a 15-min call with me
                <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* 1.5. Why Cocoma exists — the regional thesis.
            Rewritten May 2026 from the earlier "name + symbol"
            section. Anil shared (in his own words) that Cocoma's
            three lines (Code / Content / Marketing) aren't just
            his personal skill set — they're specifically the
            three skills India, Nepal, and Southeast Asia can build
            globally-competitive careers around without needing
            major infrastructure. The section name reveal still
            happens up top (Co · Code / Co · Content / Ma ·
            Marketing) but now flows into the bigger thesis: three
            doors a whole region can walk through. The butterfly
            icon stays as the visual anchor; we don't dedicate
            prose to explaining it because the page does the
            transformation work itself in this section + the hero. */}
        <section className="about-name-section">
          <div className="about-name-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">The bigger why</p>
              <h2 className="about-section-heading font-primary">
                Why Cocoma exists.
              </h2>
              <p className="about-section-sub">
                Cocoma = <strong>Co</strong>de + <strong>Co</strong>ntent
                + <strong>Ma</strong>rketing. Three things I happened
                to know before any of this. Three things you can
                build a globally-graded career around with just a
                laptop and good internet.
              </p>
            </header>

            {/* Beat 1: Co-Co-Ma breakdown — same sticker rows as
                before, kept because the visual moment ("oh that's
                what the name means") is fun + memorable. Rows now
                read more conversationally — each describes the
                domain, not what Cocoma does in that domain. */}
            <div className="about-name-breakdown">
              <ul className="about-name-list">
                <li className="about-name-list-row">
                  <span className="about-name-prefix font-primary">Co</span>
                  <span className="about-name-word font-primary">Code</span>
                  <span className="about-name-meaning">
                    The systems that make creative work scale.
                  </span>
                </li>
                <li className="about-name-list-row">
                  <span className="about-name-prefix font-primary">Co</span>
                  <span className="about-name-word font-primary">Content</span>
                  <span className="about-name-meaning">
                    The actual videos, edits, designs, words.
                  </span>
                </li>
                <li className="about-name-list-row">
                  <span className="about-name-prefix font-primary">Ma</span>
                  <span className="about-name-word font-primary">Marketing</span>
                  <span className="about-name-meaning">
                    The audience that finds and stays with the work.
                  </span>
                </li>
              </ul>
            </div>

            {/* Butterfly as a centered visual anchor — sits between
                the Co-Co-Ma rows above and the thesis prose below.
                Restructured May 2026 from the previous 2-col
                (icon-left / text-right) layout, which made the icon
                look stranded next to a tall column on desktop once
                we added the video embed. Single-column, centered
                flow reads calmer + lets each element have its own
                moment. */}
            <div className="about-name-butterfly-anchor">
              <Image
                className="about-name-butterfly-icon"
                src="/Images/logo/main-logo.png"
                alt="Cocoma butterfly mark — the brand symbol"
                width={120}
                height={120}
              />
            </div>

            {/* Beat 2: The bigger thesis — why these three skills
                specifically, why this region. Single centered column
                with max-width so the prose stays readable on wide
                desktops; video sits in-flow between paragraphs as
                documented evidence for the claim immediately above. */}
            <div className="about-name-thesis">
              <p>
                That part — <em>laptop and good internet</em> — matters
                more than it sounds.
              </p>

              {/* Video proof — Anil articulating this same thesis
                  publicly at Givo, Netherlands in 2023. Embeds the
                  YouTube clip via youtube-nocookie domain (no
                  tracking cookies until user clicks play) + native
                  loading="lazy" so the iframe defers until near
                  viewport. Sticker frame (yellow offset shadow,
                  2px border) ties the embed into the page's
                  visual idiom rather than feeling pasted-in. */}
              <figure className="about-name-video">
                <div className="about-name-video-frame">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/t01ghHSIsLY"
                    title="Anil Mahato at Givo, Netherlands — 2023, on Cocoma's regional thesis"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <figcaption className="about-name-video-caption">
                  Anil at Givo, Netherlands · 2023 — making this
                  exact case on stage.
                </figcaption>
              </figure>

              <p>
                If you're from a small town in India, Nepal, or
                anywhere across this region — you can't easily
                become an engineer (no college nearby), or a banker
                (no MBA, no network), or a film producer (no
                industry connections).
              </p>
              <p>
                But code, content, and marketing? You can teach
                yourself. You can compete. You can ship globally-grade
                work from a 250-square-foot room in a town nobody's
                heard of.
              </p>
              <p>
                That's the bet Cocoma is built around. Three skills
                that don't need infrastructure. Three doors a whole
                region can walk through — without waiting for the
                government, the funding, or anyone else.
              </p>
              <p className="about-name-butterfly-emphasis font-primary">
                If a team from across the region can ship
                globally-competitive work from one Mumbai studio —
                that's a model others can build on, too.
              </p>
              <p className="about-name-butterfly-coda">
                People transform. Brands transform. Eventually, a
                region transforms with them.
              </p>
            </div>
          </div>
        </section>

        {/* 2. The story — sticker timeline */}
        <section className="about-story-section">
          <div className="about-story-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">How we got here</p>
              <h2 className="about-section-heading font-primary">
                Mostly by accident, then very much on purpose.
              </h2>
            </header>
            <ol className="about-story-timeline">
              {STORY_CHAPTERS.map((chapter, idx) => (
                <li className="about-story-chapter" key={idx}>
                  <span className="about-story-marker" aria-hidden="true">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="about-story-chapter-body">
                    <p className="about-story-chapter-year">
                      {chapter.year}
                    </p>
                    <h3 className="about-story-chapter-title font-primary">
                      {chapter.title}
                    </h3>
                    <p className="about-story-chapter-text">
                      {chapter.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. What we believe — manifesto */}
        <section className="about-manifesto-section">
          <div className="about-manifesto-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow about-section-eyebrow-on-dark">
                What we believe
              </p>
              <h2 className="about-section-heading about-section-heading-on-dark font-primary">
                Five lines you can disagree with.
              </h2>
              <p className="about-section-sub about-section-sub-on-dark">
                Generic mission statements are filler. These are the
                lines we actually live by — sharp enough that
                someone could read one and decide we're not for
                them. Which is fine.
              </p>
            </header>
            <ul className="about-manifesto-list">
              {MANIFESTO.map((line, idx) => (
                <li key={idx} className="about-manifesto-item">
                  <span className="about-manifesto-num font-primary">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="about-manifesto-text font-primary">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Numbers — sticker tiles */}
        <section className="about-numbers-section">
          <div className="about-numbers-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">By the numbers</p>
              <h2 className="about-section-heading font-primary">
                Six years. 60 people. 35,000+ videos.
              </h2>
              <p className="about-section-sub">
                The numbers compound the same way our channels do.
              </p>
            </header>
            <div className="about-numbers-grid">
              {NUMBERS.map((n, idx) => (
                <div className="about-number-tile" key={idx}>
                  <span className="about-number-value font-primary">
                    {n.value}
                  </span>
                  <span className="about-number-label">{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Partners we've grown with — logo pills + quotes */}
        <section className="about-partners-section">
          <div className="about-partners-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">Partners</p>
              <h2 className="about-section-heading font-primary">
                Some of the people who keep coming back.
              </h2>
              <p className="about-section-sub">
                Same partners, year after year — because the work
                compounds. The team logos below are real.
              </p>
            </header>
            {/* When commonApi has resolved with real brand logos,
                render an image grid (same source as Section02 on
                the homepage). Otherwise fall back to text pills so
                the section is never empty during data load. */}
            {brands?.length > 0 ? (
              <div className="about-partners-logos-grid">
                {brands.map(({ id, brand_image, brand_name }, idx) => (
                  <div
                    key={`${id || idx}-${idx}`}
                    className="about-partners-logo-cell"
                  >
                    {brand_image && (
                      <Image
                        className="about-partners-logo-img"
                        src={brand_image}
                        alt={brand_name || "Partner logo"}
                        width={150}
                        height={60}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="about-partners-logos">
                {PARTNERS_FALLBACK.map((p, idx) => (
                  <span
                    key={idx}
                    className="about-partners-logo-pill font-primary"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            {/* Partner-quotes block removed May 2026 — see PARTNER_QUOTES
                comment at top of file for context + restore path. */}
          </div>
        </section>

        {/* 6. The team — initials-avatar dept-lead cards */}
        <section className="about-team-section">
          <div className="about-team-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">The team</p>
              <h2 className="about-section-heading font-primary">
                Meet the leads.
              </h2>
              <p className="about-section-sub">
                30 editors. 10 designers. 15 marketers. 3 in HR, 3
                keeping infra running. These are the people you'd
                actually be working with.
              </p>
            </header>
            {/* Team cards now read from teamMembers.js (single source
                of truth, also used by /team page). Members with
                consent: true render with full photo + name + role
                + dept; consent: false members render anonymized
                (initials avatar + role + dept only). Curate which
                members appear here by toggling featured: true on
                their entry; aim to keep ~4-6 leads on this preview. */}
            <div className="about-team-grid">
              {getFeaturedMembers().map((m) => (
                <div className="about-team-card" key={m.id}>
                  {m.consent && m.photo ? (
                    <Image
                      src={m.photo}
                      alt={`${m.name}, ${m.role} at Cocoma`}
                      width={200}
                      height={200}
                      className="about-team-photo"
                    />
                  ) : (
                    <span
                      className="about-team-avatar font-primary"
                      aria-hidden="true"
                    >
                      {m.initials}
                    </span>
                  )}
                  {/* Card body is name + dept only (role dropped —
                      several roles included the dept word verbatim
                      e.g. "Video Editing Lead" + "Video Editing"
                      beneath, which read as filler. Role still
                      kept on the data object + still used in the
                      alt attribute above for accessibility/SEO. */}
                  <div className="about-team-card-body">
                    {m.consent && m.name && (
                      <p className="about-team-card-name font-primary">
                        {m.name}
                      </p>
                    )}
                    <p className="about-team-card-dept">{m.dept}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* "Meet the full team" cross-link to the dedicated
                /team page — same idiom as the "See the full Gallery"
                link below the photo wall. */}
            <p className="about-team-link-line">
              <Link to="/team" className="about-team-link">
                Meet the full team
                <FaArrowRight aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>

        {/* 6.5. Cocoma in the wild — photo gallery.
            Added May 2026. Real photos — international partner
            visits, on-set production, team portraits, edit bay
            mid-flow, studio candids. Sticker design language:
            slight rotation per photo (-1.5° / +1° / -0.5° / +1.5°
            / -1°) so the wall reads as alive, not staged. Caption
            under each photo in display font, slightly muted — like
            polaroid-back notes. Sits between the Team section
            (who works here) and the Culture / Inside Cocoma
            section (how they're treated) so the page sequence is:
            who → them in motion → the system. */}
        <section className="about-gallery-section">
          <div className="about-gallery-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">Cocoma in the wild</p>
              <h2 className="about-section-heading font-primary">
                What it actually looks like.
              </h2>
              <p className="about-section-sub">
                International partners visiting the studio. Team
                mid-shoot. Edit bay mid-flow. Studio life on a
                regular Tuesday.
              </p>
            </header>

            {/* Featured photos rendered from the shared galleryPhotos
                data file. The first photo in featuredPhotos becomes
                the visual feature (2x2 grid span) — the rest fill
                naturally. To swap which photo is the feature, reorder
                the entries in galleryPhotos.js (or toggle featured:
                true/false on individual photos). */}
            <div className="about-gallery-grid">
              {featuredPhotos.map((photo, idx) => (
                <figure
                  key={photo.src}
                  className={
                    idx === 0
                      ? "about-gallery-item about-gallery-item--feature"
                      : "about-gallery-item"
                  }
                >
                  <Image
                    src={photo.src}
                    alt={photo.caption}
                    width={600}
                    height={400}
                    style={{ width: "100%", height: "auto" }}
                  />
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>

            {/* "See full gallery" link out to /gallery — the
                dedicated home for all photos including the long
                tail not featured here. */}
            <p className="about-gallery-link-line">
              <Link to="/gallery" className="about-gallery-link">
                See the full Gallery
                <FaArrowRight aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>

        {/* 7. Inside Cocoma — slimmed May 2026. Previously had 8
            benefit tiles + inclusivity narrative; the tiles were
            recruiting content that duplicated /career, so they
            moved out. The inclusivity story (every religion,
            every festival) IS brand and stays here. Benefits
            now cross-linked to /career instead of grid-rendered. */}
        <section className="about-culture-section">
          <div className="about-culture-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">Inside Cocoma</p>
              <h2 className="about-section-heading font-primary">
                What working here looks like.
              </h2>
              <p className="about-section-sub">
                A team from every part of India and beyond. Hindu,
                Muslim, Christian, Sikh, Buddhist — every festival
                is somebody's, so we celebrate every festival.
              </p>
            </header>

            <p className="about-culture-emphasis font-primary">
              It's the studio I'd want to work at — so we built it
              that way.
            </p>

            <p className="about-culture-link-line">
              See the full benefits + open roles in{" "}
              <Link to="/career">Careers</Link>
              <FaArrowRight aria-hidden="true" style={{ marginLeft: 6, fontSize: "0.85em" }} />
            </p>
          </div>
        </section>

        {/* 8. What we won't do */}
        <section className="about-wontdo-section">
          <div className="about-wontdo-inner">
            <header className="about-section-header">
              <p className="about-section-eyebrow">What we won't do</p>
              <h2 className="about-section-heading font-primary">
                The work we turn away.
              </h2>
              <p className="about-section-sub">
                Clearer than any positioning statement. If any of
                these matters to you, we should talk.
              </p>
            </header>
            <ul className="about-wontdo-list">
              {WONT_DO.map((item, idx) => (
                <li className="about-wontdo-item" key={idx}>
                  <span
                    className="about-wontdo-cross"
                    aria-hidden="true"
                  >
                    ×
                  </span>
                  <div className="about-wontdo-body">
                    <h3 className="about-wontdo-title font-primary">
                      {item.title}
                    </h3>
                    <p className="about-wontdo-text">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 9. Closer — same pattern as /success-story-view-all */}
        <section className="about-closer-section home-book-call-container-wrapper">
          <div className="about-closer">
            <div className="about-closer-body">
              <p className="about-closer-eyebrow">Want to see if we're a fit?</p>
              <h2 className="about-closer-title font-primary">
                Let's talk.
              </h2>
              <p className="about-closer-sub">
                Pick a 15-minute slot — I'll take the call myself.
                Walk away with a clear shape of what we'd do for you,
                whether or not we end up working together.
              </p>
            </div>
            <Link to="/ScheduleMeeting" className="about-closer-cta">
              Book a call
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
      <FloatingCallChip />
    </>
  );
};

export default AboutUs;
