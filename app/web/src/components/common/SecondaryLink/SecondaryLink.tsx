// @ts-nocheck
import Link from "next/link";
import { HiArrowUpRight } from "react-icons/hi2";

const SecondaryLink = ({ title, path, className }: { title: string; path: string; className?: string }) => {
  return (
    <Link
      href={path}
      className={`group relative inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-2 border-black bg-brand px-6 py-3 font-primary text-xl font-black uppercase tracking-[0.03em] text-black no-underline shadow-[4px_4px_0_#000] transition-[transform,box-shadow,background-color] duration-100 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:bg-brand hover:shadow-[7px_7px_0_#000] active:-translate-x-px active:-translate-y-px active:shadow-[5px_5px_0_#000] max-[768px]:gap-1.5 max-[768px]:whitespace-nowrap max-[768px]:px-[22px] max-[768px]:py-[11px] max-[768px]:text-base max-[768px]:tracking-[0.02em] max-[400px]:px-4 max-[400px]:py-2.5 max-[400px]:text-[0.85rem] max-[400px]:tracking-[0.01em] max-[360px]:gap-1 max-[360px]:whitespace-normal max-[360px]:px-3.5 max-[360px]:py-2.5 max-[360px]:text-center max-[360px]:text-xs max-[360px]:leading-[1.2] ${className}`}
    >
      {title}
      <HiArrowUpRight
        size={21}
        className="relative z-[1] inline-block text-black transition-transform duration-400 group-hover:translate-x-1.5 group-hover:rotate-[15deg]"
      />
    </Link>
  );
};

export default SecondaryLink;
