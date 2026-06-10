// @ts-nocheck
import React from "react";
import Image from "next/image";
import Marquee from "react-fast-marquee";

interface MarqueeItem {
  id: number;
  brand_image: string;
  brand_name: string;
}

export default function MarqueeComponent() {
  const marqueeData: MarqueeItem[] = [
    { id: 1, brand_image: "/Images/solution/Isolation_Mode (1).svg", brand_name: "Brand 1" },
    { id: 2, brand_image: "/Images/solution/Isolation_Mode (2).svg", brand_name: "Brand 2" },
    { id: 3, brand_image: "/Images/solution/Isolation_Mode (3).svg", brand_name: "Brand 3" },
    { id: 4, brand_image: "/Images/solution/Isolation_Mode.svg", brand_name: "Brand 4" },
    { id: 5, brand_image: "/Images/solution/bubble (1).svg", brand_name: "Brand 5" },
    { id: 6, brand_image: "/Images/solution/bubble.svg", brand_name: "Brand 6" },
  ];

  return (
    <div className="marquee-main">
      <center>
        <h4 className="marquee-head" style={{ color: "black", textTransform: "uppercase" }}>
          Trusted by brands you love
        </h4>
      </center>
      <Marquee className="mt-3 mb-3">
        {marqueeData.map((brand) => (
          <Image
            key={brand.id}
            src={brand.brand_image}
            alt={brand.brand_name}
            style={{ width: "100px", marginRight: "4rem", marginLeft: "4rem" }}
            width={100}
            height={50}
          />
        ))}
      </Marquee>
    </div>
  );
}
