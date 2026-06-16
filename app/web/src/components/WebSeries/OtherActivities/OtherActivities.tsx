// @ts-nocheck
"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import VideoPlayModal from "../../common/videoPlayModal/videoPlayModal";
import { cachedFetch, buildCacheKey } from "../../../utils/sessionCache";

const OtherActivities = ({ itemData }) => {
  const [activeCategory, setActiveCategory] = useState(
    itemData?.other_activity_category[0] || {}
  );
  const [otherActivity, setOtherActivity] = useState(null);
  // `loading` drives the loading skeleton; without it the previous
  // tab's content sits visible during the 1-2s API round-trip and
  // makes the tab click feel laggy.
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeVideoURL, setActiveVideoURL] = useState("");
  const sliderRef = useRef(null);


  useEffect(() => {
    if (!activeCategory?.category_name) return;

    let cancelled = false;
    /* Phase 5+ 2026-05-23: legacy `category_id` (numeric) doesn't
       carry over to the API — nested-array rows get hex auto-ids.
       Join children to parent + category_name (text) instead, which
       is stable across re-imports and editor edits. */
    const params = {
      parent_id: itemData?.id,
      category_name: activeCategory?.category_name,
    };
    const cacheKey = buildCacheKey("OtherActivities", params);

    // Clear stale content immediately so the user sees the loading
    // skeleton instead of the previous tab's stuff lingering.
    setOtherActivity(null);
    setLoading(true);

    cachedFetch(cacheKey, async () => {
      const url = new URL("/content-api/other-activities", window.location.origin);
      if (params.parent_id) {
        url.searchParams.set("where[parent][equals]", String(params.parent_id));
      }
      /* Items resolve from the /marketing/single payload keyed by the
         parent item slug; category_name selects the active tab. */
      if (itemData?.slug) {
        url.searchParams.set("where[item_slug][equals]", String(itemData.slug));
      }
      if (params.category_name) {
        url.searchParams.set(
          "where[category_name][equals]",
          String(params.category_name),
        );
      }
      url.searchParams.set("limit", "50");
      url.searchParams.set("sort", "order");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const body = await res.json();
      /* Adapter: renderer reads `otherActivity.title/description`
         + `otherActivity.media[].image/video`. Legacy returned a
         single object with a media array; the API returns N docs.
         Collapse to legacy shape: title from first doc, media from
         all docs flattened (image string, video). */
      const docs = body?.docs ?? [];
      if (!docs.length) return null;
      const media = docs.map((d: any) => ({
        image:
          (typeof d.image === "object" && d.image?.url) ||
          d.legacyImageUrl ||
          "",
        video: d.video_url || "",
      }));
      return {
        id: docs[0].id,
        marketing_house_item_id: itemData?.id,
        title: docs[0].title,
        description: docs[0].description,
        media,
      };
    })
      .then((data) => {
        if (!cancelled) {
          setOtherActivity(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error fetching other activities:", err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);


  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: false,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  return (
    <div className="other-activity-main-wrapper">
      <div className="other-activity-main">
        {/* Header */}
        <h2 className="text-center single-web-series-main-title font-primary font-bold">
          Add-on Activities
          <EditLink
            path={`${ADMIN_URL}/marketing_house/marketing_house_other_activity_category/${itemData?.id}/`}
          />
        </h2>

        {/* Filter Buttons */}
        {itemData?.other_activity_category?.length > 0 &&
          <div className="flex justify-center other-activity-header-wrapper">
            {itemData?.other_activity_category?.map((item, index) => (
              <button
                key={index}
                className={`inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 mr-2 other-activity-header-btn ${activeCategory?.id === item?.id
                  ? "border-white bg-transparent text-white hover:bg-white hover:text-black"
                  : "border-neutral-400 bg-transparent text-neutral-700 hover:bg-neutral-100"
                  }`}
                onClick={() => {
                  setActiveCategory(item);
                }}
              >
                {item?.category_name}
              </button>
            ))}
          </div>
        }


        <h3 className="other-activity-content-title other-activity-content-title-mobile mb-3">
          {otherActivity?.title}
          <EditLink
            path={`${ADMIN_URL}/marketing_house/marketing_house_other_activity_item/show/${otherActivity?.id}/${otherActivity?.marketing_house_item_id}`}
          />
        </h3>

        {/* Content */}
        <div className="other-activity-content-slider-wrapper">
          {/* Text Content */}

          <div className="other-activity-content-wrapper">
            {otherActivity && (
              <div>
                <h3 className="other-activity-content-title other-activity-content-title-desktop">
                  {otherActivity?.title}
                  <EditLink
                    path={`${ADMIN_URL}/marketing_house/marketing_house_other_activity_item/show/${otherActivity?.id}/${otherActivity?.marketing_house_item_id}`}
                  />
                </h3>
                <p className="other-activity-content-discription">
                  {otherActivity?.description}
                </p>
              </div>
            )}
          </div>

          {/* Image Slider */}
          <div className="other-activity-slider-wrapper relative">
            {otherActivity?.media?.length > 1 &&
              <Slider {...sliderSettings} ref={sliderRef}>
                {otherActivity?.media?.map((item, index) => (
                  <div key={index} className="other-activity-slider-images relative">
                    {item?.image && (
                      <Image
                        src={item.image}
                        alt="Slide"
                        className="w-auto h-auto"
                        width={600}
                        height={400}
                      />
                    )}
                    {item?.video && (
                      <button
                        className="service-details-banner-card-play-button"
                        onClick={() => {
                          setActiveVideoURL(item?.video);
                          setShowModal(true);
                        }}
                      >
                        <PlayBtn />
                      </button>
                    )}
                  </div>
                ))}
              </Slider>
            }

            {otherActivity?.media?.length === 1 &&
              <div className="other-activity-slider-images">
                {otherActivity?.media[0]?.image && (
                  <Image
                    src={otherActivity.media[0].image}
                    alt="Only Slide"
                    className="w-auto h-auto"
                    width={600}
                    height={400}
                  />
                )}
              </div>
            }

            {otherActivity?.media?.length > 1 &&
              <>
                <button
                  className="absolute other-activity-button-prev-btn left-0 -translate-y-1/2"
                  style={{ zIndex: 5 }}
                  onClick={() => sliderRef.current.slickPrev()}
                >
                  <IoIosArrowBack size={30} />
                </button>
                <button
                  className="absolute other-activity-button-next-btn right-0 -translate-y-1/2"
                  style={{ zIndex: 5 }}
                  onClick={() => sliderRef.current.slickNext()}
                >
                  <IoIosArrowForward size={30} />
                </button>
              </>
            }

          </div>
        </div>

        {/* Loading skeleton — keeps the tab feeling responsive while
            the API call is in flight. Two simple bars + a placeholder
            poster shape so the layout doesn't jump on data arrival. */}
        {loading && !otherActivity && (
          <div className="other-activity-skeleton" aria-hidden="true">
            <div className="other-activity-skeleton-text">
              <div className="other-activity-skeleton-line other-activity-skeleton-title"></div>
              <div className="other-activity-skeleton-line"></div>
              <div className="other-activity-skeleton-line"></div>
              <div className="other-activity-skeleton-line short"></div>
            </div>
            <div className="other-activity-skeleton-media"></div>
          </div>
        )}

        {!loading && !otherActivity && (
          <div className="">
            <p className="text-center">Data not available.</p>
          </div>
        )}

        {/* Model for play videos */}
        {showModal && <VideoPlayModal
          showModal={showModal}
          setShowModal={setShowModal}
          activeVideoUrl={activeVideoURL}
        />}

      </div>
    </div>
  );
};

export default OtherActivities;
