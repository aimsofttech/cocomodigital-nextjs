// @ts-nocheck
import { HiArrowUpRight } from "react-icons/hi2";

const PrimaryButton = ({
  title,
  path,
  className,
  loading,
  btnClickHandler,
}) => {
  return (
    <button
      type="submit"
      className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black bg-brand px-5 py-3 font-primary text-2xl font-black uppercase tracking-[0.04em] text-black shadow-[4px_4px_0_#000] outline-none transition-[transform,box-shadow,background-color] duration-100 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:bg-brand hover:shadow-[7px_7px_0_#000] active:-translate-x-px active:-translate-y-px active:shadow-[5px_5px_0_#000] max-[400px]:px-[5px] max-[400px]:py-2.5 max-[400px]:text-[1.1rem] ${className}`}
      onClick={btnClickHandler}
    >
      {title}{" "}
      <HiArrowUpRight
        size={21}
        style={{ color: "#000", fontWeight: "bold", strokeWidth: 1 }}
      />
    </button>
  );
};

export default PrimaryButton;
