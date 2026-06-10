// @ts-nocheck
import React from "react";

const SearchInput = ({ setSearchInput }) => {
  return (
    <div className="flex h-[45px] w-full max-w-[300px] items-center justify-center rounded-md border-2 border-brand px-[0.8rem] focus-within:shadow-[0_0_8px_2px_rgba(245,197,24,0.3),0_0_12px_4px_rgba(245,197,24,0.3)] max-[850px]:max-w-none">
      <input
        className="w-full border-0 px-0 py-[5px] text-base outline-none max-[600px]:py-0 max-[600px]:text-sm"
        type="text"
        name="category"
        placeholder="Search..."
        onChange={(event) => setSearchInput(event.target.value)}
      />
    </div>
  );
};

export default SearchInput;
