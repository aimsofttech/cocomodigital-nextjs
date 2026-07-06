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
  // Initialize current video and thumbnail from sliderContent. A record may
  // carry an uploaded file (upload_video) OR an external/YouTube URL
  // (video_url) — support both, preferring the uploaded file.
  const [currentVideo, setCurrentVideo] = useState(
    sliderContent[0]?.upload_video || sliderContent[0]?.video_url || ""
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

  /* react-slick breaks when it has fewer slides than `slidesToShow` (it
     clones/stretches the cards) — so the autoplaying slider is only used for
     5+ items. With 1–4 items the same small cards render in a plain
     horizontally-scrollable row, keeping the design identical. */
  const count = sliderContent.length;
  const useSlider = count > 4;

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

  /* One small thumbnail card — shared by the slider and the static row. */
  const renderCard = (video) => (
    <>
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
        {(video?.upload_video || video?.video_url) && <PlayBtn />}
      </div>
      <p className="text-center mt-2">{video?.title}</p>
    </>
  );

  return (
    <div className="bg-dark text-white single-video-page-final-output-main-wrapper">
      <div className="single-video-page-final-output-main">
        <h2 className="text-center single-video-how-to-edit-title font-primary">
          Project Media
          <EditLink
            path={`${ADMIN_URL}/home/creative_house/creative_house_final_output`}
          />
        </h2>
        {/* Large Video Section — a fixed 16:9 box in both states so the
            player never grows/shrinks the layout when playback starts. */}
        <div
          className="relative mx-auto my-4"
          style={{ maxWidth: "900px" }}
        >
          <div className="relative w-full rounded overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
            {isPlaying && currentVideo ? (
              <ReactPlayer
                url={currentVideo}
                controls
                playing
                width="100%"
                height="100%"
                style={{ position: "absolute", top: 0, left: 0 }}
                onEnded={handleVideoEnd}
              />
            ) : (
              <>
                {currentThumbnail ? (
                  <Image
                    src={currentThumbnail}
                    alt="Current thumbnail"
                    className="rounded"
                    width={900}
                    height={506}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  /* Phase 5+ 2026-05-23: avoid empty <img src> when
                     legacy data has no thumbnail for this slide. The
                     spacer keeps the play-btn centred on the same
                     16:9 box. */
                  <div
                    className="bg-neutral-800 rounded absolute inset-0"
                    aria-hidden="true"
                  />
                )}
                {currentVideo && (
                  <div onClick={() => setIsPlaying(true)}>
                    <PlayBtn />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Thumbnail row: autoplaying slider for 5+ items, otherwise the same
            small cards in a horizontally-scrollable row. */}
        {useSlider ? (
          <div>
            <Slider {...settings} ref={sliderRef}>
              {sliderContent?.map((video) => (
                <div key={video?.id} className="px-2">
                  {renderCard(video)}
                </div>
              ))}
            </Slider>{" "}
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2">
            {sliderContent?.map((video) => (
              <div
                key={video?.id}
                className="px-2 flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4"
                style={{ minWidth: "180px" }}
              >
                {renderCard(video)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoSlider;
