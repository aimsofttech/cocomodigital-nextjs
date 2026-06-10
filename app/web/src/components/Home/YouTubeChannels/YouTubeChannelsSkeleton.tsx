"use client";
// @ts-nocheck
import { useMediaQuery } from "@/src/hooks/useMediaQuery";

const YouTubeChannelsSkeleton = ({ itemCount = 5 }) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  // If mobile and count is even, reduce by 1
  const count =
    isMobile && itemCount % 2 === 0
      ? itemCount - 1
      : itemCount;

  return (
    <div
      className="home-youtube-channels-main-wrapper home-youtube-channels-main-wrapper--skeleton"
      aria-hidden="true"
      aria-busy="true"
    >
      <div className="home-youtube-channels-main">
        {/* Title Skeleton */}
        <div className="ytc-skeleton-title" />

        {/* Cards Skeleton */}
        <div className="youtube-channels-grid">
          {Array.from({ length: count }, (_, index) => (
            <div
              className="ytc-skeleton-card"
              key={index}
            >
              <div className="ytc-skeleton-image" />
            </div>
          ))}

          {/* View All Skeleton Card */}
          <div className="ytc-skeleton-card ytc-skeleton-card--viewall">
            <div className="ytc-skeleton-image" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeChannelsSkeleton;