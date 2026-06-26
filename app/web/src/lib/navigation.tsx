"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  LinkProps,
  NavigateProps,
  UseParamsResult,
  LocationResult,
  To,
} from "../../types/navigation.types";
import type { NavigateOptions, NavigateFn } from "../../types/common.types";

const STATE_PREFIX = "__cocoma_navigation_state__:";

function stateKey(pathname: string): string {
  return `${STATE_PREFIX}${pathname || "/"}`;
}

function normalizeHref(to: To | undefined): string {
  if (typeof to === "string") return to;
  if (to?.pathname) {
    const search = to.search || "";
    const hash = to.hash || "";
    return `${to.pathname}${search}${hash}`;
  }
  return "/";
}

export function Link({ to, href, replace: _replace, state: _state, ...props }: LinkProps) {
  return <NextLink href={normalizeHref(href || to)} {...props} />;
}

export function useNavigate(): NavigateFn {
  const router = useRouter();

  return useCallback((to: string | number, options: NavigateOptions = {}) => {
    if (typeof to === "number") {
      if (typeof window !== "undefined") {
        window.history.go(to);
      }
      return;
    }

    const href = normalizeHref(to);

    if (typeof window !== "undefined" && options?.state) {
      sessionStorage.setItem(stateKey(href), JSON.stringify(options.state));
    }

    if (options?.replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  }, [router]);
}

export function useLocation(): LocationResult {
  const pathname = usePathname() || "/";

  /* sessionStorage/window are browser-only, but on the client's very
     first render (the one React hydrates against) they're already
     populated by navigate() — reading them inline here would make
     that first render diverge from the server's (always-empty)
     render and trigger a hydration mismatch. Default to the SSR-safe
     empty values and fill in the real ones in an effect, after
     hydration has already reconciled. */
  const [state, setState] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(stateKey(pathname));
    try {
      setState(raw ? JSON.parse(raw) : null);
    } catch {
      setState(null);
    }
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, [pathname]);

  return { pathname, search, hash, state };
}

export function useParams(): UseParamsResult {
  const params = useNextParams();
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  return {
    ...params,
    slug: (params as Record<string, string>)?.slug || lastSegment,
  };
}

export function Navigate({ to, replace = false, state }: NavigateProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to as string, { replace, state });
  }, [navigate, replace, state, to]);

  return null;
}
