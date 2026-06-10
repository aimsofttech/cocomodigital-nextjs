// @ts-nocheck
"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactPlayer from "react-player";
import { GoArrowUpRight } from "react-icons/go";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import PrimaryLink from "../../common/PrimaryLink/PrimaryLink";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import { HiArrowUpRight } from "react-icons/hi2";

const CreativeHouseShowcase = ({ creativeHouseCategory }) => {
  const [activeCategoryId, setActiveCategoryId] = useState(-1);
  const [creativeHouseData, setCreativeData] = useState(null);
  const scrollContainerRef = useRef(null);
  const listRef = useRef(null);
  const cardsContainerScrollRef = useRef(null);
  const [videoToPlay, setVideoToPlay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const language = "en"; /* Phase 5b: lang slice dropped */
  const isMobile = useMediaQuery("(max-width: 576px)");

  // fetch creative house data
  useEffect(() => {
    const fetchCreativeHouse = async () => {
      try {
        /* Phase 5l: the API creative-house-items filtered by
           category. Empty/null category = all. */
        const url = new URL("/content-api/creative-house-items", window.location.origin);
        if (activeCategoryId) {
          url.searchParams.set("where[category][equals]", String(activeCategoryId));
        }
        url.searchParams.set("limit", "10");
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = await res.json();
        setCreativeData(body?.docs || []);
      } catch (error: any) {
        console.log("error", error?.message || "An error occurred while fetching Creative House data.");
      }
    };

    fetchCreativeHouse();
  }, [activeCategoryId, language]);



  const scrollAmount = 180;
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Update scroll button visibility
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        container.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, []);

  useEffect(() => {
    checkScrollPosition();
  }, []);

  const checkScrollPosition = () => {
    if (listRef.current) {
      setCanScrollUp(listRef.current.scrollTop > 0);
      setCanScrollDown(
        listRef.current.scrollTop + listRef.current.clientHeight <
        listRef.current.scrollHeight
      );
    }
  };

  const scrollUp = () => {
    if (listRef.current) {
      listRef.current.scrollBy({ top: -100, behavior: "smooth" });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const scrollDown = () => {
    if (listRef.current) {
      listRef.current.scrollBy({ top: 100, behavior: "smooth" });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const categoryChangeHandler = (id) => {
    setActiveCategoryId(id);
    if (cardsContainerScrollRef?.current) {
      cardsContainerScrollRef?.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="home-latest-work-main-wrapper">
      <div className="home-latest-work-main">
        {/* MarketingCreative for desktop & mobile */}
        <div className="marketing-creative-main">
          <div className="marketing-creative-title-subtitle-all-wrapper">
            <div className="marketing-creative-title-subtitle-wrapper">
              <h3 className="uppercase text-neutral-500 marketing-creative-title font-primary">
                See what's new
              </h3>
              <h2 className="font-bold marketing-creative-subtitle font-primary">
               Creative HQ
                <EditLink
                  path={`${ADMIN_URL}/home/creative_house/creative_house_category`} />
              </h2>
            </div>
            {!isMobile && (
              <Link href="/creative-house/">
                <button className="view-all-button-new">
                  View All <GoArrowUpRight size={20} style={{ strokeWidth: 1 }} />
                </button>
              </Link>
            )}
          </div>
          <div className="home-slide-nav-all-card-main-wrapper">
            {/* header For desktop & mobile */}
            {!isMobile && (
              <div className={`home-slide-nav-wrapper`}>
                <div className="home-slide-nav">
                  {/* Left scroll button */}
                  <button
                    onClick={scrollLeft}
                    className={`home-latest-work-header-scroll-button left ${showLeftButton ? "visible" : "hidden"
                      }`}
                    aria-label="Scroll left"
                  >
                    <div className="home-latest-work-header-button-content mr-[3px]">
                      <Image
                        src="/Images/home/secondary-arrow-icon.svg"
                        className="left-scroll-icon"
                        alt="items-logo"
                        width={24}
                        height={24}
                      />
                    </div>
                  </button>
                  {/* Scrollable container */}
                  <div
                    ref={scrollContainerRef}
                    className="home-latest-work-header-scroll-container"
                  >
                    <div className="home-latest-work-header-items-wrapper">
                      <div
                        className={`home-slide-nav-icon-title-wrapper 
                          ${activeCategoryId === -1 ? "active" : ""}
                            `}
                        onClick={() => categoryChangeHandler(-1)}
                      >
                        <Image
                          src="/Images/home/all-content-icon.svg"
                          className="home-slide-nav-icon"
                          alt="items-logo"
                          width={32}
                          height={32}
                        />
                        <div className={`home-slide-nav-items`}>All</div>
                      </div>
                      {creativeHouseCategory?.map((category, index) => (
                        <div
                          key={index}
                          className={`home-slide-nav-icon-title-wrapper ${activeCategoryId === category?.id ? "active" : ""
                            }`}
                          onClick={() => categoryChangeHandler(category?.id)}
                        >
                          {category?.icon &&
                            <Image
                              src={category.icon}
                              className="home-slide-nav-icon"
                              alt="items-logo"
                              width={32}
                              height={32}
                            />}
                          <p className="home-slide-nav-items">
                            {category?.category_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Right scroll button */}
                  <button
                    onClick={scrollRight}
                    className={`home-latest-work-header-scroll-button right ${showRightButton ? "visible" : "hidden"
                      }`}
                    aria-label="Scroll right"
                  >
                    <div className="home-latest-work-header-button-content ml-[3px]">
                      <Image
                        src="/Images/home/secondary-arrow-icon.svg"
                        className="right-scroll-icon"
                        alt="items-logo"
                        width={24}
                        height={24}
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}
            {isMobile && (
              <div className="scroll-container">
                {canScrollUp && (
                  <div className="res-scroll-btn top-btn">
                    <button onClick={scrollUp}>
                      <Image
                        src="/Images/home/secondary-arrow-icon.svg"
                        className="top-scroll-icon"
                        alt="items-logo"
                        width={24}
                        height={24}
                      />
                    </button>
                  </div>
                )}
                <div
                  className="scroll-box"
                  ref={listRef}
                  onScroll={checkScrollPosition}
                >
                  <div className="scroll-active-bar-list-wrapper">
                    <div
                      className={`scroll-active-bar ${activeCategoryId === -1 ? "active" : ""
                        }`}
                    >
                    </div>
                    <div
                      className={`scroll-list-icon-title-wrapper`}
                      onClick={() => categoryChangeHandler(-1)}
                    >
                      <Image
                        src="/Images/home/all-content-icon.svg"
                        className="home-slide-nav-icon"
                        alt="items-logo"
                        width={32}
                        height={32}
                      />
                      <div className={`home-slide-nav-items`}>All</div>
                    </div>
                  </div>
                  {creativeHouseCategory?.map((category, index) => (
                    <div key={index} className="scroll-active-bar-list-wrapper">
                      <div
                        className={`scroll-active-bar ${activeCategoryId === category?.id ? "active" : ""
                          }`}
                      >
                      </div>
                      <div
                        key={category?.id}
                        className={`scroll-list-icon-title-wrapper`}
                        onClick={() => categoryChangeHandler(category?.id)}
                      >
                        {category?.icon &&
                          <Image
                            src={category.icon}
                            className="home-slide-nav-icon"
                            alt="items-logo"
                            width={32}
                            height={32}
                          />}
                        <p className="home-slide-nav-items">
                          {category?.category_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {canScrollDown && (
                  <div className="res-scroll-btn bottom-btn">
                    <button onClick={scrollDown}>
                      <Image
                        src="/Images/home/secondary-arrow-icon.svg"
                        className="left-scroll-icon"
                        alt="items-logo"
                        width={24}
                        height={24}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* all Videos cards starts here */}
            <div className="home-creative-videos-card-container-main">
              {creativeHouseData?.length > 0 ? (
                creativeHouseData?.map((item, index) => (
                  <div
                    key={index}
                    className="home-creative-videos-card-container"
                    onClick={() => {
                      if (item?.upload_video || item?.video_url) {
                        setVideoToPlay({
                          url: item?.upload_video ? item?.upload_video : item?.video_url,
                          title: item?.title,
                          slug: item?.slug,
                        });
                        setShowModal(true);
                      }
                    }}
                  >
                    <div className="relative">
                      {item?.thumbnail && <Image
                        src={
                          item.thumbnail.startsWith("http")
                            ? item.thumbnail
                            : `https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/creative-house-thumbnail/${item.thumbnail}`
                        }
                        alt={item?.title || ""}
                        className="max-w-full h-auto"
                        width={600}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                      />}
                      {(item?.upload_video || item?.video_url) && <PlayBtn />}
                      <div className="absolute bottom-0 right-0 mb-2 mr-2">
                        <EditLink
                          path={`${ADMIN_URL}/home/creative_house/creative_house_item/show/${item?.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100px",
                  }}
                >
                  No data available
                </div>
              )}
            </div>

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
                <Modal.Footer style={{ background: "white", display: "flex", gap: "10px" }}>
                  <Link href={`/creatives/${videoToPlay?.slug}`} style={{ flex: 1 }}>
                    <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-neutral-200 bg-white text-black hover:bg-neutral-100 w-full">
                      <span style={{ marginRight: "5px" }}>
                        See How We Edit
                      </span>
                      <HiArrowUpRight
                        size={16}
                        style={{ color: "#333333", fontWeight: "bold", strokeWidth: 1 }}
                      />
                    </button>
                  </Link>
                  <Link href={`/ScheduleMeeting`} style={{ flex: 1 }}>
                    <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600] w-full">
                      <span style={{ marginRight: "5px" }}>
                        Book A Demo Call
                      </span>
                      <HiArrowUpRight
                        size={16}
                        style={{ color: "#000", fontWeight: "bold", strokeWidth: 1 }}
                      />
                    </button>
                  </Link>
                </Modal.Footer>
              </Modal>
            )}

          </div>
        </div>
        {isMobile && <PrimaryLink path="/creative-house/" />}
      </div>
    </div>
  );
};

export default CreativeHouseShowcase;
