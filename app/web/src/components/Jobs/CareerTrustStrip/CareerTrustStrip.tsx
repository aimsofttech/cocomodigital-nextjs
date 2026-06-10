// @ts-nocheck
import React from "react";
import {
  FaShieldAlt,
  FaPiggyBank,
  FaClock,
  FaTrophy,
  FaUmbrellaBeach,
  FaExchangeAlt,
  FaHandHoldingHeart,
  FaUserClock,
  FaLaptopHouse,
  FaUtensils,
  FaCoffee,
  FaHandshake,
  FaGraduationCap,
  FaRandom,
  FaLanguage,
} from "react-icons/fa";
/**
 * <CareerTrustStrip />
 *
 * "Why join Cocoma" perks grid used on the careers entry page
 * (/career) and the individual job posting page (/job/:slug).
 *
 * Replaces the earlier 4-card "team size / years / location /
 * founder-led" generic facts with the actual list of perks Anil
 * shipped: 10 concrete benefits a candidate gets day one. Concrete
 * + specific reads more honest than abstract culture claims.
 *
 * Layout: auto-fill sticker tile grid — 5 cols on wide desktop,
 * 4 on mid, 2 on phones. Each tile is a yellow icon chip + short
 * label. Sticker treatment matches the page-wide visual family.
 */

// Edit-once source of truth for the perks shown across /career
// and /job. Copy is warm + concrete + parallel — each
// label answers the silent candidate question "what do I
// actually get?" in ~5 words.
//
// Ordering tells a story candidates evaluate in roughly this
// sequence:
//   1-3  Money / safety       — insurance, statutory, overtime
//   4-8  Time off + flexibility — leaves, period, hours, location
//   9-10 Daily life            — lunch, snacks
//   11-14 Culture & growth     — inclusive, learning, mobility, lingual
const PERKS = [
  // Money + safety
  { icon: FaShieldAlt,        label: "Health insurance covered" },
  { icon: FaPiggyBank,        label: "PF & ESI covered" },
  { icon: FaClock,            label: "Paid overtime, every hour" },
  { icon: FaTrophy,           label: "Bonuses for outstanding work" },

  // Time off + flexibility
  { icon: FaUmbrellaBeach,    label: "18 paid leaves a year" },
  { icon: FaExchangeAlt,      label: "Encash or swap your leaves" },
  { icon: FaHandHoldingHeart, label: "Period leave or WFH for female employees" },
  { icon: FaUserClock,        label: "Flexible working hours" },
  { icon: FaLaptopHouse,      label: "Remote, hybrid or on-site" },

  // Daily life
  { icon: FaUtensils,         label: "Daily lunch, on us" },
  { icon: FaCoffee,           label: "Unlimited snacks, handmade tea & coffee" },

  // Culture + growth
  { icon: FaHandshake,        label: "Inclusive, friendly culture" },
  { icon: FaGraduationCap,    label: "Always learning, always shipping" },
  { icon: FaRandom,           label: "Move across teams freely" },
  { icon: FaLanguage,         label: "Multi-lingual, multi-city team" },
];

export default function CareerTrustStrip() {
  return (
    <section
      className="career-trust-strip"
      aria-labelledby="career-trust-heading"
    >
      <div className="career-trust-inner">
        <h2 className="career-trust-heading" id="career-trust-heading">
          Why join <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">Cocoma</span>
        </h2>

        <div className="career-trust-grid">
          {PERKS.map((perk, idx) => {
            const Icon = perk.icon;
            return (
              <div className="career-trust-card" key={idx}>
                <span className="career-trust-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                <div className="career-trust-card-label">{perk.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
