// @ts-nocheck
"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { FaArrowRight } from "react-icons/fa";
import ReactPlayer from "react-player";
import { FaArrowLeft } from "react-icons/fa";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

const CreativeSlider = ({ CreativeSliderData }) => {
  const sliderRef = useRef(null);
  const [playingVideo, setPlayingVideo] = useState(false);

  const videosPlayBtnHandler = () => {
    setPlayingVideo(true);
  };

  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,

    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          dots: false,
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          arrows: false,
          dots: true,
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  // Use creative_house_approach data
  const sliderContent = CreativeSliderData || [];

  return (
    <div className="creative-approach-bg single-video-creative-slid">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20">
        <div className="flex flex-wrap -mx-3">
          <div className="lg:w-full lg:px-3">
            <h1 className="text-center font-bold sm:mb-4 mb-3 single-video-how-to-edit-title font-primary">
              Creative Approach
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap -mx-3">
          <div className="lg:w-1/2 lg:px-3 md:w-2/3 md:px-3 sm:w-5/6 sm:px-3 w-full px-3 m-auto p-0">
            <Slider {...settings} ref={sliderRef}>
              {sliderContent?.map((item, index) => (
                <div key={index} className="">
                  <div className="slider-image-wrapper relative mb-3">
                    {playingVideo && (
                      <ReactPlayer
                        url={
                          item?.upload_video
                            ? item?.upload_video
                            : item?.video_url
                        }
                        playing={true}
                        controls={true}
                        width="100%"
                        height="400px"
                      />
                    )}
                    {!playingVideo && (
                      <>
                        {item?.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item?.heading}
                            className=""
                            style={{
                              width: "100%",
                              maxHeight: "400px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                            width={600}
                            height={400}
                          />
                        ) : (
                          /* Phase 5+ 2026-05-23: drop the <img> when
                             legacy data has no approach thumbnail (a
                             chunk of items skip this) so Next.js
                             doesn't warn about empty src. Spacer keeps
                             the play-btn position stable. */
                          <div
                            className="bg-neutral-100"
                            style={{
                              width: "100%",
                              maxHeight: "400px",
                              aspectRatio: "16/9",
                              borderRadius: "8px",
                            }}
                            aria-hidden="true"
                          />
                        )}
                        {(item?.upload_video ||
                          item?.video_url) && (
                            <button
                              className="single-video-creative-slid-play-btn"
                              onClick={videosPlayBtnHandler}
                            >
                              <PlayBtn />
                            </button>
                          )}
                      </>
                    )}
                  </div>
                  <div className="single-video-creative-approach-content-wrapper">
                    <div className="single-video-creative-approach-counter-title-wrapper">
                      <h1 className="single-video-creative-approach-counter">
                        {index + 1}
                      </h1>
                      <h4 className="single-video-creative-approach-title edit-host">
                        {item?.heading}
                        <EditPencil
                          to={adminRoutes.creative.approach(item?.creativeHouseItemId, item?.id)}
                          label={item?.heading || "this approach step"}
                        />
                      </h4>
                    </div>
                    <p className="single-video-creative-approach-discription">
                      {item?.description}
                    </p>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
          <div className="lg:w-full lg:px-3 text-right relative">
            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-black text-white hover:bg-neutral-800 creative-approach-arrow-button -translate-y-1/2"
              style={{ zIndex: 5 }}
              onClick={() => sliderRef.current.slickPrev()}
            >
              <FaArrowLeft size={25} />
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-neutral-200 bg-white text-black hover:bg-neutral-100 creative-approach-arrow-button -translate-y-1/2"
              style={{ zIndex: 5 }}
              onClick={() => sliderRef.current.slickNext()}
            >
              <FaArrowRight size={25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeSlider;
