// @ts-nocheck
"use client";
import React, { useRef } from "react";
import Image from "next/image";
import Slider from "react-slick";

const SuccessStoriesSlider = ({ successStories = [] }) => {
  const sliderRef = useRef(null); // Reference to control the slider

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
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
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5 relative">
      <h2 className="font-bold mb-4">Youtube SUCCESS STORIES</h2>

      {/* Slider */}
      <Slider ref={sliderRef} {...settings}>
        {successStories.map((story) => (
          <div key={story.id} className="p-2">
            <div className="success-stories-card h-full">
              <Image
                src="../../Images/about/upperDots.svg"
                className="upperDots absolute"
                alt="upper dots"
                width={32}
                height={32}
              />
              <h2 className="font-semibold leading-snug p-3">{story.success_stories_title}</h2>

              <Image
                src={story.success_stories_img}
                className="success-stories-card-img-top p-3"
                alt={story.success_stories_title}
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
              {/* <div className="p-4">
                {story.success_stories_description}
                <br />
                <u>See More</u>
              </div> */}
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default SuccessStoriesSlider;
