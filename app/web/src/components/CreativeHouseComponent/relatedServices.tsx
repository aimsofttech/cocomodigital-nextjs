// @ts-nocheck
"use client";
import React, { useRef } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";

const RelatedServicesSlider = ({ Haddertitle }) => {
  const sliderRef = useRef(null); // Reference to control the slider
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
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
      title: "Movies marketing",
      img: "../../Images/relatedservices.svg",
    },
    {
      title: "Documentry marketing",
      img: "../../Images/relatedservices.svg",
    },
    {
      title: "Podcast marketing",
      img: "../../Images/relatedservices.svg",
    },
    {
      title: "songs marketing",
      img: "../../Images/relatedservices.svg",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5 relative">
      <h1 className="font-bold text-center mb-4">{Haddertitle}</h1>
      <button
        className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 relatedservices-slider-button absolute top-1/2 left-0 -translate-y-1/2"
        style={{ zIndex: 5 }}
        onClick={() => sliderRef.current.slickPrev()}
      >
        <IoIosArrowBack size={30} />
      </button>
      <button
        className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 relatedservices-slider-button absolute top-1/2 right-0 -translate-y-1/2"
        style={{ zIndex: 5 }}
        onClick={() => sliderRef.current.slickNext()}
      >
        <IoIosArrowForward size={30} />
      </button>

      {/* Slider */}
      <Slider ref={sliderRef} {...settings}>
        {cards.map((card, index) => (
          <div key={index} className="p-2">
            <div className=" h-full">
              <Image src={card.img} className="w-full rounded-t object-cover" alt={card.title} width={600} height={400} style={{ width: "100%", height: "auto" }} />
              <div className="p-4 ">
                <h5 className="font-semibold leading-snug">{card.title}</h5>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default RelatedServicesSlider;
