#!/usr/bin/env node
// @ts-nocheck
/* ===========================================================
   scripts/generate-blog-manifest.js
   ===========================================================
   Build-time generator for the markdown-in-repo blog pipeline.

   Walks src/content/blog/*.md, parses each file's YAML
   frontmatter via gray-matter, converts the markdown body to
   HTML via marked, and writes a single manifest at
   src/content/blog.generated.json.

   The manifest entries match the SHAPE returned by the Laravel
   /blog_item endpoint so the existing Blog.jsx + BlogDetails.jsx
   components consume markdown posts without any rendering
   changes — same dangerouslySetInnerHTML in BlogDetailsContent,
   same BlogCard list rendering, same EditLink fallback (no edit
   link for markdown posts since they live in git, not the
   admin DB).

   Wired as a prebuild step in package.json (after sitemap)
   so every `npm run build` regenerates from the latest md
   files.

   Standalone: node scripts/generate-blog-manifest.js
   Output:     src/content/blog.generated.json (overwritten)

   Authoring quick-ref — frontmatter spec:
     ---
     title: "..."                     REQUIRED
     date: "2026-05-02"               REQUIRED, ISO date
     slug: "..."                      OPTIONAL, defaults to filename
     author: "Anil Mahato"            OPTIONAL, defaults shown
     image: "/Images/blog/foo.jpg"    OPTIONAL hero image (S3 URL or local)
     excerpt: "..."                   OPTIONAL, auto-derived if missing
     tags: ["foo", "bar"]             OPTIONAL
     published: true                  OPTIONAL, defaults true; false = draft
     ---
     # markdown body
   =========================================================== */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const SRC_DIR = path.join(__dirname, "..", "src", "content", "blog");
const OUT_PATH = path.join(__dirname, "..", "src", "content", "blog.generated.json");

const DEFAULT_AUTHOR = "Anil Mahato";

/* Configure marked once — GitHub-flavored markdown handles
   most of what an editorial blog needs (tables, autolinks,
   strikethrough, task lists). headerIds adds id="..." to
   headings so anchor links work for long posts. */
marked.setOptions({
  gfm: true,
  breaks: false, // single newline does NOT become <br>; keep prose-friendly behaviour
  headerIds: true,
});

function deriveExcerpt(body, maxLen = 200) {
  // First non-heading paragraph, stripped of inline markdown
  // syntax so the excerpt looks clean in card previews + meta
  // descriptions. Crude but works for most posts.
  const lines = body.split("\n");
  let text = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    text = trimmed;
    break;
  }
  // Strip simple markdown markers
  text = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label
    .replace(/[*_`]/g, "")
    .replace(/^>\s*/, "");
  return text.length > maxLen ? `${text.slice(0, maxLen - 1).trim()}…` : text;
}

function processFile(filename) {
  const fullPath = path.join(SRC_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data: fm, content } = matter(raw);

  if (!fm.title) {
    throw new Error(`${filename}: missing required frontmatter "title"`);
  }
  if (!fm.date) {
    throw new Error(`${filename}: missing required frontmatter "date"`);
  }

  // Slug = explicit frontmatter, OR filename minus extension
  // minus an optional leading "YYYY-MM-DD-" prefix.
  let slug = fm.slug;
  if (!slug) {
    slug = filename
      .replace(/\.md$/i, "")
      .replace(/^\d{4}-\d{2}-\d{2}-/, "");
  }

  // Convert markdown body to HTML — pre-rendered at build time
  // so the existing dangerouslySetInnerHTML in BlogDetailsContent
  // works without any markdown parsing on the client.
  const description = marked.parse(content);

  return {
    // ID format: `md-${slug}` so it can't collide with Laravel
    // numeric IDs in the merged list.
    id: `md-${slug}`,
    source: "markdown",
    slug,
    title: fm.title,
    date: fm.date,
    author: fm.author || DEFAULT_AUTHOR,
    image: fm.image || null,
    description, // HTML, ready for dangerouslySetInnerHTML
    excerpt: fm.excerpt || deriveExcerpt(content),
    tags: fm.tags || [],
    // Laravel posts have category_id / sub_category_id; markdown
    // posts can opt in via frontmatter.category for filtering.
    category_id: fm.category_id ?? null,
    sub_category_id: fm.sub_category_id ?? null,
    // Drafts: `published: false` excludes the post from the
    // built manifest entirely. Removed from output, not just
    // hidden — never ships to the bundle.
    published: fm.published !== false,
  };
}

function main() {
  console.log("→ Generating blog manifest from markdown files…");

  if (!fs.existsSync(SRC_DIR)) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort(); // alphabetical on disk; we sort by date later

  let posts = [];
  let skipped = 0;
  for (const f of files) {
    try {
      const post = processFile(f);
      if (!post.published) {
        skipped++;
        continue;
      }
      posts.push(post);
    } catch (err) {
      console.error(`  ✗ ${f}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Newest first — matches the Laravel API's natural ordering
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalCount: posts.length,
    posts,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(
    `✓ ${posts.length} post(s) compiled${skipped ? `, ${skipped} draft(s) skipped` : ""}.`
  );
  console.log(`✓ Manifest: ${path.relative(process.cwd(), OUT_PATH)}`);
}

try {
  main();
} catch (err) {
  console.error("✗ Manifest generation failed:");
  console.error(err);
  process.exit(1);
}
