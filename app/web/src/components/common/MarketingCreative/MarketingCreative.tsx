// @ts-nocheck
import { useEffect, useRef } from "react";
import SlideNav from "../SlideNav/SlideNav";
import ServiceCard from "../ServiceCard/ServiceCard";
import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import PrimaryLink from "../PrimaryLink/PrimaryLink";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

const MarketingCreative = ({
  categories,
  activeCategoryId,
  setActiveCategoryId,
  title,
  mainTitle,
  viewAllPath,
  cardData
}) => {
  const cardsContainerScrollRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 576px)");


  useEffect(() => {
    if (cardsContainerScrollRef?.current) {
      cardsContainerScrollRef?.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [activeCategoryId]);

  return (
    <>
      <div className="marketing-creative-main">
        <div className="marketing-creative-title-subtitle-all-wrapper">
          <div className="marketing-creative-title-subtitle-wrapper">
            <h3 className="uppercase text-neutral-500 marketing-creative-title font-primary">
              {title}
            </h3>
            <h2 className="font-bold marketing-creative-subtitle font-primary">
              {mainTitle}
              <EditLink
                path={`${ADMIN_URL}/home/marketing/marketing_house_category`} />
            </h2>
          </div>
          {!isMobile && (
            <Link href="/marketing-portfolio">
              <button className="view-all-button-new">
                View All <GoArrowUpRight size={20} style={{ strokeWidth: 1 }} />
              </button>
            </Link>
          )}
        </div>
        <div className="home-slide-nav-all-card-main-wrapper">
          <SlideNav
            categories={categories}
            activeCategoryId={activeCategoryId}
            setActiveCategoryId={setActiveCategoryId}
          />
          <div
            ref={cardsContainerScrollRef}
            className="home-slide-allcard-wrapper"
          >
            <ServiceCard filteredItems={cardData} />
          </div>
        </div>
        {isMobile && <PrimaryLink path={viewAllPath} />}
      </div>
    </>
  );
};

export default MarketingCreative;
