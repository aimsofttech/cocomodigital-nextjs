// @ts-nocheck
"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import Slider from "react-slick";
const DevelopmentHouseShowcase = ({ DevelopmentHouseData }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    if (DevelopmentHouseData?.development_house) {
      const allCategories = [
        "All",
        ...DevelopmentHouseData.development_house.map(
          (cat) => cat.development_house_category_name
        ),
      ];
      setCategories(allCategories);
      setFilteredItems(DevelopmentHouseData.development_house);
    }
  }, [DevelopmentHouseData]);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredItems(DevelopmentHouseData.development_house);
    } else {
      const categoryData = DevelopmentHouseData.development_house.find(
        (cat) => cat.development_house_category_name === selectedCategory
      );
      setFilteredItems(categoryData ? [categoryData] : []);
    }
  }, [selectedCategory, DevelopmentHouseData]);

  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5">
      <h2 className="font-bold">SEE WHAT'S NEW</h2>
      <h3 className="font-bold">OUR DEVELOPMENT HOUSE</h3>

      <Slider {...sliderSettings} className="SliderCustom-width">
        {categories.map((category, index) => (
          <button
            key={index}
            onClick={() => setSelectedCategory(category)}
            className={`cat-filter-button inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 w-auto ${selectedCategory === category
              ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600]"
              : "border-neutral-400 bg-transparent text-neutral-700 hover:bg-neutral-100"
              } my-1 mr-2`}
          >
            {category}
          </button>
        ))}
      </Slider>

      <div className="flex flex-wrap -mx-3 mt-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((category) =>
            category.items.length > 0
              ? category.items.map((item) => (
                <div key={item.id} className="md:w-1/3 md:px-3 sm:w-1/2 sm:px-3 w-full px-3 mb-4">
                  <div className="rounded border border-neutral-200 bg-white h-full">
                    {item.development_house_img && <Image
                      src={item.development_house_img}
                      className="w-full rounded-t object-cover"
                      alt="Development Work"
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto" }}
                    />}
                    <div className="p-4 text-center">
                      <h5 className="font-semibold leading-snug">Development Work</h5>
                      <Link
                        href={item.development_house_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-black text-white hover:bg-neutral-800"
                      >
                        Explore Now <i className="bi bi-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
              : null
          )
        ) : (
          <div className="w-full px-3 text-center">
            <p className="text-neutral-500">No items available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevelopmentHouseShowcase;
