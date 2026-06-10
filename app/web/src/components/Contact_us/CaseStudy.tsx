// @ts-nocheck
import Image from "next/image";
import React from "react";

const CaseStudies = () => {
  const caseStudies = [
    {
      logo: "../../Images/amazon_dark.svg",
      quote: "cocoma is a strategic and insightful partner.",
      growth: "879%",
      name: "Carlo Carli",
      position: "General Manager",
    },
    {
      logo: "../../Images/langistan_dark.svg",
      quote: "The cocoma team is fast, savvy, and truly ahead of the curve.",
      growth: "600%",
      name: "Carlo Carli",
      position: "General Manager",
    },
    {
      logo: "../../Images/amazonminitv_dark.svg",
      quote: "We’ve found the cocoma team to be a passionate partner.",
      growth: "350%",
      name: "Carlo Carli",
      position: "General Manager",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 my-5">
      <div className="flex flex-wrap -mx-3">
        {caseStudies.map((study, index) => (
          <div className="md:w-1/3 md:px-3 mb-4" key={index}>
            <div className=" case-study-card p-3 shadow-sm">
              <div className="text-center">
                <Image src={study.logo} alt={study.logo} width={150} height={60} />
              </div>
              <hr />
              <blockquote className="border-l-4 border-neutral-300 pl-4 italic mb-4">
                <b>{study.quote}</b>
              </blockquote>
              <p className="text-neutral-500">
                Lorem ipsum dolor sit amet consectetur. Congue tortor tortor in
                natoque quam dictum hendrerit odio aliquam. Risus lorem
                volutpat.
              </p>
              <div className="flex items-center mt-3">
                <Image
                  src="../../Images/carli-testimonial.png.svg"
                  alt={study.name}
                  className="rounded-full mr-3"
                  width={48}
                  height={48}
                />
                <div>
                  <strong>{study.name}</strong>
                  <br />
                  <span className="text-neutral-500">{study.position}</span>
                </div>
              </div>
              <div className="mt-4">
                <h3 className=" mb-1">↑ {study.growth}</h3>
                <p className="">See how we grew {study.growth} →</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* <div className="text-center mt-4">
        <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-black text-white hover:bg-neutral-800 p-3">See More Case Studies</button>
      </div> */}
    </div>
  );
};

export default CaseStudies;
