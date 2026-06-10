// @ts-nocheck
import { useState } from "react";
import { MdOutlineArrowOutward } from "react-icons/md";

export default function Right() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex">
        <div className="relative">
          <button
            style={{ color: "white", fontSize: 18 }}
            className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
          >
            En <span className="ml-2 text-xs">v</span>
          </button>
          {open && (
            <ul className="absolute z-50 mt-2 min-w-40 rounded-md border border-neutral-200 bg-white p-2 text-black shadow-lg">
              <li>
                <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100" type="button">
                  English
                </button>
              </li>
              <li>
                <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100" type="button">
                  Hindi
                </button>
              </li>
              <li>
                <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100" type="button">
                  French
                </button>
              </li>
            </ul>
          )}
        </div>
        <div>
          <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600]">
            Get Started Today <MdOutlineArrowOutward size={25} />
          </button>
        </div>
      </div>
    </>
  );
}
