"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
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

  let state: unknown = null;
  if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem(stateKey(pathname));
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch {
        state = null;
      }
    }
  }

  return {
    pathname,
    search: typeof window !== "undefined" ? window.location.search : "",
    hash: typeof window !== "undefined" ? window.location.hash : "",
    state,
  };
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
