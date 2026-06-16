// @ts-nocheck
import { useEffect } from "react";
import { useLocation } from "@/src/lib/navigation";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top only when the route (pathname) actually changes —
    // i.e. on first render / navigation. We depend on the pathname
    // string, NOT the `location` object: useLocation() returns a fresh
    // object literal every render, so depending on it would re-fire on
    // every re-render (e.g. each search keystroke or pagination click).
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null; // No UI, just side effects
};

export default ScrollToTop;
