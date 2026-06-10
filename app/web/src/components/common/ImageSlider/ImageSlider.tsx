// @ts-nocheck
"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
const ImageSlider = ({data}) => {
  const containerRef = useRef(null);

  const [position, setPosition] = useState(95);
  const [dragging, setDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Move slider
  const moveSlider = (clientX) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    let newX = clientX - rect.left;
    let percent = (newX / rect.width) * 100;

    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    setPosition(percent);

    // Change image based on position
    if (percent < 30) {
      setActiveIndex(1);
    } else {
      setActiveIndex(0);
    }
  };

  // Mouse Move
  const handleMouseMove = (e) => {
    if (!dragging) return;
    moveSlider(e.clientX);
  };

  // Touch Move
  const handleTouchMove = (e) => {
    if (!dragging) return;
    moveSlider(e.touches[0].clientX);
  };

  useEffect(() => {
    const stopDragging = () => setDragging(false);

    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchend", stopDragging);

    return () => {
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchend", stopDragging);
    };
  }, []);

  return (
      <div
        className="slider-container-wrapper"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Images */}
        {data?.images?.map((img, index) =>
          img && (
            <Image
              key={index}
              src={img}
              alt="slider"
              className={`swipe-image ${activeIndex === index ? "active" : ""}`}
              draggable="false"
              width={600}
              height={400}
              style={{ width: "100%", height: "auto" }}
            />
          )
        )}

        {/* Slider Line */}
        <div
          className="slider-line"
          style={{ left: `${position}%` }}
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
        >
          <div className="line-circle">‹ ›</div>
        </div>
      </div>
  );
};

export default ImageSlider;