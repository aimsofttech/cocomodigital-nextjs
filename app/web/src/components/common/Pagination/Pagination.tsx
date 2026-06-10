// @ts-nocheck
import React from "react";
import { FaAngleLeft } from "react-icons/fa";
import { FaAngleRight } from "react-icons/fa";

const Pagination = ({
  totalPages,
  currentPage,
  onPageChange,
  scrollToTopToCards,
}) => {
  const maxVisiblePages = 5;
  const pageButtonClass =
    "inline-flex h-10 min-w-10 touch-manipulation items-center justify-center rounded-[var(--radius-sm)] border-2 border-strong bg-page px-3 py-0 font-primary text-[0.95rem] font-black tracking-[var(--tracking-snug)] text-strong transition-[transform,box-shadow,background,color] duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:transform-none max-[480px]:h-9 max-[480px]:min-w-9 max-[480px]:px-2 max-[480px]:text-[0.85rem] hover:enabled:-translate-x-px hover:enabled:-translate-y-px hover:enabled:bg-[rgba(255,240,0,0.18)] hover:enabled:shadow-[2px_2px_0_var(--text-strong)]";
  const activePageClass =
    "!border-strong !bg-brand !text-black -translate-x-px -translate-y-px shadow-[3px_3px_0_var(--text-strong)] hover:enabled:!-translate-x-0.5 hover:enabled:!-translate-y-0.5 hover:enabled:!bg-brand hover:enabled:shadow-[5px_5px_0_var(--text-strong)]";

  const getPagination = () => {
    let pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="my-6 flex flex-wrap items-center justify-center gap-2 max-[480px]:gap-1">
      <button
        onClick={() => {
          onPageChange(currentPage - 1);
          scrollToTopToCards();
        }}
        disabled={currentPage === 1}
        className={pageButtonClass}
      >
        <FaAngleLeft />
      </button>

      {getPagination().map((page, index) =>
        page === "..." ? (
          <span
            key={index}
            className="inline-flex h-10 items-center px-1 font-primary text-[0.95rem] font-black text-muted max-[480px]:h-9"
          >
            ...
          </span>
        ) : (
          <button
            key={index}
            onClick={() => {
              onPageChange(page);
              scrollToTopToCards();
            }}
            className={`${pageButtonClass} ${currentPage === page ? activePageClass : ""}`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => {
          onPageChange(currentPage + 1);
          scrollToTopToCards();
        }}
        disabled={currentPage === totalPages}
        className={pageButtonClass}
      >
        <FaAngleRight />
      </button>
    </div>
  );
};

export default Pagination;
