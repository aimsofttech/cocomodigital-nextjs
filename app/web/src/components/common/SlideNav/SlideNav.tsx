// @ts-nocheck
"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useMediaQuery } from "@/src/hooks/useMediaQuery"

const SlideNav = ({ categories, activeCategoryId, setActiveCategoryId }) => {
  const scrollContainerRef = useRef(null);
  const listRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 576px)')
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const scrollAmount = 180;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Update scroll button visibility
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }
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

  return (
    <>
        {/* design for large screen */}
      {!isMobile &&
        <div className={`home-slide-nav-wrapper`}>
          <div className="home-slide-nav">
            {/* Left scroll button */}
            <button
              onClick={scrollLeft}
              className={`home-latest-work-header-scroll-button left ${showLeftButton ? "visible" : "hidden"}`}
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
            <div ref={scrollContainerRef} className="home-latest-work-header-scroll-container">
              <div className="home-latest-work-header-items-wrapper">
                <div className={`home-slide-nav-icon-title-wrapper 
          ${activeCategoryId === -1 ? "active" : ""}
        `}
                  onClick={() => setActiveCategoryId(-1)}
                >
                  <Image
                    src="/Images/home/all-content-icon.svg"
                    className="home-slide-nav-icon"
                    alt="items-logo"
                    width={24}
                    height={24}
                  />
                  <div
                    className={`home-slide-nav-items`}
                  >
                    All
                  </div>
                </div>
                {categories?.map((category, index) => (
                  <div
                    key={index}
                    className={`home-slide-nav-icon-title-wrapper ${activeCategoryId === category?.id ? "active" : ""}`}
                    onClick={() => setActiveCategoryId(category?.id)}
                  >
                    {category?.icon && (
                      <Image src={category.icon}
                      className="home-slide-nav-icon"
                      alt="items-logo"
                      width={24}
                      height={24}
                      />
                    )}
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
              className={`home-latest-work-header-scroll-button right ${showRightButton ? "visible" : "hidden"}`}
              aria-label="Scroll right"
            >
              <div className="home-latest-work-header-button-content ml-[3px]">
                <Image src="/Images/home/secondary-arrow-icon.svg" className="right-scroll-icon" alt="items-logo" width={24} height={24} />
              </div>
            </button>
          </div>
        </div>}
      {/* design for mobile screen */}
      {
        isMobile &&
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
          <div className="scroll-box" ref={listRef} onScroll={checkScrollPosition}>
            <div className="scroll-active-bar-list-wrapper">
              <div
                className={`scroll-active-bar ${activeCategoryId === -1 ? "active" : ""}`} >
              </div>
              <div className={`scroll-list-icon-title-wrapper`}
                onClick={() => setActiveCategoryId(-1)}
              >
                  <Image
                    src="/Images/home/all-content-icon.svg"
                    className="home-slide-nav-icon"
                    alt="items-logo"
                    width={24}
                    height={24}
                  />
                <div
                  className={`home-slide-nav-items`}
                >
                  All
                </div>
              </div>
            </div>
            {categories?.map((category, index) => (
              <div key={index} className="scroll-active-bar-list-wrapper">
                <div
                  className={`scroll-active-bar ${activeCategoryId === category?.id ? "active" : ""}`} >
                </div>
                <div
                  key={category?.id}
                  className={`scroll-list-icon-title-wrapper`}
                  onClick={() => setActiveCategoryId(category?.id)}
                >
                  {category?.icon && (
                    <Image
                      src={category.icon}
                      className="home-slide-nav-icon"
                      alt="items-logo"
                      width={24}
                      height={24}
                    />
                  )}
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
      }
    </>
  )
}

export default SlideNav;
