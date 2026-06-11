// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Slider from "react-slick";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Modal from "@/src/components/common/TailwindModal/TailwindModal";
import ReactPlayer from "react-player";
import PlayBtn from "../../../components/common/PlayBtn/PlayBtn";
import { ADMIN_URL } from "../../../utils/constant";
import EditLink from "../../../components/Edit-Link/Edit-Link";

const ContinuityProgram = ({ itemData }) => {
  const [activeCategory, setActiveCategory] = useState(
    itemData?.continuity_category[0]
  );
  const [activeData, setActiveData] = useState([]);
  const [readMoreText, setReadMoreText] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState(null);
  const [showModal, setShowModal] = useState(false);


  useEffect(() => {
    if (!activeCategory?.category_name) return;

    let cancelled = false;

    const fetchContinuityProgram = async () => {
      try {
        /* Phase 5+ 2026-05-23: query by parent doc id + category_name
           (free-text, indexed). Previously sent `where[category]=<hex>`
           against a non-existent column → HTTP 400, plus the parent
           filter used a stale hex from the array-row instead of the
           parent doc id. */
        const url = new URL("/content-api/continuity-program-items", window.location.origin);
        if (itemData?.id) {
          url.searchParams.set("where[parent][equals]", String(itemData.id));
        }
        /* Items resolve from the /marketing/single payload keyed by the
           parent item slug; category_name selects the active tab. */
        if (itemData?.slug) {
          url.searchParams.set("where[item_slug][equals]", String(itemData.slug));
        }
        url.searchParams.set(
          "where[category_name][equals]",
          String(activeCategory.category_name),
        );
        url.searchParams.set("limit", "50");
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setActiveData(body?.docs ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching continuity program:", err);
      }
    };

    fetchContinuityProgram();
    return () => { cancelled = true; };
  }, [activeCategory, itemData?.id]);



  const CustomPrevArrow = ({ className, style, onClick }) => (
    <div
      className={`${className} service-scroll-button left`}
      onClick={onClick}
    >
      <FaChevronLeft size={20} color="#000" />
    </div>
  );

  const CustomNextArrow = ({ className, style, onClick }) => (
    <div
      className={`${className} service-scroll-button right`}
      onClick={onClick}
    >
      <FaChevronRight size={20} color="#000" />
    </div>
  );

  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    initialSlide: 0,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    responsive: [
      {
        breakpoint: 1000,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          // infinite: true,
          // dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 0,
        },
      },
    ],
  };

  return (
    <div className="web-series-continuity-program-main-wrapper">
      <div className="web-series-continuity-program-main">
        <h1 className="single-web-series-main-title font-primary text-center">
          Continuity Program
          <EditLink path={`${ADMIN_URL}/marketing_house/community_program_category/${itemData?.id}`} />
        </h1>
        {itemData?.continuity_category?.length > 1 &&
          <div className="web-series-continuity-program-category-wrapper">
            {itemData?.continuity_category?.map((item, index) => {
              return (
                <p
                  key={index}
                  className={`text-center web-series-continuity-program-category-item ${activeCategory?.id === item?.id
                    ? "border-black bg-[#fff000] text-black hover:bg-[#f4e600] text-dark"
                    : "border-neutral-200 bg-white text-black hover:bg-neutral-100"
                    }`}
                  onClick={() =>
                    setActiveCategory(item)
                  }
                >
                  {item?.category_name}
                </p>
              );
            })}
          </div>
        }
        <div className="w-full web-series-continuity-program-desc mt-3">
          <p>
            {!readMoreText ? (
              <span className="web-series-continuity-program-desc-sort">
                {activeCategory?.description?.slice(
                  0,
                  400
                )}
                {activeCategory?.description?.length >
                  400 && "..."}
              </span>
            ) : (
              <span className="web-series-continuity-program-desc-total">
                {activeCategory?.description}
              </span>
            )}
          </p>
          {activeCategory?.description?.length >
            400 && (
              <p
                className="web-series-continuity-program-desc-read-more"
                onClick={() => setReadMoreText(!readMoreText)}
              >
                {readMoreText ? "read less" : "read more"}
              </p>
            )}
        </div>

        {/* Slider */}
        {activeData?.length > 0 && (
          <div className="web-series-continuity-program-slide-card-wrapper mt-3 md:mt-4">
            <Slider {...settings}>
              {activeData?.map((item, index) => {
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setVideoToPlay({
                        url: item?.upload_video
                          ? item?.upload_video
                          : item?.community_program_item_video_url,
                        title: activeCategory?.category_name,
                        VideoId: item?.id,
                      });
                      setShowModal(true);
                    }}
                    className="w-full web-series-continuity-program-slide-card"
                  >
                    <div className="w-full relative">
                      {item?.thumbnail && (
                        <Image
                          className="w-full h-auto object-cover"
                          src={item.thumbnail}
                          alt="category"
                          width={300}
                          height={200}
                          style={{ width: "100%", height: "auto" }}
                        />
                      )}
                      <PlayBtn />
                    </div>
                    <p className="font-semibold leading-snug mt-2">
                      {item?.community_program_item_description}
                    </p>
                    <EditLink path={`${ADMIN_URL}/marketing_house/community_program_item/show/${item?.id}/${item?.marketing_house_item_id}`} />
                  </div>
                );
              })}
            </Slider>
          </div>
        )}

        {activeData?.length === 0 && (
          <div
            style={{ height: "50px" }}
            className="w-full flex justify-between content-center"
          >
            <h5 style={{ fontWeight: 600 }} className="w-full text-center">
              Videos Not Available
            </h5>
          </div>
        )}
      </div>

      {/* <<---------------video Modal------------->> */}
      {videoToPlay && (
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
              <strong>{videoToPlay?.title}</strong>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <div
              className="video-container"
              style={{ position: "relative", paddingTop: "56.25%" }}
            >
              <ReactPlayer
                url={videoToPlay?.url}
                controls
                playing={true}
                width="100%"
                height="100%"
                style={{ position: "absolute", top: 0, left: 0 }}
              />
            </div>
          </Modal.Body>
          {/* <Modal.Footer style={{ background: "white" }}>
            <Link to={`/Single-Video/${videoToPlay.VideoId}`}>
              <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600]">See How We Edit</button>
            </Link>
            <Link to={`/ScheduleMeeting`}>
              <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-neutral-200 bg-white text-black hover:bg-neutral-100">Book A Demo Call</button>
            </Link>
          </Modal.Footer> */}
        </Modal>
      )}
    </div>
  );
};

export default ContinuityProgram;
