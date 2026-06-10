"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AOS from "aos";

/**
 * Side-effects that need to run once per page navigation but don't
 * have a natural home in any single view: scroll-to-top + AOS init.
 *
 * Phase 5b: dropped the user-rehydration block (setUser from
 * localStorage → Redux). The me slice it dispatched into is gone;
 * marketing-site login state is no longer tracked anywhere.
 */
export default function SiteShellEffects() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  return null;
}
