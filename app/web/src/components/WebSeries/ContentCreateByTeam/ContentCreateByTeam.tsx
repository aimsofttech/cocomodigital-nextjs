// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { FaEye, FaImages } from "react-icons/fa";
import Modal from "@/src/components/common/TailwindModal/TailwindModal";
import Carousel from "@/src/components/common/TailwindCarousel/TailwindCarousel";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import VideoPlayModal from "../../common/videoPlayModal/videoPlayModal";
import SecondaryButton from "../../common/buttons/SecondaryButton";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import { useLocation } from "@/src/lib/navigation";
import { cachedFetch, buildCacheKey } from "../../../utils/sessionCache";

const LIMIT = 12;

const categoryImages = {
  Posters: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361902_Rectangle%201253%20(1).png",
  Videos: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361951_image%20(20).png",
  Shorts: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-items/1736361985_Rectangle%201253%20(1).png",
  Carousels: "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-content-carousels/1736418369_e5a02a6ea286762390ef8566bac1e249.jpg",
};

const ContentCreateByTeam = ({ itemData }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [contentCreated, setContentCreated] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [galleryData, setGalleryData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [playVideoModal, setPlayVideoModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [scrollToId, setScrollToId] = useState("");
  const [offset, setOffset] = useState(0);
  // `loading` drives the loading skeleton; without it the previous
  // tab's thumbnails stay on screen while the fetch is in flight,
  // making the click feel laggy even though state changed instantly.
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Reset offset when category changes
  useEffect(() => {
    setOffset(0);
  }, [activeCategory]);

  // Fetch Data (Stable)
  useEffect(() => {
    if (!activeCategory?.id) return;

    let cancelled = false;
    const isCarousels = activeCategory?.category_name === "Carousels";
    /* Phase 5+ 2026-05-23: join via parent doc id + category_name
       text (nested-array hex auto-ids don't persist across
       re-imports; category_name is stable). */
    const params = {
      parent_id: itemData?.id,
      category_name: activeCategory?.category_name,
      limit: LIMIT,
      offset: offset,
    };
    const cacheKey = buildCacheKey(
      isCarousels ? "MarketingContentCreatedCarousels" : "MarketingContentCreated",
      params
    );

    // Clear stale thumbnails on a fresh tab click (offset=0) so the
    // user sees the loading skeleton instead of the previous tab's
    // grid lingering for 1-2s.
    if (offset === 0) {
      setContentCreated([]);
    }
    setLoading(true);

    cachedFetch(cacheKey, async () => {
      const collection = isCarousels
        ? "content-created-carousels"
        : "content-created-items";
      const url = new URL(`/content-api/${collection}`, window.location.origin);
      if (params.parent_id) {
        url.searchParams.set("where[parent][equals]", String(params.parent_id));
      }
      /* Items/carousels resolve from the /marketing/single payload keyed
         by the parent item slug; category_name selects the active tab. */
      if (itemData?.slug) {
        url.searchParams.set("where[item_slug][equals]", String(itemData.slug));
      }
      if (params.category_name) {
        url.searchParams.set(
          "where[category_name][equals]",
          String(params.category_name),
        );
      }
      url.searchParams.set("limit", String(params.limit));
      url.searchParams.set("page", String(Math.floor(params.offset / params.limit) + 1));
      url.searchParams.set("sort", "order");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return { data: [], total: 0 };
      const body = await res.json();
      /* Adapt: renderer reads `item.image` (URL string) and
         `item.url` (video). Flatten Media doc -> URL + fall back to
         legacyImage so cards render before the image-link step. */
      const docs = (body?.docs || []).map((d: any) => ({
        ...d,
        image:
          (typeof d.image === "object" && d.image?.url) ||
          d.legacyImage ||
          d.legacyImageUrl ||
          (typeof d.image === "string" ? d.image : "") ||
          "",
        url: d.url || d.video_url || "",
        carousel_order: d.carousel_order,
        marketing_house_item_id: itemData?.id,
      }));
      return {
        data: docs,
        total: body?.totalDocs || 0,
      };
    })
      .then(({ data, total }) => {
        if (cancelled) return;
        if (offset === 0) {
          setContentCreated(data);
        } else {
          setContentCreated((prev) => [...prev, ...data]);
        }
        setTotalCount(total);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error fetching data:", err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, offset]);

  // Gallery Handler
  const galleryImagesViewHandler = async (marketingHouseId, carouselId) => {
    try {
      const url = new URL("/content-api/content-created-carousels", window.location.origin);
      url.searchParams.set("where[parent][equals]", String(marketingHouseId));
      url.searchParams.set("where[carousel_order][equals]", String(carouselId));
      url.searchParams.set("limit", "1");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const body = await res.json();
      const doc = body?.docs?.[0];
      if (!doc) return;
      /* Phase 5+ 2026-05-23: gallery slides on the API come from the
         doc's `gallery[]` array. Renderer expects each slide as a
         flat {image: <url string>} — unwrap Media/legacyImage here so
         the modal carousel doesn't need to know about the API's
         shape. */
      const gallery = (Array.isArray(doc.gallery) ? doc.gallery : []).map(
        (s: any) => ({
          image:
            (typeof s.image === "object" && s.image?.url) ||
            s.legacyImage ||
            (typeof s.image === "string" ? s.image : "") ||
            "",
        }),
      );
      if (gallery.length) {
        setGalleryData(gallery);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error fetching gallery:", error);
    }
  };

  const showMoreHandler = () => setOffset((prev) => prev + LIMIT);
  const showLessHandler = () => setOffset(0);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "").split("?")[0];

      console.log("Scrolling to ID:", id);

      if (id) {
        setScrollToId(id);
      }

      const element = document.getElementById(id);

      if (element) {
        setTimeout(() => {
          const yOffset = scrollToId === "views" ? 50 : -30; // adjust if you have sticky header
          const y =
            element.getBoundingClientRect().top +
            window.pageYOffset +
            yOffset;

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }, 100); // wait for DOM render
      }
    }
  }, [location, scrollToId]);


  // Set initial category when itemData loads
  useEffect(() => {
    if (scrollToId && scrollToId !== "views") {
        const category = itemData?.content_created_category?.find((cat) => cat.category_name.toLowerCase() === scrollToId.toLowerCase());

        if (category) { 
          setActiveCategory(category);
        }

    }
    else if (itemData?.content_created_category?.length) {
      setActiveCategory(itemData.content_created_category[0]);
    }
  }, [itemData, scrollToId]);

  return (
    <div className="w-full" id="videos">
      <div id="shorts" className="marketing-details-content-creator-main-wrapper">
        <div className="marketing-details-content-creator-main">
          <h2 className="text-center single-web-series-main-title font-primary">
            Content Created By Our Team
            <EditLink
              path={`${ADMIN_URL}/marketing_house/marketing_house_content_created_category/${itemData?.id}`}
            />
          </h2>

          {/* Category Buttons */}
          {itemData?.content_created_category?.length > 1 && (
            <div className="marketing-details-content-creator-category-wrapper">
              {itemData.content_created_category.map((category) => (
                <button
                  key={category.id}
                  className={`marketing-details-content-created-by-team-button ${activeCategory?.id === category.id
                    ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600] text-dark"
                    : "border-neutral-200 bg-white text-black hover:bg-neutral-100"
                    }`}
                  onClick={() => {
                    setActiveCategory(category);
                    setActiveVideoUrl("");
                  }}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          )}

          {/* Content Grid */}
          <div className="w-full mt-3">
            <div className="flex flex-wrap -mx-3">
              {activeCategory?.category_name !== "Carousels" &&
                contentCreated.map((item) => (
                  <div className="w-1/2 px-3 md:w-1/3 md:px-3 lg:w-1/4 lg:px-3 marketing-details-content-created-by-cards" key={item.id}>
                    <div className="relative video-wrapper">
                      <div
                        className="play-overlay"
                        onClick={() => {
                          setPlayVideoModal(true);
                          setActiveVideoUrl(item.url);
                        }}
                      >
                        <Image
                          src={item.image || categoryImages[activeCategory?.category_name]}
                          alt="Thumbnail"
                          className="max-w-full h-auto w-full rounded"
                          width={600}
                          height={400}
                          style={{ width: "100%", height: "auto" }}
                        />
                        <PlayBtn />
                      </div>
                    </div>

                    <EditLink
                      path={`${ADMIN_URL}/marketing_house/marketing_house_content_created_item/show/${item.id}/${item.marketing_house_item_id}`}
                    />
                  </div>
                ))}

              {/* Carousels */}
              {activeCategory?.category_name === "Carousels" &&
                contentCreated.map((item, index) => (
                  <div className="w-1/2 px-3 md:w-1/3 md:px-3 lg:w-1/4 lg:px-3" key={item.id}>
                    <div
                      className="marketing-details-content-created-by-cards marketing-details-content-creator-carousels-img-wrapper"
                      onClick={() =>
                        galleryImagesViewHandler(
                          item.marketing_house_item_id,
                          item.carousel_order
                        )
                      }
                    >
                      <Image
                        src={item.image || categoryImages.Carousels}
                        alt="Content"
                        className="w-full rounded"
                        width={600}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                      />

                      <div className="marketing-details-content-creator-carousels-overlay">
                        <FaEye size={20} />
                        <p>View All Gallery Images</p>
                      </div>

                      {/* Yellow "GALLERY" chip top-left of the card —
                          replaces the off-brand orange icon and matches
                          the Industry Experience numbered chips. */}
                      <div className="marketing-details-content-creator-carousels-gallery-icon" aria-hidden="true">
                        <FaImages />
                        <span>Gallery</span>
                      </div>
                    </div>

                    <EditLink
                      path={`${ADMIN_URL}/marketing_house/carousels/show/${item.id}/${item.marketing_house_item_id}`}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Loading skeleton — keeps the section feeling responsive
              while the API call is in flight. 6 placeholder cards in
              the same grid the real content will land in, so the
              layout doesn't jump on data arrival. */}
          {loading && contentCreated.length === 0 && (
            <div className="flex flex-wrap -mx-3 content-created-skeleton-row" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="w-1/2 px-3 md:w-1/3 md:px-3 lg:w-1/4 lg:px-3 marketing-details-content-created-by-cards" key={`skeleton-${i}`}>
                  <div className="content-created-skeleton-card"></div>
                </div>
              ))}
            </div>
          )}

          {/* No Data */}
          {!loading && contentCreated.length === 0 && (
            <p className="text-center mt-5">Data not available.</p>
          )}

          {/* Buttons */}
          <div className="flex justify-center gap-4">
            {contentCreated.length > LIMIT && (
              <SecondaryButton label="Show less" onClick={showLessHandler} />
            )}

            {totalCount > contentCreated.length && (
              <SecondaryButton label="Show more" onClick={showMoreHandler} />
            )}
          </div>
        </div>

        {/* Video Modal */}
        {playVideoModal && (
          <VideoPlayModal
            showModal={playVideoModal}
            setShowModal={setPlayVideoModal}
            activeVideoUrl={activeVideoUrl}
          />
        )}

        {/* Gallery Modal */}
        {showModal && (
          <Modal
            show={showModal}
            onHide={() => setShowModal(false)}
            centered
            backdrop="static"
            size="lg"
            className="custom-modal"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <strong>Gallery Images</strong>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              className="w-full sm:pb-3 pb-2 pt-0"
              style={{ backgroundColor: "black" }}
            >
              {/* Image Slider */}
              <div className="content-created-carousel-gallery-wrapper">
                {galleryData?.length ? (
                  <Carousel
                    indicators={galleryData.length > 1}
                    controls={galleryData.length > 1}
                    interval={3000}
                    pause="hover"
                  >
                    {galleryData.map((item, index) => (
                      <Carousel.Item key={index}>
                        <div className="content-created-carousel-image-container">
                          {item?.image && (
                            <Image
                              src={item.image}
                              alt={`Slide ${index + 1}`}
                              className="content-created-carousel-gallery-image"
                              width={800}
                              height={600}
                              style={{ width: "100%", height: "auto" }}
                            />
                          )}
                        </div>
                      </Carousel.Item>
                    ))}
                  </Carousel>
                ) : (
                  <div className="no-image-wrapper">
                    <p>Images not available</p>
                  </div>
                )}
              </div>

            </Modal.Body>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ContentCreateByTeam;
