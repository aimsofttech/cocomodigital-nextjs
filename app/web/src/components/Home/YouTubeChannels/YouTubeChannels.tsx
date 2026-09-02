// @ts-nocheck
"use client";
// YouTubeChannels.jsx
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import { adminRoutes } from "@/src/lib/adminEditRoutes";

interface YoutubeChannelItem {
  /** The home-page-section-item record behind this card. */
  id?: string;
  image?: string;
  name?: string;
  path?: string;
}

interface YouTubeChannelsProps {
  title?: string;
  /** The home-page-section record this rail is grouped from. Each rail on
   *  the homepage — "60+ YouTube Channels Transformed & Counting", "150+
   *  Web-Series promoted & counting", "Talents we're working with" and the
   *  rest — is one such record, with its cards as that record's items. */
  sectionId?: string;
  data?: YoutubeChannelItem[];
  viewAllLink?: string;
}

const YouTubeChannels = ({
  title = "",
  sectionId,
  data = [],
  viewAllLink = "#",
}: YouTubeChannelsProps) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  /**
   * Prepare channel list
   * - Remove last item on mobile if item count is even
   */
  const channels = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const updated = [...data];

    if (isMobile && updated.length % 2 === 0) {
      updated.pop();
    }

    return updated;
  }, [data, isMobile]);

  /**
   * If no channels, don't render component
   */
  if (!channels.length) return null;

  return (
    <div className="home-youtube-channels-main-wrapper">
      <div className="home-youtube-channels-main">
        <h3 className="home-youtube-channels-main-title font-primary text-center edit-host">
          {title}
          {sectionId ? (
            <EditPencil
              to={adminRoutes.home.section(sectionId)}
              label={title || "this rail"}
            />
          ) : null}
        </h3>

        <div className="youtube-channels-grid">
          {channels.map((channel, index) => {
            const imageSrc = channel?.image || "";
            const channelName = channel?.name || "channel";
            const channelPath = channel?.path || "#";

            // Special case
            if (
              title === "60+ YouTube Channels Transformed & Counting"
            ) {
              return (
                <Link
                  key={index}
                  href={channelPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="youtube-channel-card edit-host"
                >
                  {channel?.id ? (
                    <EditPencil
                      asButton
                      to={adminRoutes.home.sectionItem(channel.id)}
                      label={channelName}
                    />
                  ) : null}
                  <div className="youtube-channel-image-wrapper">
                    {imageSrc && <Image
                      src={imageSrc}
                      alt={channelName}
                      className="channel-image"
                      width={300}
                      height={300}
                      style={{ width: "100%", height: "auto" }}
                    />}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={index}
                className="youtube-channel-card edit-host"
              >
                {channel?.id ? (
                  <EditPencil
                    to={adminRoutes.home.sectionItem(channel.id)}
                    label={channelName}
                  />
                ) : null}
                <div className="youtube-channel-image-wrapper">
                  {imageSrc && <Image
                    src={imageSrc}
                    alt={channelName}
                    className="channel-image"
                    width={300}
                    height={300}
                    style={{ width: "100%", height: "auto" }}
                  />}

                  {channel?.name && (
                    <div className="youtube-channel-overlay">
                      <div className="overlay-content">
                        <h4 className="channel-title text-capitalize">
                          {channel.name}
                        </h4>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* View All Card */}
          <Link
            href={viewAllLink}
            className="view-all-card"
          >
            <div className="view-all-card-content">
              <div className="view-all-icon-wrapper">
                <svg
                  className="view-all-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M7 17L17 7M17 7H9M17 7V15"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="view-all-card-title">
                View All
              </h3>

              <p className="view-all-card-subtitle">
                Explore More
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default YouTubeChannels;
