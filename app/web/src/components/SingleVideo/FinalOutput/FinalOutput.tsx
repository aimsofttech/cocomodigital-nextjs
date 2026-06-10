// @ts-nocheck
"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Slider from "react-slick";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import ReactPlayer from "react-player";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

const VideoSlider = ({ FinalOutputData }) => {
  const sliderRef = useRef(null);
  const sliderContent = FinalOutputData?.creative_house_final_output || [];
  // Initialize current video and thumbnail from sliderContent
  const [currentVideo, setCurrentVideo] = useState(
    sliderContent[0]?.video_url || ""
  );
  const [currentThumbnail, setCurrentThumbnail] = useState(
    sliderContent[0]?.thumbnail || ""
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const handleThumbnailClick = (
    video_url,
    thumbnail
  ) => {
    setCurrentVideo(video_url);
    setCurrentThumbnail(thumbnail);
    setIsPlaying(false);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const settings = {
    dots: false,
    infinite: true,
    arrows: false,
    speed: 3000,
    autoplay: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <div className="bg-dark text-white single-video-page-final-output-main-wrapper">
      <div className="single-video-page-final-output-main">
        <h2 className="text-center single-video-how-to-edit-title font-primary">
          Project Media
          <EditLink
            path={`${ADMIN_URL}/home/creative_house/creative_house_final_output`}
          />
        </h2>
        {/* Large Video Section */}
        <div
          className="relative mx-auto my-4"
          style={{ maxWidth: "900px" }}
        >
          {isPlaying && (
            <ReactPlayer
              url={currentVideo}
              controls
              playing
              width="100%"
              height="100%"
              onEnded={handleVideoEnd}
            />
          )}
          {!isPlaying && (
            <div className="relative">
              {currentThumbnail ? (
                <Image
                  src={currentThumbnail}
                  alt="Current thumbnail"
                  className="max-w-full h-auto w-full rounded"
                  width={900}
                  height={506}
                  style={{ width: "100%", height: "auto" }}
                />
              ) : (
                /* Phase 5+ 2026-05-23: avoid empty <img src> when
                   legacy data has no thumbnail for this slide. The
                   spacer keeps the play-btn centred on the same
                   16:9 box. */
                <div
                  className="bg-neutral-800 rounded"
                  style={{ width: "100%", aspectRatio: "16/9" }}
                  aria-hidden="true"
                />
              )}
              <div onClick={() => setIsPlaying(true)}>
                <PlayBtn />
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail Slider */}
        <div>
          <Slider {...settings} ref={sliderRef}>
            {sliderContent?.map((video) => (
              <div key={video?.id} className="px-2">
                <div
                  className="relative"
                  onClick={() => {
                    const videoSrc = video?.upload_video || video?.video_url;
                    handleThumbnailClick(videoSrc, video?.thumbnail);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {video?.thumbnail ? (
                    <Image
                      src={video.thumbnail}
                      alt={video?.title}
                      className="final-output-slider-images"
                      width={300}
                      height={169}
                      style={{ width: "100%", height: "auto" }}
                    />
                  ) : (
                    <div
                      className="final-output-slider-images bg-neutral-700 rounded"
                      style={{ aspectRatio: "16/9" }}
                      aria-hidden="true"
                    />
                  )}
                  {(video?.upload_video ||
                    video?.video_url) && <PlayBtn />}
                </div>
                <p className="text-center mt-2">{video?.title}</p>
              </div>
            ))}
          </Slider>{" "}
        </div>
      </div>
    </div>
  );
};

export default VideoSlider;
