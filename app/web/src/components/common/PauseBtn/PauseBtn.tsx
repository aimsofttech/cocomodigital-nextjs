// @ts-nocheck
import React from "react";
import { FaPause } from "react-icons/fa";

const PauseBtn = () => {
  return (
    <>
      <div className="group absolute left-1/2 top-1/2 flex size-[50px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(255,193,7,0.494)] text-center transition-colors duration-300 hover:bg-[rgba(0,0,0,0.494)] max-[500px]:size-10 max-[380px]:size-[37px]">
        <FaPause className="ml-px text-[1.2rem] text-black transition-colors duration-300 group-hover:text-brand max-[500px]:ml-[3px] max-[500px]:text-base" />
      </div>
    </>
  );
};

export default PauseBtn;
