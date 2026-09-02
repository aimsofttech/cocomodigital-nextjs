// @ts-nocheck
"use client";
import Image from "next/image";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import EditPencil from "../../common/EditPencil/EditPencil";
import { Suspense, lazy, useMemo } from "react";
import StatsSection, { StatItem } from "../StatsSection/StatsSection";

// Lazy load ReactPlayer for performance
const ReactPlayer = lazy(() => import("react-player"));

const GrowthVideoStats = ({ VideoData = {}, stats = [] }: { VideoData?: any; stats?: StatItem[] }) => {
  // Memoize video URL
  const videoUrl = useMemo(() => VideoData?.video_url || "", [VideoData?.video_url]);
  const videoThumbnail = VideoData?.video_thumbnail || "";

  return (
    <div className="home-video-main-wrapper">
      <div className="home-video-main">
        <h1 className="home-video-section-title font-primary edit-host">
          Growth at a glance
          <EditPencil to={adminRoutes.home.video(VideoData?.id)} label="the growth video" />
        </h1>

        <StatsSection stats={stats} />

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
