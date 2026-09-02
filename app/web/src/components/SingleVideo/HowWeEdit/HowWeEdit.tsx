// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import ReactPlayer from "react-player";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

export default function HowWeEdit({ data }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Handler to play the video
  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="single-video-how-to-edit-main edit-bg">
      <h1 className="single-video-how-to-edit-title font-primary edit-host">
        {data?.title}
        <EditPencil
          to={adminRoutes.creative.item(data?.id)}
          label={data?.title || "this creative item"}
        />
      </h1>
      <div className="single-video-image-container">
        {!isPlaying && (
          <div className="relative flex justify-center items-center">
            <Image
              src={
                data?.thumbnail ??
                "/Images/VideoEditing.svg"
              }
              alt="Video Thumbnail"
              className="max-w-full h-auto rounded"
              width={600}
              height={400}
              style={{ width: "100%", height: "auto" }}
            />
            {/* Play Button */}
            {(data?.upload_video ||
              data?.video_url) && (
              <button
                className="absolute single-video-how-to-edit-play-btn"
                onClick={handlePlay}
              >
                <PlayBtn />
              </button>
            )}
          </div>
        )}
        {isPlaying && (
          <div
            className="video-container"
            style={{ position: "relative", paddingTop: "56.25%" }}
          >
            <ReactPlayer
              url={
                data?.upload_video
                  ? data?.upload_video
                  : data?.video_url
              }
              controls
              playing={true}
              width="100%"
              height="100%"
              style={{ position: "absolute", top: 0, left: 0 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
