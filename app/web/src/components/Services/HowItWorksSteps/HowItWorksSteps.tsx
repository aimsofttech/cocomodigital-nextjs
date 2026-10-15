// @ts-nocheck
import React from "react";
import { FaSearch } from "react-icons/fa";
import { FiShoppingBag } from "react-icons/fi";
import { BsPersonVideo2 } from "react-icons/bs";
import { AiOutlinePlayCircle } from "react-icons/ai";

/**
 * Section09 — "How does it work?" 4-step process strip.
 *
 * Single JSX path with CSS-driven responsive layout (no
 * separate mobile/desktop branches). Each step renders as its
 * own sticker card — same visual language as the format cards
 * on SingleVideo and the home page service tiles. Big yellow
 * number + icon + title; the numerical sequence carries the
 * "step 1 → 2 → 3 → 4" progression so explicit arrow icons
 * aren't needed.
 */
const DEFAULT_TITLES = [
  "Explore Our Services",
  "Add Suitable Services",
  "Schedule Meeting",
  "Start The Project",
];

/**
 * `steps` — optional four titles, in order, for a page whose process is
 * worded differently (the Design page says "Pick the services"). The
 * numbers and icons stay; every existing call site passes nothing and
 * renders exactly as before.
 */
const HowItWorksSteps = ({ steps: titles = DEFAULT_TITLES } = {}) => {
  const steps = [
    {
      number: "01",
      title: titles[0] ?? DEFAULT_TITLES[0],
      icon: <FaSearch className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "02",
      title: titles[1] ?? DEFAULT_TITLES[1],
      icon: <FiShoppingBag className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "03",
      title: titles[2] ?? DEFAULT_TITLES[2],
      icon: <BsPersonVideo2 className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "04",
      title: titles[3] ?? DEFAULT_TITLES[3],
      icon: <AiOutlinePlayCircle className="how-step-icon" aria-hidden="true" />,
    },
  ];

  return (
    <section
      className="how-it-works"
      aria-labelledby="how-it-works-heading"
    >
      <div className="how-it-works-inner">
        <h2
          className="how-it-works-heading"
          id="how-it-works-heading"
        >
          How does it{" "}
          <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">work</span>?
        </h2>

        <div className="how-it-works-grid">
          {steps.map((step, index) => (
            <div className="how-step-card" key={index}>
              <span className="how-step-number" aria-hidden="true">
                {step.number}
              </span>
              <span className="how-step-icon-wrapper" aria-hidden="true">
                {step.icon}
              </span>
              <h3 className="how-step-title">{step.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSteps;
