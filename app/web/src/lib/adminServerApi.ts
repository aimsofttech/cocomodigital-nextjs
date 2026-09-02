/**
 * Legacy types + author helpers — kept after Phase 5h Laravel-out.
 *
 * The old adminGet() HTTP client + API_BASE constant are gone;
 * all data flows through src/lib/payload.ts now. What lives here:
 *   - Type interfaces (BlogPost, BlogCategory, BlogAuthor, etc.)
 *     still imported by views/page-components as their prop shape
 *   - buildBlogAuthor() + fallbackBlogAuthor — pure functions
 *     used by the blog post detail page
 *
 * Eventual cleanup: inline the types next to their owning views
 * and let this file die. Low priority — they're stable.
 */

export interface BlogCategory {
  id: number | string;
  category_name?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface BlogPost {
  id: number | string;
  slug?: string;
  title?: string;
  image?: string;
  description?: string;
  excerpt?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  author_id?: number | string;
  author?: { id?: number | string };
  subcategory?: string;
  category_slug?: string;
  category?: { slug?: string };
  tags?: string[];
  [key: string]: unknown;
}

export interface BlogListData {
  blogItems?: BlogPost[];
  total_blog?: number;
}

export interface AuthorTemplate {
  id: number | string;
  author_image?: string;
  author_name?: string;
  author_description?: string;
  founder_text?: string;
  cto_text?: string;
}

export interface BlogAuthor {
  /** The author template's own record id, so the card can address its edit
   *  form. Absent on `fallbackBlogAuthor`, which is not a record. */
  id?: number | string;
  author_image: string;
  author_name: string;
  role_line: string;
  author_description: string;
  cta_first_name: string;
}

export interface ServiceDetailsData {
  services?: ServiceDetail;
  other_services?: ServiceDetail[];
}

export interface ServiceDetail {
  id?: number | string;
  title?: string;
  slug?: string;
  image?: string;
  featured_description?: string;
  description2?: string;
  group_single_service_portfolio_category?: PortfolioCategory[];
  [key: string]: unknown;
}

export interface PortfolioCategory {
  id: number | string;
  category_name?: string;
  groupServiceItemId?: number | string;
  [key: string]: unknown;
}

export interface PortfolioItem {
  id: number | string;
  category_id?: number | string;
  thumbnail?: string;
  video_url?: string;
  [key: string]: unknown;
}

export const fallbackBlogAuthor: BlogAuthor = {
  author_image:
    "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png",
  author_name: "From the Cocoma desk",
  role_line: "Notes by the team behind every cut, design & launch.",
  author_description:
    "Most posts here are written by editors, designers and channel ops folks who are mid-cut on real client work. If something here sparked an idea, Anil takes the 15-min call personally.",
  cta_first_name: "Anil",
};

export function buildBlogAuthor(
  authorId: number | string | null | undefined,
  authors: AuthorTemplate[] | null
): BlogAuthor {
  if (!authorId || !authors?.length) return fallbackBlogAuthor;

  const match = authors.find((author) => String(author.id) === String(authorId));
  if (!match) return fallbackBlogAuthor;

  const roleParts: string[] = [];
  if (match.founder_text) roleParts.push(`Founder · ${match.founder_text}`);
  if (match.cto_text) roleParts.push(`CTO · ${match.cto_text}`);

  return {
    id: match.id,
    author_image: match.author_image || fallbackBlogAuthor.author_image,
    author_name: match.author_name || fallbackBlogAuthor.author_name,
    role_line: roleParts.join(" & "),
    author_description: (match.author_description || "")
      .replace(/\s*click here\.?\s*$/i, "")
      .replace(/\s*if you want.*$/i, "")
      .trim(),
    cta_first_name: match.author_name?.split(" ")[0] || "the team",
  };
}
