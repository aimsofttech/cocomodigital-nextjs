// @ts-nocheck
"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RxCountdownTimer } from "react-icons/rx";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils";

const MonthlyPerformanceShowcase = ({ MonthlyPerformanceData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(
    MonthlyPerformanceData?.length > 0
      ? MonthlyPerformanceData[0]?.mps_category_name
      : ""
  );
  const [allFilterDataByCategory, setAllFilterDataByCategory] = useState([]);
  const [allSubCategoryData, setAllSubCategoryData] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [
    allFilterByCategorySubCategoryData,
    setAllFilterByCategorySubCategoryData,
  ] = useState([]);
  // const [isAnimating, setIsAnimating] = useState(false);
  const scrollContainerRef = useRef(null);
  const listRef = useRef(null);
  const cardsContainerScrollRef = useRef(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const isMobile = useMediaQuery("(max-width: 576px)");

  // Filter items by the selected category
  // const filteredCategory = MonthlyPerformanceData?.length
  //   ? MonthlyPerformanceData?.find(
  //       (category) => category?.mps_category_name === selectedCategory
  //     )
  //   : null;
  // const filteredData = filteredCategory?.mps_items || [];

  const handleNext = () => {
    // triggerAnimation();
    setCurrentIndex(
      (prevIndex) =>
        (prevIndex + 1) % allFilterByCategorySubCategoryData?.length
    );
  };

  const handlePrev = () => {
    // triggerAnimation();
    setCurrentIndex(
      (prevIndex) =>
        (prevIndex - 1 + allFilterByCategorySubCategoryData?.length) %
        allFilterByCategorySubCategoryData?.length
    );
  };

  // const triggerAnimation = () => {
  //   setIsAnimating(true);
  //   setTimeout(() => setIsAnimating(false), 500);
  // };

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

  // scroll all cards to top on category change or date change
  const allCardsScrollToTop = () => {
    if (cardsContainerScrollRef?.current) {
      cardsContainerScrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // set the active sub category on select
  const handleSubCategoryChange = (subCategory) => {
    setSelectedSubCategory(subCategory);
    allCardsScrollToTop();
  };

  // filter Data by category filter====>>>>>>>>>>
  useEffect(() => {
    if (MonthlyPerformanceData?.length > 0) {
      const filterDataByCategory = MonthlyPerformanceData?.find(
        (item) => item?.mps_category_name === selectedCategory
      );
      if (filterDataByCategory) {
        setAllFilterDataByCategory(filterDataByCategory);
      }
    }
  }, [MonthlyPerformanceData, selectedCategory]);

  //  collect all subcategory list in an array for filter by date
  useEffect(() => {
    if (allFilterDataByCategory) {
      const getSubCategory = allFilterDataByCategory?.mps_subcategory?.map(
        (subCategory) => subCategory?.mps_subcategory_name
      );
      if (getSubCategory?.length > 0) {
        setAllSubCategoryData(getSubCategory);
      }
    }
  }, [allFilterDataByCategory]);

  // select current sub category data for search by date
  useEffect(() => {
    if (!selectedSubCategory && allSubCategoryData?.length > 0) {
      setSelectedSubCategory(allSubCategoryData[0]);
    }
  }, [selectedSubCategory, allSubCategoryData]);

  // set all cards data by category and sub category====>>>>>>>>>>
  useEffect(() => {
    if (selectedSubCategory && allFilterDataByCategory) {
      const filterByCategorySubCategoryData =
        allFilterDataByCategory?.mps_subcategory?.find(
          (subCategory) =>
            subCategory?.mps_subcategory_name === selectedSubCategory
        );
      if (filterByCategorySubCategoryData?.mps_items?.length > 0) {
        setAllFilterByCategorySubCategoryData(
          filterByCategorySubCategoryData?.mps_items
        );
      }
    }
  }, [allFilterDataByCategory, selectedSubCategory]);

  return (
    <div className="home-monthly-performave-main-wrapper">
      <div className="home-monthly-performave-main">
        <div className="home-monthly-performave-title-filter-wrapper">
          <h3 className="home-monthly-performave-title font-primary">
            Monthly Performance Showcase
            <EditLink
              path={`${ADMIN_URL}/home/performance/monthly_performance_showcase_category`} />
          </h3>
          <div className="home-monthly-performave-filter-wrapper">
            <RxCountdownTimer size={30} />
            <select
              className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ border: "none" }}
              value={selectedSubCategory}
              onChange={(e) => handleSubCategoryChange(e.target.value)}
            >
              {allSubCategoryData?.length > 0 &&
                allSubCategoryData?.map((subCategory, index) => (
                  <option key={index} value={subCategory}>
                    {subCategory}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* header For desktop & mobile */}
        {!isMobile && (
          <div className={`home-slide-nav-wrapper`}>
            <div className="home-slide-nav">
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
              <div
                ref={scrollContainerRef}
                className={`home-latest-work-header-scroll-container ${!showLeftButton && !showRightButton
                  ? "justify-center"
                  : " "
                  }`}
              >
                <div className="home-latest-work-header-items-wrapper">
                  {MonthlyPerformanceData?.map((category) => (
                    <div
                      key={category?.id}
                      className={`home-slide-nav-icon-title-wrapper ${selectedCategory === category?.mps_category_name
                        ? "active"
                        : ""
                        }`}
                      onClick={() => {
                        allCardsScrollToTop();
                        setSelectedCategory(category?.mps_category_name);
                      }}
                    >
                      {category?.mps_icon && <Image
                        src={category.mps_icon}
                        className="home-slide-nav-icon"
                        alt="items-logo"
                        width={32}
                        height={32}
                      />}
                      <p className="home-slide-nav-items">
                        {category?.mps_category_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
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

        {!isMobile && (
          <div
            className="border rounded p-4 w-full relative"
            style={{ background: "#F1F1F1" }}
          >
            {allFilterByCategorySubCategoryData?.length > 0 ? (
              <div>
                <div className={`flex flex-wrap -mx-3`}>
                  <div className="lg:w-2/3 lg:px-3 md:w-7/12 md:px-3">
                    <h2 className="font-bold ">
                      {
                        allFilterByCategorySubCategoryData[currentIndex]
                          ?.mps_title
                      }
                    </h2>
                    <p className="pt-3">
                      {
                        allFilterByCategorySubCategoryData[currentIndex]
                          ?.mps_description
                      }
                    </p>
                  </div>
                  <div className="lg:w-1/3 lg:px-3 md:w-5/12 md:px-3">
                    {allFilterByCategorySubCategoryData[currentIndex]?.mps_img && (
                      <Image
                        src={allFilterByCategorySubCategoryData[currentIndex].mps_img}
                        alt={allFilterByCategorySubCategoryData[currentIndex]?.mps_title || ""}
                        className="max-w-full h-auto rounded summary-images"
                        width={600}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    className=" monthly-performance-left-btn mr-3"
                    onClick={handlePrev}
                    aria-label="Previous"
                  >
                    <IoMdArrowBack size={22} />
                  </button>
                  <button
                    className=" monthly-performance-right-btn"
                    onClick={handleNext}
                    aria-label="Next"
                  >
                    <IoMdArrowForward size={22} />
                  </button>
                </div>
                <div className="absolute top-0 right-0 mt-2 mr-3">
                  <EditLink
                    path={`${ADMIN_URL}/home/performance/monthly_performance_showcase_item/show/${allFilterByCategorySubCategoryData[currentIndex]?.id}`} />
                </div>
              </div>
            ) : (
              <p className="text-center">
                No items available in this category.
              </p>
            )}
          </div>
        )}

        {isMobile && (
          <div className="home-slide-nav-all-card-main-wrapper">
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
                className={`scroll-box ${!canScrollUp && !canScrollUp ? "responsive-header-item" : " "
                  }`}
                ref={listRef}
                onScroll={checkScrollPosition}
              >
                {/* <div className="scroll-active-bar-list-wrapper">
                  <div
                    className={`scroll-active-bar ${
                      selectedCategory === "all" ? "active" : ""
                    }`}
                  ></div>
                  <div
                    className={`scroll-list-icon-title-wrapper`}
                    onClick={() => setActiveCategory("all")}
                  >
                    <img
                      src="/Images/home/all-content-icon.svg"
                      className="home-slide-nav-icon"
                      alt="items-logo"
                    />
                    <div className={`home-slide-nav-items`}>All</div>
                  </div>
                </div> */}
                {MonthlyPerformanceData?.map((category, index) => (
                  <div key={index} className="scroll-active-bar-list-wrapper">
                    <div
                      className={`scroll-active-bar ${selectedCategory === category?.mps_category_name
                        ? "active"
                        : ""
                        }`}
                    ></div>
                    <div
                      key={category?.id}
                      className={`scroll-list-icon-title-wrapper`}
                      onClick={() => {
                        setSelectedCategory(category?.mps_category_name);
                        allCardsScrollToTop();
                      }}
                    >
                      {category?.mps_icon && <Image
                        src={category.mps_icon}
                        className="home-slide-nav-icon"
                        alt="items-logo"
                        width={32}
                        height={32}
                      />}
                      <p className="home-slide-nav-items">
                        {category?.mps_category_name}
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

            {/* all Videos cards starts here */}

            {allFilterByCategorySubCategoryData?.length > 0 && (
              <div
                ref={cardsContainerScrollRef}
                className="home-monthly-performance-cards-wrapper"
              >
                {allFilterByCategorySubCategoryData.map((item, index) => (
                  <div key={index} className="home-monthly-performance-cards">
                    {item.mps_img && <Image src={item.mps_img} alt={item.mps_title || ""} width={600} height={400} style={{ width: "100%", height: "auto" }} />}
                    <div className="home-monthly-performance-cards-content-wrapper">
                      <h1>{item.mps_title}</h1>
                      <p>{item.mps_description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPerformanceShowcase;
