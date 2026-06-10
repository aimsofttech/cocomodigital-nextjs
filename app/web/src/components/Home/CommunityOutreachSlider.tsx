// @ts-nocheck
"use client";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import Slider from "react-slick";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";

const CommunityOutreachSlider = ({ SocialWorkData }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const sliderRef = useRef(null);
  const categoryRef = useRef(null);

  useEffect(() => {
    if (SocialWorkData?.social_work) {
      const allCategories = [
        "All",
        ...SocialWorkData.social_work
          .filter((cat) => cat.social_work_category_name !== "All")
          .map((cat) => cat.social_work_category_name),
      ];
      setCategories(allCategories);
      setFilteredItems(SocialWorkData.social_work.flatMap((cat) => cat.items));
    }
  }, [SocialWorkData]);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredItems(SocialWorkData.social_work.flatMap((cat) => cat.items));
    } else {
      const categoryData = SocialWorkData.social_work.find(
        (cat) => cat.social_work_category_name === selectedCategory
      );
      setFilteredItems(categoryData?.items || []);
    }
  }, [selectedCategory, SocialWorkData]);

  const settings = {
    infinite: false, // Disable infinite scroll
    speed: 500,
    arrows: false,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  // const handleCategoryScroll = (direction) => {
  //   if (categoryRef.current) {
  //     categoryRef.current.scrollBy({
  //       left: direction === "left" ? -150 : 150,
  //       behavior: "smooth",
  //     });
  //   }
  // };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5 relative">
      <div className="flex flex-wrap -mx-3">
        <div className="lg:w-11/12 lg:px-3">
          <h3
            className="uppercase text-neutral-500 mb-3"
            style={{ fontSize: "20px" }}
          >
            SEE WHAT'S NEW
          </h3>
          <h2 className="font-bold">Social Work</h2>
        </div>
      </div>

      {/* Draggable Categories Section */}
      <div className="relative mb-3">
        <div
          ref={categoryRef}
          className="flex overflow-auto  cat-filter-scrollbar"
          style={{ gap: "10px", scrollBehavior: "smooth" }}
        >
          {categories.map((category, index) => (
            <button
              key={index}
              onClick={() => setSelectedCategory(category)}
              className={`cat-filter-button inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${selectedCategory === category ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600]" : "border-neutral-200 bg-white text-black hover:bg-neutral-100"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Slider for Items */}
      {filteredItems.length > 0 ? (
        <>
          <button
            className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600] absolute top-1/2 left-0 -translate-y-1/2"
            style={{
              zIndex: 5,
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => sliderRef.current.slickPrev()}
          >
            <IoIosArrowBack size={24} />
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600] absolute top-1/2 right-0 -translate-y-1/2"
            style={{
              zIndex: 5,
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => sliderRef.current.slickNext()}
          >
            <IoIosArrowForward size={24} />
          </button>
          <Slider {...settings} ref={sliderRef}>
            {filteredItems.map((item) => (
              <div key={item.id} className="p-2">
                {item.social_work_img && <Image
                  className="block w-full rounded"
                  src={item.social_work_img}
                  alt={item.social_work_title || ""}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />}
                <h5 className="mt-3">{item.social_work_title}</h5>
              </div>
            ))}
          </Slider>
        </>
      ) : (
        <p>No items available for this category.</p>
      )}
    </div>
  );
};

export default CommunityOutreachSlider;
