// @ts-nocheck
"use client";
import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";
import Slider from "react-slick";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

const ServiceCategoryTabs = ({ ServidcesToShow }) => {
  const services = ServidcesToShow?.services || [];
  const [sliderRef, setSliderRef] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter out "Service Platform" category
  const filteredServices = services?.filter(
    (category) => category?.service_category_name !== "Service Platform"
  );

  const [activeTab, setActiveTab] = useState(filteredServices[0]?.id);
  const activeCategory = filteredServices?.find(
    (category) => category?.id === activeTab
  );

  const [visibleItems, setVisibleItems] = useState(6);

  const showMoreItems = () => {
    setVisibleItems((prev) =>
      Math.min(prev + 3, activeCategory?.service_items?.length || 0)
    );
  };

  const showLessItems = () => {
    setVisibleItems(6);
  };

  const sliderSettings = {
    dots: false,
    infinite: false,
    arrows: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    beforeChange: (current, next) => {
      setCurrentSlide(next);
    },
    afterChange: (index) => {
      setCurrentSlide(index);
    },
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 3 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 425,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 pt-5">
      <div className="flex flex-wrap -mx-3 mt-5">
        <div className="lg:w-full lg:px-3">
          <center>
            <h1 className="all-service-heading-home font-primary">EXPLORE OUR SERVICE</h1>
          </center>
        </div>
      </div>

      <div className="flex flex-wrap -mx-3 mt-3">
        <div className="lg:w-1/12 lg:px-3 md:w-1/6 md:px-3 flex items-end sm:w-1/6 sm:px-3 justify-end w-1/6 px-3">
          <button
            className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 custom-prev-btn"
            onClick={() => sliderRef?.slickPrev()}
            aria-label="Previous"
            disabled={currentSlide === 0}
          >
            <FaAngleLeft size={30} />
          </button>
        </div>
        <div className="lg:w-5/6 lg:px-3 md:w-2/3 md:px-3 sm:w-2/3 sm:px-3 w-2/3 px-3">
          <Slider {...sliderSettings} className="category-slider" ref={setSliderRef}>
            {filteredServices.map((category) => (
              <div key={category.id} className="category-slide relative">
                <button
                  className={`tab-button ${activeTab === category?.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(category.id);
                    setVisibleItems(6); // Reset visible items when switching category
                  }}
                >
                  {category?.service_category_name}
                </button>
              </div>
            ))}
          </Slider>
        </div>
        <div className="lg:w-1/12 lg:px-3 md:w-1/6 md:px-3 flex items-end justify-start sm:w-1/6 sm:px-3 w-1/6 px-3">
          <button
            className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 custom-next-btn"
            onClick={() => sliderRef?.slickNext()}
            aria-label="Next"
            disabled={currentSlide === filteredServices?.length - 1}
          >
            <FaAngleRight />
          </button>
        </div>
      </div>

      {/* Services Section */}
      <div className="flex flex-wrap -mx-3 services mt-2">
        {activeCategory?.service_items?.length > 0 ? (
          activeCategory.service_items.slice(0, visibleItems)?.map((service, index) => (
            <div key={index} className="md:w-1/2 md:px-3 lg:w-1/3 lg:px-3 sm:w-1/2 sm:px-3 w-full px-3 mt-5">
              <div className="service-card pb-4 text-center">
                <Link href={`service/${service.id}`} style={{ width: "100%" }}>
                  {service.service_image && <Image
                    src={service.service_image}
                    alt={service.service_title || ""}
                    className="service-image"
                    width={600}
                    height={400}
                    style={{ width: "100%", height: "auto" }}
                  />}
                </Link>
                <h3>{service.service_title}</h3>
                <button className="explore-button mt-3 mb-3">
                  <Link href={`service/${service.id}`}>
                    {service.service_button_text} <GoArrowUpRight size={24} />
                  </Link>
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center mt-5">No services available for this category.</p>
        )}
      </div>

      {/* Show More and Hide Button */}
      <div className="flex flex-wrap -mx-3 mt-3">
        <div className="lg:w-full lg:px-3 text-center">
          {activeCategory?.service_items &&
            activeCategory.service_items.length > 6 &&
            visibleItems < activeCategory.service_items.length && (
              <button className="show-more-button" onClick={showMoreItems}>
                Show More &nbsp;
                <IoIosArrowDown size={20} />
              </button>
            )}

          {visibleItems > 6 && (
            <button className="show-less-button" onClick={showLessItems}>
              Hide &nbsp;
              <IoIosArrowUp size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCategoryTabs;
