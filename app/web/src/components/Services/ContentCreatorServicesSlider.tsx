// @ts-nocheck
"use client";
import React, { useRef } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { IoIosArrowForward } from "react-icons/io";

const ContentCreatorServicesSlider = () => {
  const sliderRef = useRef(null); // Reference to control the slider

  const settings = {
    dots: false,
    infinite: true,
    // speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    speed: 3000,
    arrows: false, // Hide default arrows
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const cards = [
    {
      title: "Youtube services",
      img: "../../Images/about/contentCreator.svg",
    },
    {
      title: "Youtube services",
      img: "../../Images/about/contentCreator.svg",
    },
    {
      title: "Youtube services",
      img: "../../Images/about/contentCreator.svg",
    },
    {
      title: "Youtube services",
      img: "../../Images/about/contentCreator.svg",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5 relative">
      <h2 className="font-bold mb-4">
        Tailored Services for Diverse Content Creators and Platforms
      </h2>

      {/* Custom Buttons */}
      <button
        className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-neutral-200 bg-white text-black hover:bg-neutral-100 absolute top-1/2 hidden left-0 -translate-y-1/2"
        style={{ zIndex: 5 }}
        onClick={() => sliderRef.current.slickPrev()}
      >
        {/* <IoIosArrowBack size={30} /> */}
      </button>
      <button
        className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-neutral-200 bg-white text-black hover:bg-neutral-100 absolute top-1/2 right-0 -translate-y-1/2"
        style={{ zIndex: 5 }}
        onClick={() => sliderRef.current.slickNext()}
      >
        <IoIosArrowForward size={30} />
      </button>

      {/* Slider */}
      <Slider ref={sliderRef} {...settings}>
        {cards.map((card, index) => (
          <div key={index} className="p-2">
            <div className="rounded border border-neutral-200 bg-white h-full relative">
              <Image src={card.img} className="w-full rounded-t object-cover" alt={card.title} width={600} height={400} style={{ width: "100%", height: "auto" }} />
              <div
                className="card-title-overlay"
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "#fff",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {card.title}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default ContentCreatorServicesSlider;
