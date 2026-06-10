// @ts-nocheck
"use client";
import Image from "next/image";
import { ADMIN_URL } from "../../../utils/constant";
import EditLink from "../../Edit-Link/Edit-Link";
import { Suspense, lazy, useMemo } from "react";
import StatsSection from "../StatsSection/StatsSection";

// Lazy load ReactPlayer for performance
const ReactPlayer = lazy(() => import("react-player"));

const GrowthVideoStats = ({ VideoData = {} }) => {
  // Memoize video URL
  const videoUrl = useMemo(() => VideoData?.video_url || "", [VideoData?.video_url]);
  const videoThumbnail = VideoData?.video_thumbnail || "";

  return (
    <div className="home-video-main-wrapper">
      <div className="home-video-main">
        <h1 className="home-video-section-title font-primary">
          Growth at a glance
          <EditLink path={`${ADMIN_URL}/home/video/show/${VideoData?.id}`} />
        </h1>

        <StatsSection />

        {videoUrl ? (
          <div className="video-wrapper">
            <Suspense fallback={<div className="video-fallback" />}>
              <ReactPlayer
                url={videoUrl}
                playing
                loop
                muted
                controls={false}
                width="100%"
                height="auto"
                playsinline
                config={{
                  file: { attributes: { preload: "none" } },
                }}
              />
            </Suspense>
          </div>
        ) : (
          <div className="w-full flex justify-center content-center">
            {videoThumbnail && <Image className="max-w-full h-auto" src={videoThumbnail} alt="video-thumbnail" width={1280} height={720} style={{ width: "100%", height: "auto" }} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthVideoStats;
