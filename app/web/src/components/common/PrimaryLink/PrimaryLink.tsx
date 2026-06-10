// @ts-nocheck
import Link from "next/link";

const PrimaryLink = ({ path }) => {
  return (
    <Link
      href={path}
      className="flex items-center justify-center gap-[0.8rem] rounded-lg border-2 border-black bg-white px-5 py-2 font-primary text-base font-black uppercase tracking-[0.06em] text-black hover:bg-brand"
    >
      View All
      <img
        className="w-3.5"
        src="/Images/home/dropdown-arrow.svg"
        alt="down arrow icon"
      />
    </Link>
  );
};

export default PrimaryLink;
