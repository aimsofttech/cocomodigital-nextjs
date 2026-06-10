// @ts-nocheck
"use client";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const SocialWorkSlider = () => {
  const carouselRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  const cards = [
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
    {
      image: "../../Images/about/socialWork.svg",
      title: "Lorem Ipsum",
      text: "Lorem Ipsum Dolor Sit Amet Consectetur. Non To",
    },
  ];

  const updateButtonVisibility = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateButtonVisibility();
  }, []);

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
          <h1 className="text-center font-bold mb-4">Instagram</h1>
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
            {cards?.map((card, index) => (
              <div key={index} className="rounded border border-neutral-200 bg-white">
                <Image
                  src={card.image}
                  className="w-full rounded-t object-cover"
                  alt={card.title}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />
                <div className="p-2">
                  <h5 className="font-semibold leading-snug">{card?.title}</h5>
                  <p className="card-text">{card?.text}</p>
                </div>
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

export default SocialWorkSlider;
