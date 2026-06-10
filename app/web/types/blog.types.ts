import type { BlogPost, BlogCategory, BlogAuthor } from "./api.types";

export type { BlogPost, BlogCategory, BlogAuthor };

export interface BlogCardProps {
  post: BlogPost;
  variant?: "default" | "featured" | "compact";
}

export interface BlogListResponse {
  data: BlogPost[];
  total?: number;
  per_page?: number;
  current_page?: number;
}

export interface BlogSearchParams {
  category_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RelatedArticle {
  id: number;
  slug: string;
  title: string;
  image?: string;
  category?: BlogCategory;
}

export interface RelatedService {
  id: number;
  slug: string;
  title: string;
  image?: string;
}
