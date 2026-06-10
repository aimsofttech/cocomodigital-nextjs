import type { ChannelCategory, SolutionTap } from "./common.types";
import type { HomeYoutubeCard, BrandItem, BannerItem, OurAdvantageItem } from "./api.types";

export interface HomeData {
  banners?: BannerItem[];
  brands?: BrandItem[];
  advantages?: OurAdvantageItem[];
  youtube_cards?: HomeYoutubeCard[];
  [key: string]: unknown;
}

export interface StatsItem {
  id?: number;
  value: string | number;
  label: string;
  suffix?: string;
  prefix?: string;
}

export interface ExploreServiceItem {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  path?: string;
  image?: string;
}

export type { ChannelCategory, SolutionTap };
