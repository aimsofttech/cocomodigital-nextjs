// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import PlayBtn from "../common/PlayBtn/PlayBtn";

export default function AllWebSeries() {
  const [isExpanded, setIsExpanded] = useState(false);

  const fullText =
    "Lorem ipsum dolor sit amet consectetur. Faucibus nulla habitant condimentum neque placerat volutpat laoreet ultrices pharetra. Additional text: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vel lectus libero. Sed venenatis, ipsum sit amet gravida aliquam, purus justo laoreet dolor, et fermentum enim erat eu arcu.";

  // Function to truncate text
  const truncateText = (text, maxLength) => {
    if (text?.length <= maxLength) return text;
    return text?.slice(0, maxLength) + "...";
  };

  // Text to display
  const visibleText = isExpanded ? fullText : truncateText(fullText, 200);

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 mt-5">
        <div className="flex flex-wrap -mx-3">
          <div className="lg:w-1/2 lg:px-3 md:w-1/2 md:px-3 lg:order-1 order-2 md:order-2">
            <div className="flex items-center justify-between mb-5">
              <h1 className="font-bold text-5xl leading-tight">2024</h1>
              <select className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20 w-1/4" aria-label="Select Filter">
                <option value="All" defaultValue>
                  All
                </option>
                <option value="Campaigns">Campaigns</option>
                <option value="Projects">Projects</option>
              </select>
            </div>
            <div className=" mt-5">
              <h5 className="mt-5">
                Innovative digital marketing that drove results across social
                media and streaming platforms.
              </h5>
              <p className="mt-5">
                {visibleText}
                <span
                  className="font-bold ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? "See Less" : "See More"}
                </span>
              </p>
            </div>
          </div>
          <div className="md:w-1/2 md:px-3 lg:w-1/2 lg:px-3 mb-4 order-1 lg:order-2 md:order-2 relative text-center">
            <div className="relative">
              <Image
                src="../../Images/AllWebSerise.svg"
                alt="Project Poster"
                className="max-w-full h-auto rounded shadow-sm"
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <PlayBtn />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
