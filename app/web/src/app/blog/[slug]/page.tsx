import BlogDetails from "@/src/views/BlogDetails/BlogDetails";
import type { Metadata } from "next";
import StructuredData from "@/src/components/common/StructuredData/StructuredData";
import {
  buildBlogAuthor,
  type AuthorTemplate,
  type BlogPost,
} from "@/src/lib/adminServerApi";
import {
  findCollection,
  getAuthors,
  getBlogPost,
  getBlogPosts,
  getServiceCategories,
  imageUrl,
} from "@/src/lib/content";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  stripHtml,
  truncate,
} from "@/src/lib/seo";
import blogManifest from "@/src/content/blog.generated.json";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/* Adapters — the API shape → the legacy shape BlogDetails view +
   buildBlogAuthor helper already expect. */
const adaptPost = (p: any): BlogPost => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  image: imageUrl(p),
  /* Phase 1.0 Studio 2026-05-24: Studio editor writes plain
     markdown into `body_markdown`. Public renderer prefers
     Lexical `content` (legacy/admin-edited posts), falls back
     to markdown. LexicalBody handles both via `isMarkdownBody`. */
  description: p.content,
  body_markdown: p.body_markdown,
  excerpt: p.excerpt,
  created_at: p.published_at ?? p.createdAt,
  updated_at: p.updatedAt,
  author_id: typeof p.author === "object" ? p.author?.id : p.author,
  author: typeof p.author === "object" ? p.author : undefined,
  category_slug: typeof p.category === "object" ? p.category?.slug : undefined,
  category: typeof p.category === "object" ? p.category : undefined,
  tags: Array.isArray(p.tags) ? p.tags.map((t: any) => t.tag ?? t) : [],
});

const adaptAuthor = (a: any): AuthorTemplate => ({
  id: a.id,
  author_image: imageUrl(a),
  author_name: a.name,
  author_description: a.bio,
  /* founder_text + cto_text are specific to the legacy founder-bio
     card; the API Authors don't have those fields. The buildBlogAuthor
     helper handles them being undefined cleanly. */
});

/** Fetch a single blog article — first checks the markdown fallback
 *  (locally-authored posts in src/content/blog/), then the API. */
async function getBlogArticle(slug: string): Promise<BlogPost | null> {
  const markdownPosts = (blogManifest as { posts?: BlogPost[] }).posts ?? [];
  const markdownPost = markdownPosts.find((post) => post.slug === slug);
  if (markdownPost) return markdownPost;
  const payloadPost = await getBlogPost(slug);
  return payloadPost ? adaptPost(payloadPost) : null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogArticle(slug);

  return buildMetadata({
    title: article?.title || "Cocoma Digital Blog",
    description: truncate(
      article?.excerpt || article?.description || "Read Cocoma Digital insights on video, growth, content, and marketing."
    ),
    path: `/blog/${slug}`,
    image: article?.image,
    imageAlt: article?.title || "Cocoma Digital blog article",
    type: "article",
    category: "Blog",
    keywords: [
      "blog",
      "video marketing",
      "creator growth",
      ...(article?.tags ?? []),
    ],
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const article = await getBlogArticle(slug);

  const subcategorySlug =
    article?.subcategory || article?.category_slug || article?.category?.slug || "";

  /* Parallel fetches — all hit the API now (down from 4 Laravel
     calls in the legacy version). */
  const [authorsResult, relatedByCategoryResult, latestResult, serviceCategoriesResult] =
    await Promise.all([
      getAuthors(),
      subcategorySlug
        ? findCollection<any>("blog-posts", {
            where: { "category.slug": { equals: subcategorySlug } },
            limit: 6,
          })
        : Promise.resolve({ docs: [] }),
      getBlogPosts({ limit: 6 }),
      getServiceCategories({ limit: 50 }),
    ]);

  const authorTemplates = authorsResult.docs.map(adaptAuthor);

  const categoryRelated = relatedByCategoryResult.docs
    .map(adaptPost)
    .filter((post) => post.id && post.id !== article?.id);
  const latestRelated = latestResult.docs
    .map(adaptPost)
    .filter((post) => post.id && post.id !== article?.id);
  const relatedArticles =
    categoryRelated.length >= 2
      ? categoryRelated.slice(0, 3)
      : latestRelated.slice(0, 3);

  /* Find the first non-"Our Other Services" category, then fetch a
     few related services from it. Matches the legacy logic in the
     bottom service rail. */
  const firstCategory = serviceCategoriesResult.docs.find(
    (c: any) => c.category_name !== "Our Other Services",
  );
  const relatedServicesResult = firstCategory?.id
    ? await findCollection<any>("services", {
        where: { category: { equals: firstCategory.id } },
        limit: 6,
      })
    : { docs: [] };
  const relatedServices = relatedServicesResult.docs.map((s: any) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    image: imageUrl(s),
    description: s.description,
    short_description: s.short_description,
  }));

  const authorId = article?.author_id ?? article?.author?.id ?? null;

  return (
    <>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article?.title,
            description: stripHtml(article?.excerpt || article?.description || ""),
            image: article?.image ? absoluteUrl(article.image) : undefined,
            datePublished: article?.date || article?.created_at,
            dateModified: article?.updated_at || article?.date || article?.created_at,
            author: {
              "@type": "Organization",
              name: "Cocoma Digital",
            },
            publisher: {
              "@id": "https://cocomadigital.com/#organization",
            },
            mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: article?.title || slug, path: `/blog/${slug}` },
          ]),
        ]}
      />
      <BlogDetails
        slug={slug}
        initialData={article}
        initialAuthor={buildBlogAuthor(authorId, authorTemplates)}
        initialRelatedArticles={relatedArticles}
        initialRelatedHeading={
          categoryRelated.length >= 2
            ? "More on this topic"
            : "More from the Cocoma desk"
        }
        initialRelatedServices={relatedServices.slice(0, 3)}
      />
    </>
  );
}
