// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
import { IoSearchSharp } from "react-icons/io5";
import EditPencil from "../common/EditPencil/EditPencil";
import { adminRoutes } from "../../lib/adminEditRoutes";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

const SKELETON_COUNT = 6;

interface SuccessStoriesViewAllProps {
  initialStories?: any[];
}

const SuccessStoriesViewAll = ({ initialStories = [] }: SuccessStoriesViewAllProps) => {
  const language = "en"; /* Phase 5b: lang slice dropped */
  const [stories, setStories] = useState(initialStories);
  /* Skip the skeleton when we already have server-fetched stories. */
  const [resolved, setResolved] = useState(initialStories.length > 0);
  const [searchTitle, setSearchTitle] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [sortKey, setSortKey] = useState("featured");

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedTitle(searchTitle.trim().toLowerCase()),
      300
    );
    return () => clearTimeout(handler);
  }, [searchTitle]);

  useEffect(() => {
    /* Skip the client-side fetch when seeded with server data. */
    if (initialStories.length > 0) return;
    let cancelled = false;
    const fetchStories = async () => {
      try {
        /* Phase 5l: the API success-stories — fetched + adapted to
           the legacy {id, slug, client_title, client_img} shape
           the cards consume. Search filtering is done client-side
           in the useMemo below (debouncedTitle), so we pull all
           docs up-front. */
        const url = new URL("/content-api/success-stories", window.location.origin);
        url.searchParams.set("limit", "100");
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const list = (body?.docs || []).map((s: any) => ({
          id: s.id,
          slug: s.slug,
          client_title: s.title,
          client_img:
            (typeof s.image === "object" && s.image?.url) || s.legacyImageUrl,
        }));
        const usable = list.filter((s: any) => s?.id && s?.slug);
        if (!cancelled) setStories(usable);
      } catch (err) {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setResolved(true);
      }
    };
    fetchStories();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const visible = useMemo(() => {
    let out = stories;
    if (debouncedTitle) {
      out = out.filter((s) =>
        (s?.client_title || "").toLowerCase().includes(debouncedTitle)
      );
    }
    const sorted = [...out];
    if (sortKey === "featured") {
      sorted.sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );
    } else if (sortKey === "az") {
      sorted.sort((a, b) =>
        (a.client_title || "").localeCompare(b.client_title || "")
      );
    } else if (sortKey === "za") {
      sorted.sort((a, b) =>
        (b.client_title || "").localeCompare(a.client_title || "")
      );
    }
    return sorted;
  }, [stories, debouncedTitle, sortKey]);

  return (
    <section className="success-view-all-explore">
      <div className="success-view-all-toolbar">
        <div className="success-view-all-search">
          <IoSearchSharp
            className="success-view-all-search-icon"
            aria-hidden="true"
          />
          <input
            value={searchTitle}
            type="text"
            placeholder="Search stories by title…"
            onChange={(event) => setSearchTitle(event.target.value)}
            aria-label="Search success stories"
          />
        </div>
        <div className="success-view-all-sort">
          <label
            htmlFor="success-view-all-sort-select"
            className="success-view-all-sort-label"
          >
            Sort
          </label>
          <select
            id="success-view-all-sort-select"
            className="success-view-all-sort-select"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {resolved && (
          <span
            className="success-view-all-result-count"
            aria-live="polite"
          >
            {visible.length}{" "}
            {visible.length === 1 ? "story" : "stories"}
          </span>
        )}
      </div>

      {!resolved && (
        <div className="success-view-all-grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="success-view-all-card success-view-all-card-skeleton"
              aria-hidden="true"
            >
              <div className="success-view-all-card-image-wrapper" />
              <div className="success-view-all-card-body">
                <div className="success-view-all-skeleton-line success-view-all-skeleton-line-short" />
                <div className="success-view-all-skeleton-line" />
                <div className="success-view-all-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved && visible.length === 0 && (
        <div className="success-view-all-empty" role="status">
          <p className="success-view-all-empty-eyebrow">No matches</p>
          <h3 className="success-view-all-empty-title font-primary">
            We couldn't find any stories that match.
          </h3>
          <p className="success-view-all-empty-body">
            Try a different search, or{" "}
            <button
              type="button"
              className="success-view-all-empty-reset"
              onClick={() => setSearchTitle("")}
            >
              clear the search
            </button>
            .
          </p>
        </div>
      )}

      {resolved && visible.length > 0 && (
        <div className="success-view-all-grid">
          {visible.map((s) => {
            const title = s?.client_title || "Untitled success story";
            const image = s?.client_img || "/Images/movieimg.svg";
            const blurb =
              s?.client_description ||
              s?.short_description ||
              null;
            return (
              <div className="success-view-all-card-wrapper" key={s.id}>
                <Link
                  to={`/case-studies/${s.slug}`}
                  className="success-view-all-card"
                >
                  <div className="success-view-all-card-image-wrapper">
                    <Image
                      className="success-view-all-card-image"
                      src={image}
                      alt={title}
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                  <div className="success-view-all-card-body">
                    <p className="success-view-all-card-eyebrow">
                      Success Story
                    </p>
                    <h3 className="success-view-all-card-title font-primary">
                      {title}
                    </h3>
                    {blurb && (
                      <p className="success-view-all-card-blurb">
                        {blurb}
                      </p>
                    )}
                    <span className="success-view-all-card-cta">
                      Read story
                      <FaArrowRight aria-hidden="true" />
                    </span>
                  </div>
                </Link>
                <EditPencil
                  className="success-view-all-card-edit"
                  to={adminRoutes.home.client(s.id)}
                  label={title}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SuccessStoriesViewAll;
