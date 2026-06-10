// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { useParams as useNextParams } from "next/navigation";
import Pagination from "../common/Pagination/Pagination";
import PlayBtn from "../common/PlayBtn/PlayBtn";
import EditLink from "../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../utils/constant";

const CreativeHouseProject = ({ creativeCategory, initialItems = [], initialItemCount = 0 }) => {
  const topScrollToCards = useRef(null);
  /* Skip the loading skeleton when we hydrated with server-fetched items. */
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [filteredItems, setFilteredItems] = useState(initialItems);
  const [filteredItemCount, setFilteredItemCount] = useState(initialItemCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTitle, setSearchTitle] = useState("");
  /* `userInteracted` gates the re-fetch effect so we don't overwrite
     the SSR-seeded grid on first hydrate. Page/filter/search action
     flips it; from then on the legacy client-side fetcher takes
     over (same pattern used in /career). */
  const [userInteracted, setUserInteracted] = useState(false);
  /* Phase 5+ 2026-05-22: use Next.js's native useParams instead of
     our custom wrapper. The wrapper falls back to the URL's last
     pathname segment when there's no real `slug` param — fine on
     /creative-house/[slug], but on /work/content-created it
     returned slug="content-created", which then filtered the
     creative-house API to a category that doesn't exist → empty
     grid. Native useParams returns {} for non-dynamic routes, so
     slug is undefined here unless the route actually has a slug. */
  const { slug } = useNextParams() as { slug?: string };
  const limit = 20;
  const offset = (currentPage - 1) * limit;
  const totalPages = Math.ceil(filteredItemCount / limit);


  useEffect(() => {
    /* Skip the initial client-side fetch when SSR-seeded. The
       params `[slug, limit, offset, searchTitle]` trigger this on
       genuine user interaction; on first mount with default values
       + a populated grid, we leave the SSR data untouched. */
    if (!userInteracted && initialItems.length > 0) return;
    /* /creative-house list query — the API creative-house-items with
       category-slug + title filters. Replaces the legacy
       /creative_filter_data endpoint, adapter-shaped here so the
       JSX below doesn't need shape changes. */
    const getCreativeHouseItems = async () => {
      setLoading(true);
      try {
        const url = new URL("/content-api/creative-house-items", window.location.origin);
        if (slug) url.searchParams.set("where[category.slug][equals]", slug);
        if (searchTitle) url.searchParams.set("where[title][contains]", searchTitle);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("page", String(currentPage));
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const items = (body.docs || []).map((i: any) => ({
          id: i.id,
          slug: i.slug,
          creative_house_video_title: i.title,
          creative_house_thumbnail: (i.image && i.image.url) || i.legacyImageUrl,
          creative_house_video_url: i.video_url,
          display_order: i.order,
        }));
        setFilteredItems(items);
        setFilteredItemCount(
          slug || searchTitle ? items.length : (body.totalDocs ?? 0),
        );
      } catch (error) {
        console.log("error", error);
      } finally {
        setLoading(false);
      }
    };
    getCreativeHouseItems();
  }, [slug, limit, offset, searchTitle, userInteracted, initialItems.length]);

  const scrollToTopToCards = () => {
    if (topScrollToCards.current) {
      const y =
        topScrollToCards.current.getBoundingClientRect().top +
        window.pageYOffset -
        150;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const searchTextChangeHandler = (event) => {
    const getData = setTimeout(() => {
      setSearchTitle(event?.target?.value);
      setUserInteracted(true);
    }, 500);
    return () => clearTimeout(getData);
  };

  return (
    <div className="creative-house-creative-project-main-wrapper mt-4">
      <div className="creative-house-creative-project-main">
        <FilterBar
          categories={creativeCategory}
          currentCategory={slug}
          searchTextChangeHandler={searchTextChangeHandler}
        />
        {loading && (
          <div
            style={{ height: "100px" }}
            className="flex justify-center items-center"
          >
            <samp>Loading...</samp>
          </div>
        )}
        {!loading && filteredItems?.length > 0 && (
          <div ref={topScrollToCards} className="w-full">
            <VideoGrid
              videos={filteredItems}
            // setHoveredItem={setHoveredItem}
            // hoveredItem={hoveredItem}
            />
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="w-full mt-4">
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                setUserInteracted(true);
              }}
              scrollToTopToCards={scrollToTopToCards}
            />
          </div>
        )}
        {!loading && filteredItems?.length === 0 && (
          <div className="text-center mt-4">
            <p>No movies/items found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterBar = ({
  categories,
  currentCategory,
  searchTextChangeHandler,
}) => {
  // Single layout at every viewport — pills wrap to multiple rows
  // on phones (was hidden behind a horizontal slick slider so users
  // only saw 3 of N categories at once and had to swipe to see the
  // rest). Wrapping is universally understood and shows everything
  // at a glance.
  return (
    <div className="mb-3">
      <div className="w-full flex justify-start content-start mb-1">
        <EditLink
          path={`${ADMIN_URL}/home/creative_house/creative_house_category`}
        />
      </div>
      <div className="creative-house-filter-search-wrapper">
        <div className="SliderCustom-width">
          {categories?.map((category, index) => (
            <Link
              key={index}
              to={`/creative-house/${category?.slug}`}
              className={`creative-house-category-btn inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${
                currentCategory === category?.slug ? "border-black bg-black text-white hover:bg-neutral-800" : "border-black bg-transparent text-black hover:bg-black hover:text-white"
              }`}
            >
              {category?.creative_house_category_name}
            </Link>
          ))}
        </div>
        <div className="creative-house-search-input-wrapper">
          <input
            type="text"
            onChange={searchTextChangeHandler}
            placeholder="Search by title..."
          />
        </div>
      </div>
    </div>
  );
};

// All videos cards
const VideoGrid = ({ videos }) => {
  return (
    <div className="flex flex-wrap -mx-3">
      {videos?.map((item, index) => {
        return (
          <div
            key={index}
            className="w-1/2 px-3 sm:w-1/3 sm:px-3 lg:w-1/4 lg:px-3 px-1 mt-2 card-CreativeHouse-main-container"
          >
            <div className="card-CreativeHouse">
              {/* Main Thumbnail — lazy + async-decoded so 20 cards
                  don't block first paint. Anshu: thumbnails on S3
                  are 1280×720 but display at ~170×96, ~55× more
                  pixel data than needed. CDN resize / thumbnail
                  variants would speed this further. */}
              {/* Phase 5+ 2026-05-23: `relative block` on the Link
                  so the absolutely-positioned <PlayBtn /> (left-1/2
                  top-1/2 translate -50%) centres over the thumbnail.
                  Previously the <a> had no position context, so the
                  play btn anchored to <body> and rendered at random
                  viewport coords. */}
              <Link to={`/creatives/${item?.slug}`} className="block relative">
                <Image
                  src={
                    item?.creative_house_thumbnail?.startsWith("http")
                      ? item?.creative_house_thumbnail
                      : `https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/creative-house-thumbnail/${item?.creative_house_thumbnail}`
                  }
                  className="w-full rounded-t object-cover"
                  alt={item?.creative_house_video_title || "Creative thumbnail"}
                  width={600}
                  height={400}
                  priority={index < 4}
                  style={{ width: "100%", height: "auto" }}
                />
                {(item?.creative_house_upload_video_url ||
                  item?.creative_house_video_url) && <PlayBtn />}
              </Link>
              <div className="absolute top-0 right-0 mr-1">
                <EditLink
                  path={`${ADMIN_URL}/home/creative_house/creative_house_item/show/${item?.id}`} />
              </div>
              {/* Hover Content */}
              {/* <div className="card-CreativeHouse-show-afterImage-Hover">
              <div>
                <h6>{item.creative_house_video_title}</h6>
                <p>{item.requirement_description}</p>
              </div>
            </div> */}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreativeHouseProject;
