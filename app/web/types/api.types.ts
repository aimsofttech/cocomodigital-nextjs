import type { FAQItem, ImageSlide, StatHighlight } from "./common.types";

// ─── Service / Category ─────────────────────────────────────────────────────
export interface ServiceCategory {
  id: number;
  category_name: string;
  slug?: string;
  image?: string;
  order?: number;
}

export interface ServiceItem {
  id: number;
  title: string;
  slug: string;
  image?: string;
  description?: string;
  short_description?: string;
  category_id?: number;
  category?: ServiceCategory;
  order?: number;
  [key: string]: unknown;
}

export interface ServiceDetails extends ServiceItem {
  content?: string;
  meta_title?: string;
  meta_description?: string;
  portfolio_items?: ServicePortfolioItem[];
  faqs?: FAQItem[];
  group_services?: ServiceItem[];
}

export interface ServicePortfolioItem {
  id: number;
  image?: string;
  video_url?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface GroupService {
  id: number;
  name: string;
  slug?: string;
  services?: ServiceItem[];
}

// ─── Marketing House / Web Series ───────────────────────────────────────────
export interface MarketingHouseItem {
  id: number;
  slug: string;
  title?: string;
  marketing_video?: string;
  poster_image?: string;
  images?: ImageSlide[];
  highlights_title?: string;
  highlights_description?: string;
  highlights?: StatHighlight[];
  category?: MarketingCategory;
  category_id?: number;
  [key: string]: unknown;
}

export interface MarketingCategory {
  id: number;
  name: string;
  slug?: string;
}

export interface OtherActivity {
  id: number;
  title?: string;
  image?: string;
  video_url?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ContentCreatedItem {
  id: number;
  title?: string;
  image?: string;
  video_url?: string;
  [key: string]: unknown;
}

export interface ContentCreatedCarousel {
  id: number;
  image?: string;
  [key: string]: unknown;
}

export interface ContinuityProgramItem {
  id: number;
  title?: string;
  image?: string;
  [key: string]: unknown;
}

// ─── Creative House ──────────────────────────────────────────────────────────
export interface CreativeHouseItem {
  id: number;
  slug: string;
  title?: string;
  image?: string;
  video_url?: string;
  category?: ServiceCategory;
  category_id?: number;
  [key: string]: unknown;
}

// ─── Blog ────────────────────────────────────────────────────────────────────
export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string;
  image?: string;
  thumbnail?: string;
  category?: BlogCategory;
  category_id?: number;
  author?: BlogAuthor;
  published_at?: string;
  created_at?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
  reading_time?: number;
  [key: string]: unknown;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug?: string;
}

export interface BlogAuthor {
  id?: number;
  name: string;
  bio?: string;
  image?: string;
  role?: string;
  [key: string]: unknown;
}

// ─── Jobs / Career ───────────────────────────────────────────────────────────
export interface JobDetails {
  id: number;
  slug: string;
  title: string;
  department?: string;
  job_type?: string;
  work_type?: string;
  location?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  experience?: string;
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface JobCategory {
  id: number;
  name: string;
  slug?: string;
}

export interface JobApplicationPayload {
  name: string;
  email: string;
  phone?: string;
  job_id?: number | string;
  resume?: File | string;
  cover_letter?: string;
  [key: string]: unknown;
}

// ─── Success Stories ─────────────────────────────────────────────────────────
export interface SuccessStory {
  id: number;
  slug: string;
  title?: string;
  client_name?: string;
  image?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

// ─── Misc API shapes ─────────────────────────────────────────────────────────
export interface BrandItem {
  id: number;
  name: string;
  image?: string;
  url?: string;
}

export interface BannerItem {
  id: number;
  title?: string;
  subtitle?: string;
  image?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface OurAdvantageItem {
  id: number;
  title?: string;
  description?: string;
  icon?: string;
  [key: string]: unknown;
}

export interface MonthlyPerformanceItem {
  id: number;
  month?: string;
  views?: string | number;
  subscribers?: string | number;
  [key: string]: unknown;
}

export interface CommonApiData {
  service_category?: ServiceCategory[];
  [key: string]: unknown;
}

export interface BookACallData {
  id: number;
  link?: string;
  [key: string]: unknown;
}

export interface ContactFormPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  [key: string]: unknown;
}

export interface FreeConsultationPayload {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  [key: string]: unknown;
}

export interface HomeYoutubeCard {
  id: number;
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  [key: string]: unknown;
}
