// @ts-nocheck
import { useEffect } from "react";
import { useLocation } from "@/src/lib/navigation";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top whenever the route changes
    window.scrollTo(0, 0);
  }, [location]);

  return null; // No UI, just side effects
};

export default ScrollToTop;
