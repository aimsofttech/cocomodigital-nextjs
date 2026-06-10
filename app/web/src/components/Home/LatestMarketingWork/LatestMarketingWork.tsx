// @ts-nocheck
import MarketingCreative from "../../common/MarketingCreative/MarketingCreative";
import { useEffect, useState } from "react";

const LatestMarketingWork = ({ marketingHouseCategory }) => {
  const [activeCategoryId, setActiveCategoryId] = useState(-1);
  const [marketingHouseData, setMarketingHouseData] = useState(null);
  const language = "en"; /* Phase 5b: lang slice dropped */

  // Fetch Marketing house card data
useEffect(() => {
  const fetchMarketingHouse = async () => {
    try {
      /* Phase 5l: the API marketing-house-items filtered by
         category. Empty/null category = all. */
      const url = new URL("/content-api/marketing-house-items", window.location.origin);
      if (activeCategoryId) {
        url.searchParams.set("where[category][equals]", String(activeCategoryId));
      }
      url.searchParams.set("limit", "10");
      url.searchParams.set("sort", "order");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const body = await res.json();
      setMarketingHouseData(body?.docs || []);
    } catch (error: any) {
      console.log("error", error?.message || "An error occurred while fetching Marketing House data.");
    }
  };

  fetchMarketingHouse();
}, [activeCategoryId, language]);

  return (
    <div className="home-latest-work-main-wrapper">
      <div className="home-latest-work-main">
        <MarketingCreative
          categories={marketingHouseCategory}
          activeCategoryId={activeCategoryId}
          setActiveCategoryId={setActiveCategoryId}
          viewAllPath="marketing-portfolio"
          title="See what's new"
          mainTitle="Marketing HQ"
          cardData={marketingHouseData}
        />
      </div>
    </div>
  );
};

export default LatestMarketingWork;
