import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface HrefLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

export type To = string | HrefLocation;

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to?: To;
  href?: To;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
}

export interface NavigateProps {
  to: To;
  replace?: boolean;
  state?: unknown;
}

export interface UseParamsResult {
  slug?: string;
  [key: string]: string | undefined;
}

export interface LocationResult {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}
