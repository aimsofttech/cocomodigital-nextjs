import type { ReactNode, CSSProperties } from "react";

// ─── Navigation ────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  to: string;
}

export interface LocationState {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export type NavigateFn = (to: string | number, options?: NavigateOptions) => void;

// ─── Generic helpers ────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  status?: number;
  message?: string;
}

export interface PaginatedData<T> {
  data: T[];
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
}

// ─── Media / slides ─────────────────────────────────────────────────────────
export interface ImageSlide {
  image: string;
  upload_video?: string;
  video_url?: string;
  marketing_video?: string;
}

// ─── Shared data shapes ─────────────────────────────────────────────────────
export interface FAQItem {
  id?: number | string;
  question: string;
  answer: string;
}

export interface StatHighlight {
  id?: number;
  value: string | number;
  name: string;
  delay?: number;
  slug?: string;
}

export interface SolutionTap {
  id: number;
  title: string;
  discription: string;
  img: string;
}

export interface ChannelItem {
  id: number;
  name: string;
  subscribers: string;
  image: string;
  path?: string;
  work?: string;
}

export interface ChannelCategory {
  title: string;
  data: ChannelItem[];
}

export interface JobTypeMap {
  full_time: string;
  part_time: string;
  freelance: string;
  internship: string;
  contract: string;
}

export interface WorkTypeMap {
  on_site: string;
  remote: string;
  hybrid: string;
}

// ─── Shared component prop shapes ───────────────────────────────────────────
export interface ChildrenProps {
  children: ReactNode;
}

export interface StyleProps {
  className?: string;
  style?: CSSProperties;
}
