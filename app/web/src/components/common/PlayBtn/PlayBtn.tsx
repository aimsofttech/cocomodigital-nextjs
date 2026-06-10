// @ts-nocheck
import { FaPlay } from "react-icons/fa";

const PlayBtn = () => {
  return (
    <>
      <div className="cocoma-play-btn absolute left-1/2 top-1/2 flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-black bg-brand text-center shadow-[3px_3px_0_#000] [transform:translate(-50%,-50%)] transition-[box-shadow,transform] duration-200 hover:[transform:translate(calc(-50%_-_2px),calc(-50%_-_2px))] hover:shadow-[5px_5px_0_#000] active:[transform:translate(calc(-50%_-_0.5px),calc(-50%_-_0.5px))] active:shadow-[4px_4px_0_#000] max-[500px]:size-[46px] max-[380px]:size-[42px]">
        <FaPlay className="ml-1 text-[1.2rem] text-black max-[500px]:ml-[3px] max-[500px]:text-base" />
      </div>
    </>
  );
};

export default PlayBtn;
