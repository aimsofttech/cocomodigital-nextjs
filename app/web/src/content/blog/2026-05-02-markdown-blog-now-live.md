---
title: "Cocoma's blog is now markdown-in-repo"
slug: "markdown-blog-now-live"
date: "2026-05-02"
author: "Anil Mahato"
image: "/Images/home/coming-soon.png"
excerpt: "From today, blog posts at cocomadigital.com are written as markdown files in the repository — Pearl drafts, Anil refines, ships in minutes."
tags: ["meta", "engineering"]
published: true
---

## How this post got here

Until today, every blog post on cocomadigital.com lived in the Laravel admin database. That worked, but it forced a clunky handoff: write a draft somewhere (Notion, Docs), copy-paste into an admin form, fight the form's image upload, hope the formatting stuck, click Publish.

From today, we're doing it the way we ship code.

## The new flow

1. **Pearl drafts the post** in any markdown editor she likes — Notion, iA Writer, Obsidian, even VS Code.
2. **Anil refines it.**
3. **The file lands in the repo** as `src/content/blog/<slug>.md`.
4. **A build-time generator** parses the markdown, converts it to HTML, drops it into a single manifest the React site reads from.
5. **The post is live** on the next deploy.

## Why this matters

- **One source of truth.** Posts live in version control. Every change has an author and a timestamp. Reverting a typo is a one-click affair.
- **No CMS to learn.** Pearl doesn't need a login to a separate admin panel. She writes prose; we ship prose.
- **Cleanly portable.** When we migrate the site to Next.js later this year, markdown ports natively. No re-platforming, no re-importing.
- **The existing admin still works.** The 7 blog posts already in the Laravel admin continue to live there. New posts go in markdown. Both render through the same `/blog/:slug` URL.

## What's next

This is the first piece of a broader content-pipeline refactor — the "back-end so simple Pearl can update content without asking a dev" project. Founder essays, case studies, and audience-specific landing pages will follow the same pattern.

If you've been waiting for Cocoma to publish more openly about how we run a 60-person studio, monetize entertainment IP, or run launch campaigns at scale — you're about to get a lot more of it.

— Anil
