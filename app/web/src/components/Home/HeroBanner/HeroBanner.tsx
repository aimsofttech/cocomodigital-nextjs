"use client";
import Image from "next/image";
import SecondaryLink from "../../common/SecondaryLink/SecondaryLink";
import EditLink from "../../Edit-Link/Edit-Link";
import { lazy, Suspense, useState } from "react";

const ReactPlayer = lazy(() => import("react-player"));

export default function HeroBanner({ data }) {
  const { heading, subHeading, image, videoUrl, btnText, adminPath } =
    data || {};

  // Must start muted for autoplay
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="home-hero-row">
      <div className="home-hero-video-col">
        <div className="section-image-01">
          {videoUrl && (
            <div className="video-wrapper">
              {/* Suspense fallback is a black filler matching the
                  video frame so the layout doesn't reflow when
                  the lazy chunk arrives. */}
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
                  url={videoUrl}
                  playing
                  loop
                  muted={isMuted}
                  volume={isMuted ? 0 : 1}
                  controls={false}
                  playsinline
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                  className="react-player"
                  config={{
                    youtube: {
                      playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        controls: 0,
                        showinfo: 0,
                        rel: 0,
                        iv_load_policy: 3,
                        fs: 0,
                        disablekb: 1
                      },
                    },
                  }}
                />
              </Suspense>
              {/* 🔊 Mute / Unmute Button */}
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="mute-btn"
              >
                {!isMuted ? "🔊" : "🔇"}
              </button>
            </div>
          )}
          {
            (!videoUrl && image) && (
              /* Banner is above-the-fold hero on Home + every
                 /services/:slug page — eager load + high fetch
                 priority so it paints with the rest of the LCP
                 surface. Was loading="lazy" which deferred the
                 fetch behind everything else and made the page
                 feel slow even after the API returned. */
              <Image
                src={image}
                className="max-w-full h-auto w-full"
                alt="banner-image"
                width={1920}
                height={1080}
                priority
                style={{ width: "100%", height: "auto" }}
              />
            )
          }
        </div>
      </div>

      {/* Text column. Was wrapping a duplicate button instance below
          the row to handle the cramped 576-768 range; now that we
          stack at 768, a single button inside the text column works
          at every size — duplicate removed. */}
      <div className="home-hero-content-col home-section-content-wrapper">
        <div className="section-heading-01">
          {heading}
          <EditLink path={adminPath} />
        </div>

        <div className="section-title-01">{subHeading}</div>

        <div className="home-hero-cta-wrapper">
          {btnText && (
            <SecondaryLink path="/ScheduleMeeting" title={btnText} />
          )}
        </div>
      </div>
    </div>
  );
}
