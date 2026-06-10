import Link from "next/link";
import { FaHandshake, FaUsers, FaArrowRight } from "react-icons/fa";

const FALLBACK_CARDS = [
  {
    variant: "primary",
    icon: FaHandshake,
    tag: "For brands & agencies",
    title: "Hire Cocoma",
    pitch:
      "60-person in-house team. Same-week start. Dedicated PM. From short-form reels to full trailer production.",
    ctaText: "Book a 15-min call",
    to: "/ScheduleMeeting",
  },
  {
    variant: "secondary",
    icon: FaUsers,
    tag: "For creators & specialists",
    title: "Join Cocoma",
    pitch:
      "Editors, designers, animators, motion artists — we're hiring across India and remote. ~60 in-house, growing.",
    ctaText: "See open roles",
    to: "/career",
  },
];

export default function HireOrJoin({ cards = FALLBACK_CARDS, heading }) {
  return (
    <section className="hire-or-join" aria-labelledby="hire-or-join-heading">
      <div className="hire-or-join-inner">
        <h2 className="hire-or-join-heading" id="hire-or-join-heading">
          {heading || (
            <>
              Two ways to work with{" "}
              <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">Cocoma</span>
            </>
          )}
        </h2>

        <div className="hire-or-join-grid">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                href={card.to}
                className={`hire-or-join-card hire-or-join-card--${card.variant}`}
              >
                <span className="hire-or-join-card-tag">{card.tag}</span>
                <span className="hire-or-join-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                <h3 className="hire-or-join-card-title">{card.title}</h3>
                <p className="hire-or-join-card-pitch">{card.pitch}</p>
                <span className="hire-or-join-card-cta">
                  {card.ctaText}
                  <FaArrowRight aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
