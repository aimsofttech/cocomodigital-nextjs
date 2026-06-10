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
const HowItWorksSteps = () => {
  const steps = [
    {
      number: "01",
      title: "Explore Our Services",
      icon: <FaSearch className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "02",
      title: "Add Suitable Services",
      icon: <FiShoppingBag className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "03",
      title: "Schedule Meeting",
      icon: <BsPersonVideo2 className="how-step-icon" aria-hidden="true" />,
    },
    {
      number: "04",
      title: "Start The Project",
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
