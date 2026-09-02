// @ts-nocheck
"use client";
import React, { lazy, Suspense, useState } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

// react-player only loads when the user actually clicks a thumbnail
// to play. Lazy chunk keeps the recent-work strip lightweight on
// initial paint.
const ReactPlayer = lazy(() => import("react-player"));

const RecentlyWorkedWith = ({ RecentWorkData }) => {
  const videoData = RecentWorkData || [];
  const sliderRef = React.useRef(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 800,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  return (
    <div className="recent-wrk-main-wrapper">
      <div className="recent-wrk-main">
        <h2 className="font-bold uppercase mb-4 service-page-video-edit-service-title font-primary">
          Recently Worked With
        </h2>
        <div className="w-full relative">
          <button
            className="service-scroll-button left"
            onClick={() => sliderRef.current.slickPrev()}
          >
            <FaChevronLeft size={22} />
          </button>
          <Slider ref={sliderRef} {...settings}>
            {videoData?.map((item) => (
              <div key={item.id} className="sm:px-2 px-1 card-trasnlate">
                <div className="relative">
                  {playingVideo === item?.id ? (
                    <div
                      className="video-container"
                      style={{ position: "relative", paddingTop: "70%" }}
                    >
                      <Suspense
                        fallback={
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "#000",
                            }}
                          />
                        }
                      >
                        <ReactPlayer
                          url={item?.video_url}
                          controls
                          playing={true}
                          width="100%"
                          height="100%"
                          style={{ position: "absolute", top: 0, left: 0 }}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <div
                      className="relative"
                      onClick={() => setPlayingVideo(item?.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <Image
                        src={item?.thumbnail}
                        alt="Video Thumbnail"
                        className="max-w-full h-auto rounded w-full"
                        width={600}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                      />
                      <PlayBtn />
                    </div>
                  )}
                  <div className="absolute top-0 right-0 mr-2 mt-2">
                    <EditPencil
                      bare
                      to={adminRoutes.groupService.recentWork(item?.groupServiceItemId, item?.id)}
                      label={item?.title || "this recent work"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Slider>
          <button
            className="service-scroll-button right"
            onClick={() => sliderRef.current.slickNext()}
          >
            <FaChevronRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecentlyWorkedWith;
