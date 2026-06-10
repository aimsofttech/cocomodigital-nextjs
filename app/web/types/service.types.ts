import type {
  ServiceCategory,
  ServiceItem,
  ServiceDetails,
  ServicePortfolioItem,
  GroupService,
} from "./api.types";
import type { FAQItem } from "./common.types";

export type { ServiceCategory, ServiceItem, ServiceDetails, ServicePortfolioItem, GroupService };

export interface ServiceCardProps {
  service: ServiceItem;
  onClick?: () => void;
}

export interface ServiceSliderProps {
  services: ServiceItem[];
  title?: string;
}

export interface ServiceFAQProps {
  faqs: FAQItem[];
  title?: string;
}

export interface ServicePortfolioProps {
  items: ServicePortfolioItem[];
  slug?: string;
}

export interface ServiceParams {
  category_id?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}
