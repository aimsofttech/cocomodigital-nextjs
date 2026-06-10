// @ts-nocheck
import { FaHandshake, FaUsers } from "react-icons/fa";
import HireOrJoin from "../../SingleVideo/HireOrJoin/HireOrJoin";
import type { HireUsItem } from "../../../lib/homeServerFetch";

interface BusinessCareerSectionProps {
  hireUsItems: HireUsItem[];
}

const BusinessCareerSection = ({ hireUsItems }: BusinessCareerSectionProps) => {
  if (!hireUsItems.length) {
    return (
      <div
        className="home-section-skeleton home-section-skeleton--hire-join"
        aria-hidden="true"
      />
    );
  }

  const cards = hireUsItems.map((item, index) => {
    const isPrimary = index === 0;
    return {
      variant: isPrimary ? "primary" : "secondary",
      icon: isPrimary ? FaHandshake : FaUsers,
      tag: isPrimary
        ? "For brands & agencies"
        : "For creators & specialists",
      title:
        item?.user_choice_title ||
        (isPrimary ? "Hire Cocoma" : "Join Cocoma"),
      pitch: item?.user_choice_description,
      ctaText:
        item?.user_choice_button_text ||
        (isPrimary ? "Book a 15-min call" : "See open roles"),
      to: isPrimary ? "/ScheduleMeeting" : "/career",
    };
  });

  return <HireOrJoin cards={cards} />;
};

export default BusinessCareerSection;
