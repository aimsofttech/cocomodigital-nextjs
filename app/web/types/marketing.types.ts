import type {
  MarketingHouseItem,
  MarketingCategory,
  OtherActivity,
  ContentCreatedItem,
  ContentCreatedCarousel,
  ContinuityProgramItem,
  CreativeHouseItem,
} from "./api.types";
import type { FAQItem, StatHighlight } from "./common.types";

export type {
  MarketingHouseItem,
  MarketingCategory,
  OtherActivity,
  ContentCreatedItem,
  ContentCreatedCarousel,
  ContinuityProgramItem,
  CreativeHouseItem,
  FAQItem,
  StatHighlight,
};

export interface WebSeriesParams {
  category_id?: number;
  limit?: number;
  offset?: number;
  slug?: string;
  [key: string]: unknown;
}

export interface CampaignObjectiveItem {
  id?: number;
  title: string;
  description?: string;
  icon?: string;
}

export interface StrategyExecutionItem {
  id?: number;
  title: string;
  description?: string;
  steps?: string[];
}

export interface ProjectSuccessItem {
  id?: number;
  metric: string;
  value: string | number;
  description?: string;
}

export interface PartnershipItem {
  id?: number;
  name: string;
  logo?: string;
  url?: string;
}

export interface RelatedCaseStudy {
  id: number;
  slug: string;
  title?: string;
  image?: string;
  category?: MarketingCategory;
}
