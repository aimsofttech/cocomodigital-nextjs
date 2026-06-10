// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import { getAllMembers, TEAM_MEMBERS } from "./teamMembers";

/**
 * /team — full team grid.
 *
 * Built May 2026 as Stage 1 of the team system. Reads from the
 * shared teamMembers.js data file (same source the /about-us
 * "60 people..." preview consumes). One file = one source of
 * truth for both surfaces.
 *
 * Stage 1 (this build):
 *   - Hero with eyebrow + title + sub
 *   - Grid of team cards: photo + name + role + dept
 *   - Privacy-respecting: members with consent: false render as
 *     anonymized initials cards (no name, no photo)
 *   - Closing book-call CTA
 *
 * Stage 2 (planned, when count grows past ~15):
 *   - Filter chips by department (Editing / Design / Marketing /
 *     HR / etc.)
 *   - Optional: /team/<id> individual profile pages
 *   - Search by name
 *
 * AI/LLM citation: emits CollectionPage JSON-LD anchored to the
 * sitewide Organization. Per-person Person JSON-LD entities can be
 * added in a later pass once volume justifies it.
 */
export default function Team() {
  const members = getAllMembers();
  const totalMembers = TEAM_MEMBERS.length;

  const teamSchema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "The Cocoma Team",
      "url": "https://cocomadigital.com/team",
      "description": `The 60-person Cocoma team — the people who actually do the work. ${totalMembers} leads + specialists currently on the page.`,
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
          "name": "Team",
          "item": "https://cocomadigital.com/team",
        },
      ],
    },
  ];

  return (
    <>

      <div className="team-page">
        <section className="team-hero-section">
          <div className="team-hero-inner">
            <p className="team-hero-eyebrow">The team</p>
            <h1 className="team-hero-title font-primary">
              The people who actually do the work.
            </h1>
            <p className="team-hero-sub">
              Most are self-taught. Most aren't from Mumbai. Most
              came in without a portfolio anyone in this industry
              would recognize. All of them now ship globally-graded
              work.
            </p>
            <p className="team-hero-meta">
              Showing <strong>{totalMembers}</strong> leads + specialists.
              More added as new joiners arrive.
            </p>
          </div>
        </section>

        <section className="team-grid-section">
          <div className="team-grid-inner">
            <div className="team-grid">
              {members.map((m) => (
                <article key={m.id} className="team-card">
                  {m.consent && m.photo ? (
                    /* Consented members render with full photo +
                       name + role + dept. The yellow background of
                       Cocoma's house headshot style means the
                       photo IS the sticker — no extra accent
                       needed. */
                    /* Consented members render with full photo +
                       name + dept. Role used to render between
                       name and dept, but for several leads the
                       role text contained the dept word verbatim
                       ("Video Editing Lead" + "Video Editing"
                       below it), which read as duplication.
                       Simplified to name + dept only. Role still
                       lives on the data object — used in the
                       image alt for accessibility/SEO. */
                    <>
                      <div className="team-card-photo-wrap">
                        <Image
                          src={m.photo}
                          alt={`${m.name}, ${m.role} at Cocoma`}
                          width={300}
                          height={300}
                          className="team-card-photo"
                          style={{ width: "100%", height: "auto" }}
                        />
                      </div>
                      <div className="team-card-body">
                        <p className="team-card-name font-primary">
                          {m.name}
                        </p>
                        <p className="team-card-dept">{m.dept}</p>
                      </div>
                    </>
                  ) : (
                    /* Anonymized fallback for members who haven't
                       opted in to public publication. Initials
                       avatar (yellow chip) + dept only. Same
                       name+dept simplification as the consented
                       path above. */
                    <>
                      <div className="team-card-initials-wrap">
                        <span
                          className="team-card-initials font-primary"
                          aria-hidden="true"
                        >
                          {m.initials}
                        </span>
                      </div>
                      <div className="team-card-body">
                        <p className="team-card-dept">{m.dept}</p>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="team-cta-section">
          <div className="team-cta-inner">
            <h2 className="team-cta-heading font-primary">
              Want to join the team?
            </h2>
            <p className="team-cta-sub">
              We hire for hunger, not credentials. Most of our team
              came in without industry connections — and now they
              ship for some of the biggest entertainment brands in
              India.
            </p>
            <Link to="/career" className="team-cta-button">
              See open roles
            </Link>
          </div>
        </section>
      </div>

      <FloatingCallChip />
    </>
  );
}
