// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import { Link, useParams } from "@/src/lib/navigation";
import Carousel from "@/src/components/common/TailwindCarousel/TailwindCarousel";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import VideoPlayModal from "../../common/videoPlayModal/videoPlayModal";
import Counter from "../../common/counter/counter";
import ReactPlayer from "react-player";

const getHash = (name = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("views")) return "#views";
  if (lower.includes("videos")) return "#videos";
  if (lower.includes("shorts")) return "#shorts";
  return "";
};

const StatBadge = ({ value, name, delay = 0, slug }) => {
  const isVideoOrShort =
    name?.toLowerCase().includes("video") ||
    name?.toLowerCase().includes("short") ||
    name?.toLowerCase().includes("views");

  const BadgeContent = (
    <div
      className="single-web-series-badge-inner"
      data-aos="zoom-in"
      data-aos-delay={delay}
    >
      <div className="single-web-series-badge-text">
        <div className="single-web-series-badge-value font-primary">
          <Counter target={value} />
        </div>
        <div className="single-web-series-badge-label">{name}</div>
      </div>
    </div>
  );

  return isVideoOrShort ? (
    <Link
      to={`/marketing/${slug}${getHash(name)}`}
      state={{ category: name.toLowerCase() }}
      style={{ display: "block", textDecoration: "none" }}
    >
      {BadgeContent}
    </Link>
  ) : (
    BadgeContent
  );
};

export default function SingleWebSeriesData({ itemData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const { highlights_title, highlights_description, highlights } = itemData;
  const { slug } = useParams();

  const handlePlayVideo = (url) => {
    setVideoUrl(url);
    setIsModalOpen(true);
  };

/* Phase 5+ 2026-05-23: filter out slides that have neither an
   image nor a video. Without this filter, a the API row with both
   `image` and `legacyImage` null (and no upload_video / video_url
   either) renders <img src=""> — Next.js warns about empty src
   causing the browser to refetch the page. Drop those slides. */
const sliderImage = [
  ...(itemData?.marketing_video
    ? [
        {
          image: "",
          marketing_video: itemData.marketing_video,
          video_url: "",
        },
      ]
    : []),

  ...(itemData?.poster_image
    ? [
        {
          image: itemData.poster_image,
          upload_video: "",
          video_url: "",
        },
      ]
    : []),

  ...(itemData?.images || []),
].filter(
  (s: any) =>
    s?.marketing_video || s?.image || s?.upload_video || s?.video_url,
);

  return (
    <section className="single-web-series-main-wrapper">
      <div className="single-web-series-main">

        {/* ================== HIGHLIGHTS / STATS SECTION ================== */}
        {(highlights_title || highlights_description || highlights?.length > 0) &&
          <div className="w-full">
            <h1 className="single-web-series-heading font-primary edit-host">
              {highlights_title}
              <EditPencil
                to={adminRoutes.marketing.item(itemData?.id)}
                label="the highlights heading"
              />
            </h1>

            <div className={`${highlights?.length > 3
              ? "single-web-series-content-stats-wrapper-full"
              : "single-web-series-content-stats-wrapper-half"
              }`}>

              {/* LEFT TEXT */}
              {(highlights_title || highlights_description) &&
                <div className={`${highlights?.length > 3
                  ? "single-web-series-text-section-full"
                  : "single-web-series-text-section-half"
                  }`}>
                  <p className="single-web-series-description">
                    {highlights_description}
                  </p>
                </div>
              }

              {/* RIGHT STATS */}
              {highlights?.length > 0 &&
                <div className={`${highlights?.length > 3
                  ? "single-web-series-stats-section-full"
                  : "single-web-series-stats-section-half"
                  }`}>
                  <div className={`flex flex-wrap ${highlights?.length > 3
                    ? "justify-start"
                    : "justify-center"
                    } single-web-series-stats-grid`}>

                    {highlights?.map((stat, i) => (
                      <StatBadge key={i} {...stat} slug={slug} />
                    ))}

                    <EditPencil
                      to={adminRoutes.marketing.statics(itemData?.id)}
                      label="the highlight stats"
                    />
                  </div>
                </div>
              }
            </div>
          </div>
        }

        {/* ================== SLIDER + CONTENT ================== */}
        <div className="single-web-series-second-row-content-slider-wrapper">

          {/* SLIDER */}
          <div className="single-web-series-second-row-slider-wrapper">
            {sliderImage?.length > 0 ? (
              <>
                <Carousel
                  indicators
                  controls={sliderImage.length > 1}
                  interval={5000}
                >
                  {sliderImage.map((image, index) => (
                    <Carousel.Item key={index}>
                      <div className="aspect-ratio-wrapper">

                        {image?.marketing_video ? (
                          <ReactPlayer
                            url={image.marketing_video}
                            playing
                            muted
                            loop
                            controls
                            width="100%"
                            height="100%"
                          />
                        ) : (
                          <>
                            {image?.image ? (
                              <Image
                                src={image.image}
                                alt={`Slide ${index}`}
                                className="media-item"
                                width={600}
                                height={400}
                                style={{ width: "100%", height: "auto" }}
                              />
                            ) : null}

                            {(image?.upload_video || image?.video_url) && (
                              <button
                                className="play-btn"
                                onClick={() =>
                                  handlePlayVideo(
                                    image?.upload_video || image?.video_url
                                  )
                                }
                              >
                                <PlayBtn />
                              </button>
                            )}
                          </>
                        )}

                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>

                <EditPencil
                  to={adminRoutes.marketing.images(itemData?.id)}
                  label="the campaign images"
                />
              </>
            ) : (
              <div className="image-not-available-wrapper">
                Images not available
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="single-web-series-second-row-content-wrapper">
            <p><strong>Client :</strong> {itemData?.client || "N/A"}</p>
            <p><strong>Title :</strong> {itemData?.title || "N/A"}</p>
            <p><strong>Release Date :</strong> {itemData?.release_date || "N/A"}</p>
            <p><strong>Cast :</strong> {itemData?.cast || "N/A"}</p>
            <p><strong>Directors :</strong> {itemData?.directors || "N/A"}</p>
            <p><strong>Language :</strong> {itemData?.language || "N/A"}</p>

            <p className="description edit-host">
              {itemData?.description}
              <EditPencil
                to={adminRoutes.marketing.item(itemData?.id)}
                label="this campaign"
              />
            </p>
          </div>

        </div>

        {/* MODAL */}
        {isModalOpen && (
          <VideoPlayModal
            showModal={isModalOpen}
            setShowModal={setIsModalOpen}
            activeVideoUrl={videoUrl}
          />
        )}

      </div>
    </section>
  );
}
