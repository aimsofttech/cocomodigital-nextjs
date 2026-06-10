// @ts-nocheck
import { useRef, useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ServiceCards from "./ServiceCards";

const CardCarousel = ({ data }) => {
  const carouselRef = useRef(null);
  // SSR-safe: both start false (server default), updated after hydration.
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 650px)");
    const mqTablet = window.matchMedia("(max-width: 1024px)");
    setIsMobile(mqMobile.matches);
    setIsTablet(mqTablet.matches);
    const onMobile = (e) => setIsMobile(e.matches);
    const onTablet = (e) => setIsTablet(e.matches);
    mqMobile.addEventListener("change", onMobile);
    mqTablet.addEventListener("change", onTablet);
    return () => {
      mqMobile.removeEventListener("change", onMobile);
      mqTablet.removeEventListener("change", onTablet);
    };
  }, []);
  // hasOverflow drives the "peek" layout: when there are MORE
  // cards than fit in one viewport row, shrink each card slightly
  // so the next card peeks past the right edge. That visual cue
  // (combined with the chevron + edge fade) is what tells users
  // "scroll for more" without a separate "+more" button. When
  // there are exactly the row-fitting count or fewer, stay at the
  // default flex-basis so the row reads as a complete grid.
  const hasOverflow = isTablet
    ? (data?.length || 0) > 2
    : (data?.length || 0) > 3;
  const [showLeftButton, setShowLeftButton] = useState(false);
  // Seed showRightButton from hasOverflow so the right chevron +
  // fade-right mask render on first paint exactly when there's
  // real overflow. Otherwise the previous default-true caused a
  // brief edge-fade flicker on every 2- or 3-card section before
  // the post-mount measurement corrected it to false.
  const [showRightButton, setShowRightButton] = useState(hasOverflow);

  const updateButtonVisibility = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateButtonVisibility();
  }, [data]);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const cardWidth = container.offsetWidth;
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;

      container.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
      setTimeout(updateButtonVisibility, 300);
    }
  };

  return (
    <>
      {!isMobile ? (
        <div className="carousel-container">
          {showLeftButton && (
            <button
              className="service-scroll-button left"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <FaChevronLeft size={22} />
            </button>
          )}

          <div
            className={[
              "cards-wrapper",
              hasOverflow ? "has-overflow" : "",
              showLeftButton ? "fade-left" : "",
              showRightButton ? "fade-right" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            ref={carouselRef}
            onScroll={updateButtonVisibility}
          >
            {data?.map((item, index) => {
              return (
                <ServiceCards key={index} data={item} />
              );
            })}
          </div>
          {showRightButton && (
            <button
              className="service-scroll-button right"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <FaChevronRight size={22} />
            </button>
          )}
        </div>
      ) : (
        <div className="service-slider-mobile-wrapper">
          {data?.map((item, index) => {
            return (
              <ServiceCards key={index} data={item} />
            );
          })}
        </div>
      )}
    </>
  );
};

export default CardCarousel;
