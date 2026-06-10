// @ts-nocheck
"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCart } from "@/src/lib/cart";
import Slider from "react-slick";
import Modal from "@/src/components/common/TailwindModal/TailwindModal";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import { Link } from "@/src/lib/navigation";

// react-player ships ~40KB of provider adapters — only ~1 in 10
// users actually opens the modal to play a video, so deferring it
// to a lazy chunk lets the hero + service info paint immediately.
const ReactPlayer = lazy(() => import("react-player"));

const SingleServiceSlider = ({ service }) => {
  const [sliderId, setSliderId] = useState(null);
  // Default to Recurring — most clients on this page are after
  // ongoing services (channel ops, content production, ad
  // management) rather than one-off projects, so pre-selecting
  // Recurring matches the dominant intent and removes a click.
  const [selectedOption, setSelectedOption] = useState("Recurring");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const descRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [viewAllLines, setViewAllLines] = useState(false);
  const [imgErrors, setImgErrors] = useState({});
  const { items: cartItems, addItem, removeItem } = useCart();

  const isItemInCart = (itemId) => {
    return cartItems?.some((cartItem) => cartItem?.id === itemId);
  };

  const handleToggleCart = (item) => {
    if (isItemInCart(item?.id)) {
      removeItem(item?.id);
    } else {
      addItem({
        ...item,
        subscriptionType: selectedOption,
      });
    }
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handlePlayVideo = (videoUrl) => {
    setVideoUrl(videoUrl);
    setIsModalOpen(true);
  };

  const settings = {
    // dots: true,
    infinite: service?.group_single_service_image?.length > 1,
    speed: 2000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    cssEase: "ease-in-out",
    // appendDots: (dots) => (
    //   <div className="w-full relative" style={{ bottom: "-20px" }}>
    //     <ul className="m-0 p-2">{dots}</ul>
    //   </div>
    // ),
    // dotsClass: "slick-dots custom-dots",
  };

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      const isTextTruncated = el.scrollHeight > el.clientHeight;
      setIsTruncated(isTextTruncated);
    }
  }, [service?.featureed_description]);

  /* When service is undefined the API fetch is still in flight.
     Render a full-hero skeleton (matched to the rendered hero
     dimensions) so the page reserves space + signals "loading"
     instead of showing a half-empty hero with breadcrumb-only
     content. The skeleton uses the same shimmer + yellow spinner
     idiom as the rest of the site. */
  if (service === undefined) {
    return (
      <div className="service-details-banner-main-wrapper">
        <div className="service-details-banner-main">
          <div
            className="service-details-banner-hero-skeleton"
            aria-hidden="true"
            aria-busy="true"
          />
        </div>
      </div>
    );
  }

  if (service === null) {
    return null;
  }

  return (
    <div className="service-details-banner-main-wrapper">
      <div className="service-details-banner-main">
        <div className="service-details-banner-title-subtitle-wrapper">
          <h1 className="font-primary">{service?.group_service_item_title || service?.title}</h1>
          {/* Sticker-language breadcrumb — UPPERCASE muted trail
              items, yellow chevron separators, bold current item.
              Replaces the previous plain "Home / Services / X"
              text line that read as filler. */}
          <nav className="service-breadcrumb" aria-label="breadcrumb">
            <Link to="/" className="service-breadcrumb-crumb">
              Home
            </Link>
            <span className="service-breadcrumb-sep" aria-hidden="true">
              ›
            </span>
            <Link
              to={`/services/${service?.slug}`}
              className="service-breadcrumb-crumb"
            >
              Services
            </Link>
            <span className="service-breadcrumb-sep" aria-hidden="true">
              ›
            </span>
            <span
              className="service-breadcrumb-current"
              aria-current="page"
            >
              {service?.title}
            </span>
          </nav>
        </div>
        <div className="service-details-banner-card-content-wrapper">
          {/* left side contents */}
          <div className="service-details-banner-card-wrapper">
            {service?.group_single_service_image &&
              service?.group_single_service_image?.length > 0 ? (
              <Slider {...settings}>
                {service?.group_single_service_image?.map((images, index) => {
                  return (
                    <div key={images?.id || index}>
                      <div className="relative">
                        {/* Hero image is above-the-fold — eager + high
                            fetch priority so it paints with the rest of
                            the LCP surface instead of arriving late.
                            Only the FIRST slide gets eager/high; later
                            slides in the autoplay rotation can lazy-load
                            since they're off-screen until the slider
                            cycles. */}
                        <Image
                          src={imgErrors[index] ? "/Images/videoThumbnail.svg" : (images?.image && String(images.image).trim() ? images.image : "/Images/videoThumbnail.svg")}
                          alt={`Slide ${index + 1}`}
                          className="service-details-banner-slider-image"
                          width={600}
                          height={400}
                          priority={index === 0}
                          onError={() => setImgErrors(prev => ({ ...prev, [index]: true }))}
                          style={{ width: "100%", height: "auto" }}
                        />
                        <button
                          onClick={() =>
                            handlePlayVideo(
                              images?.upload_video ||
                              images?.video_url
                            )
                          }
                        >
                          <PlayBtn />
                        </button>
                        <div
                          className="absolute top-0 right-0 mr-3 mt-3"
                          style={{ backgroundColor: "white" }}
                        >
                          <EditLink
                            path={`${ADMIN_URL}/home/group/service/group_single_service_image/show/${images?.id}/${images?.group_service_item_id}/${service?.category_id}`}
                            className="mr-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <p className="mb-0 service-details-banner-content-main-description px-2">
                          {sliderId === images?.id ? (
                            <>
                              {images?.description}
                              <span
                                className="slider-left-read-more-btn"
                                onClick={() => setSliderId(null)}
                              >
                                show less &lt;
                              </span>
                            </>
                          ) : (
                            <>
                              {images?.description?.slice(0, 200)}
                              {images?.description?.length > 200 && "..."}
                              {images?.description?.length > 200 && (
                                <span
                                  className="slider-left-read-more-btn"
                                  onClick={() => setSliderId(images?.id)}
                                >
                                  show more &gt;
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Slider>

            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "3 / 2",
                  background: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "8px",
                  border: "2px dashed #ccc",
                  borderRadius: "8px",
                  color: "#888",
                  fontSize: "clamp(12px, 2vw, 16px)",
                  userSelect: "none",
                }}
                role="img"
                aria-label="Image not available"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Image Not Available
              </div>
            )}
          </div>
          {/* right side contents */}
          <div className="service-details-banner-content-wrapper">
            <div className="service-details-banner-content-title-subtitle-wrapper">
              <h3 className="service-details-banner-content-main-title font-primary">
                {service?.title}
                <EditLink
                  path={`${ADMIN_URL}/home/group/service/group_service_item/show/${service?.id}/${service?.category_id}`} />
              </h3>
              <div
                ref={descRef}
                className={`service-details-banner-content-main-description ${!viewAllLines && "truncate-dec"
                  }`}
                dangerouslySetInnerHTML={{
                  __html: service?.featured_description,
                }}
              />
              {isTruncated && (
                <div
                  className={`slider-right-readMore-btn ${!viewAllLines ? "margin-top-6px" : "margin-top-20px "
                    }`}
                >
                  <button onClick={() => setViewAllLines(!viewAllLines)}>
                    {!viewAllLines ? "show more >" : "show less <"}
                  </button>
                </div>
              )}
            </div>
            {/* "Running Time" h3 removed — the label was hardcoded
                video-deliverable copy that read as nonsense on
                non-video services (community management, channel
                ops, advertising, content operations, etc.). The
                Recurring / One Time Only buttons below are
                self-labeled, so no section heading is needed. If
                a more universal label ever feels missing, the
                cleanest path is to make it API-driven so each
                service can supply its own (or omit) heading. */}
            <div className="service-details-banner-content-one-time-reccuring-btn-wrapper">
              <button
                className={`inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 w-1/2 p-2 service-details-banner-content-one-time-reccuring-btn ${selectedOption === "Recurring"
                  ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600]"
                  : "border-neutral-400 bg-transparent text-neutral-700 hover:bg-neutral-100"
                  }`}
                onClick={() => handleOptionSelect("Recurring")}
              >
                Recurring
              </button>
              <button
                className={`inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 w-1/2 p-2 service-details-banner-content-one-time-reccuring-btn ${selectedOption === "One Time Only"
                  ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600]"
                  : "border-neutral-400 bg-transparent text-neutral-700 hover:bg-neutral-100"
                  }`}
                onClick={() => handleOptionSelect("One Time Only")}
              >
                One Time Only
              </button>
            </div>

            {/* CTA reframed from "Add Now / Added" (e-commerce idiom)
                to "Add to call / On your call ✓" (lead-gen idiom).
                Same toggle mechanic + same cart-builder behaviour
                under the hood — only the language changed so the
                user reads it as "I'm queueing this up to discuss
                with Anil" rather than "I'm checking out". */}
            <button
              className={`inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 w-full px-4 py-2 service-details-banner-content-add-btn ${isItemInCart(service?.id) ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600]" : "border-black bg-black text-white hover:bg-neutral-800"
                }`}
              onClick={() => handleToggleCart(service)}
            >
              {isItemInCart(service?.id)
                ? "On your call ✓"
                : "Add to call"}
            </button>
          </div>
        </div>

        {/* play video modal */}
        <Modal
          show={isModalOpen}
          onHide={() => setIsModalOpen(false)}
          centered
          size="lg"
          style={{ zIndex: 9999 }}
        >
          <Modal.Header
            style={{ background: "white" }}
            closeButton
          ></Modal.Header>
          <Modal.Body style={{ background: "white" }}>
            <div
              className="video-container"
              style={{ position: "relative", paddingTop: "56.25%" }}
            >
              {/* Suspense fallback is a black filler matching the
                  video frame so the modal doesn't reflow when the
                  lazy player chunk arrives. */}
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
                  controls
                  playing={true}
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
              </Suspense>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default SingleServiceSlider;
