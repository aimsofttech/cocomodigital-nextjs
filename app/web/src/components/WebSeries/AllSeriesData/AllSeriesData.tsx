// @ts-nocheck

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import Pagination from "../../common/Pagination/Pagination";
import ScrollToTop from "../../scrollToTop";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import StickerSelect from "../../common/StickerSelect/StickerSelect";

const AllSeriesData = ({
  marketingCategory,
  marketingYear,
  initialItems = [],
  initialTotalItemCount = 0,
}) => {
  const topScrollToCards = useRef(null);
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [filteredItems, setFilteredItems] = useState(initialItems);
  const [totalItemCount, setTotalItemCount] = useState(initialTotalItemCount);
  const [activePage, setActivePage] = useState(1);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchInput, setSearchInput] = useState("");
  /* Gate re-fetch on first hydrate (same pattern as /career +
     /creative-house). User interaction flips the flag; client-side
     legacy fetcher takes over from there. */
  const [userInteracted, setUserInteracted] = useState(false);
  const limit = 32;
  const offset = (activePage - 1) * limit;
  const totalPages = Math.ceil(totalItemCount / limit);

  const scrollToTopToCards = () => {
    if (topScrollToCards.current) {
      const y =
        topScrollToCards.current.getBoundingClientRect().top +
        window.pageYOffset -
        90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    /* Skip the initial client-side fetch when SSR-seeded. */
    if (!userInteracted && initialItems.length > 0) return;
    /* Guard against out-of-order responses: if a newer search fires
       before this one resolves, `ignore` flips and we drop the stale
       result instead of letting it overwrite the latest one. */
    let ignore = false;
    const fetchAllSeriesData = async () => {
      try {
        /* Phase 5l: the API marketing-house-items with multi-filter
           (year + category + title contains) + page-based pagination.
           Adapts result shape to legacy { marketingItemData, total }. */
        const url = new URL("/content-api/marketing-house-items", window.location.origin);
        if (category) url.searchParams.set("where[category][equals]", String(category));
        if (year) url.searchParams.set("where[year][equals]", String(year));
        if (searchTitle) url.searchParams.set("where[title][contains]", searchTitle);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("page", String(Math.floor(offset / limit) + 1));
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (ignore) return;
        if (!res.ok) {
          /* On a failed request, clear the grid so the "Data not
             available" state shows instead of stale cards. */
          setFilteredItems([]);
          setTotalItemCount(0);
          return;
        }
        const body = await res.json();
        /* Phase 5+ 2026-05-22: depth=1 returns `poster_image` as a
           full Media doc object. <Image src=...> needs a URL string,
           so unwrap here (matches the SSR adapter in
           /work/marketing-campaigns/page.tsx). */
        const items = (body?.docs || []).map((d: any) => ({
          ...d,
          poster_image:
            (typeof d.poster_image === "object" && d.poster_image?.url) ||
            d.legacyImageUrl ||
            (typeof d.poster_image === "string" ? d.poster_image : ""),
          category_id:
            typeof d.category === "object" ? d.category?.id : d.category,
        }));
        if (ignore) return;
        setFilteredItems(items);
        /* Always use the API's full total (across all pages) so the
           pager renders the correct number of pages — including when a
           category/year/title filter is active. Using the current
           page's item count here previously capped it at one page. */
        setTotalItemCount(body?.totalDocs || 0);
      } catch (error) {
        console.log("Error", error);
      }
    };
    fetchAllSeriesData();
    return () => { ignore = true; };
  }, [year, category, limit, offset, searchTitle, userInteracted, initialItems.length]);

  /* Debounce the search box: wait 400ms after the last keystroke
     before firing the title query, so rapid typing doesn't spawn a
     fetch per character. The ref skips the first run so an SSR-seeded
     mount doesn't trigger a redundant client refetch. */
  const didMountSearch = useRef(false);
  useEffect(() => {
    if (!didMountSearch.current) {
      didMountSearch.current = true;
      return;
    }
    const t = setTimeout(() => {
      setSearchTitle(searchInput.trim());
      setActivePage(1);
      setUserInteracted(true);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div ref={topScrollToCards} className="all-series-data-main-wrapper">
      <ScrollToTop />
      {/* Filters — custom <StickerSelect /> dropdowns in our
          comic-strip language. Native <select> open panels couldn't
          be styled (OS-controlled UI), and pill rows didn't scale
          with 10+ categories / years. StickerSelect gives us full
          design control AND scales to many options. */}
      <div className="all-series-data-filter-search-wrapper">
        <div className="all-series-data-filter-wrapper">
          <StickerSelect
            label="Category"
            value={category}
            onChange={(v) => { setCategory(v); setUserInteracted(true); }}
            options={(marketingCategory || []).map((c) => ({
              value: c?.id,
              label: c?.category_name,
            }))}
          />
          <StickerSelect
            label="Year"
            value={year}
            onChange={(v) => { setYear(v); setUserInteracted(true); }}
            options={(marketingYear || []).map((y) => ({
              value: y?.year,
              label: String(y?.year),
            }))}
          />
        </div>

        <div className="all-series-data-search-input-wrapper">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Movie Grid — lazy-load below-the-fold thumbnails so 32
          posters don't all fire on first paint. First 8 (above the
          fold on most desktops) load eagerly with high priority;
          the rest defer until the user scrolls. */}
      <div className="flex flex-wrap -mx-3 gap-y-4">
        {filteredItems?.map((item, index) => (
          <div
            key={item?.id || index}
            className="w-1/2 px-3 md:w-1/3 md:px-3 lg:w-1/4 lg:px-3 all-series-data-card border-0 relative"
          >
            <Link className="" to={`/marketing/${item?.slug}`}>
              <Image
                src={item?.poster_image || "/Images/movieimg.svg"}
                alt={item?.title || "Untitled"}
                className="card-img-top-card"
                width={300}
                height={450}
                priority={index < 8}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                style={{ width: "100%", height: "auto" }}
              />
            </Link>
            <div className="absolute bottom-0 right-0 mb-2 mr-3">
              <EditLink
                path={`${ADMIN_URL}/home/marketing/marketing_house_item/show/${item?.id}`}
              />
            </div>
          </div>
        ))}
      </div>

      {totalItemCount > 8 && (
        <Pagination
          totalPages={totalPages}
          currentPage={activePage}
          onPageChange={(p) => { setActivePage(p); setUserInteracted(true); }}
          scrollToTopToCards={scrollToTopToCards}
        />
      )}

      {filteredItems.length === 0 && (
        <div className="text-center mt-4">
          <p>Data not available</p>
        </div>
      )}
    </div>
  );
};

export default AllSeriesData;
