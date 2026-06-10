import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/blog'));

import Blog from "@/src/views/Blog/Blog";
import {
  getBlogPosts,
  getBlogCategories,
  imageUrl,
} from "@/src/lib/content";
import type {
  BlogCategory,
  BlogPost,
} from "@/src/lib/adminServerApi";
import blogManifest from "@/src/content/blog.generated.json";

const limit = 10;

/* Adapter: the API's BlogCategory shape → the legacy Laravel
   shape the Blog view component already expects. Lets us swap the
   data source without touching the view. Phase 4 will eventually
   port the view itself to native the API shapes; for now this
   adapter is the migration shim. */
const adaptCategory = (c: any): BlogCategory => ({
  id: c.id,
  /* Smoke fix: Category.tsx reads `blog_category_name` and iterates
     `sub_categories`. Supply both legacy + new names; sub-categories
     aren't in the the API schema yet so default to an empty array. */
  blog_category_name: c.name,
  blog_category_slug: c.slug,
  category_name: c.name,
  slug: c.slug,
  sub_categories: [],
});

/* Adapter: the API's BlogPost → legacy BlogPost shape. Field
   renames + image fallback to legacyImageUrl (Phase 6 cleanup will
   re-attach proper Media docs). */
const adaptPost = (p: any): BlogPost => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  image: imageUrl(p),
  description: p.content,
  excerpt: p.excerpt,
  created_at: p.published_at ?? p.createdAt,
  updated_at: p.updatedAt,
  author_id: typeof p.author === "object" ? p.author?.id : p.author,
  author: typeof p.author === "object" ? p.author : undefined,
  category_slug: typeof p.category === "object" ? p.category?.slug : undefined,
  category: typeof p.category === "object" ? p.category : undefined,
  tags: Array.isArray(p.tags) ? p.tags.map((t: any) => t.tag ?? t) : [],
});

export default async function Page() {
  /* Two parallel fetches — the API's totalDocs is the authoritative
     count; we'll merge markdown posts into the response. */
  const [{ docs: payloadCategories }, { docs: payloadPosts, totalDocs }] =
    await Promise.all([getBlogCategories(), getBlogPosts({ limit })]);

  const apiPosts = payloadPosts.map(adaptPost);
  const initialCategories = payloadCategories.map(adaptCategory);

  /* Preserve the existing markdown-blog fallback so any locally
     authored posts (src/content/blog/) keep showing alongside
     CMS posts. The markdown stack will likely retire after Phase 5
     content team onboarding, but doesn't block this conversion. */
  const markdownPosts = ((blogManifest as { posts?: BlogPost[] }).posts ?? []);
  const markdownSlugs = new Set(markdownPosts.map((post) => post.slug));
  const mergedPosts = [
    ...markdownPosts,
    ...apiPosts.filter((post) => !markdownSlugs.has(post.slug)),
  ].sort((a, b) => {
    const da = a.date || a.created_at || a.updated_at || "";
    const db = b.date || b.created_at || b.updated_at || "";
    return da < db ? 1 : da > db ? -1 : 0;
  });

  return (
    <Blog
      initialCategories={initialCategories}
      initialPosts={mergedPosts}
      initialTotal={totalDocs + markdownPosts.length}
    />
  );
}
