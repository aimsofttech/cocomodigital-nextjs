// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const OurStoryMission = ({ data }) => {
  const carouselRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

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
    <div className="mt-5 about-us-section-main-wrapper">
      <div className="about-us-section-main">
        <div className="about-us-third-section-slider-content-wrapper">
          <h1>{data?.title}</h1>
          <p>{data?.description}</p>
        </div>
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
            className="about-cards-wrapper"
            ref={carouselRef}
            onScroll={updateButtonVisibility}
          >
            {data?.images.map((image) => (
              <div key={image.id} className="rounded border border-neutral-200 bg-white">
                <Image
                  src={image.url}
                  alt={`Slide ${image.id}`}
                  className="w-full"
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            ))}
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
      </div>
    </div>
  );
};

export default OurStoryMission;
