// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import SingleWebSeriesData from "../../components/WebSeries/SingleWebSeriesData/SingleWebSeriesData";
import RelatedCaseStudies from "../../components/WebSeries/RelatedCaseStudies/RelatedCaseStudies";
// import ClientRequirement from "../../components/WebSeries/ClientRequirement/ClientRequirement";
import OtherActivities from "../../components/WebSeries/OtherActivities/OtherActivities";
import ContentCreateByTeam from "../../components/WebSeries/ContentCreateByTeam/ContentCreateByTeam";
// import RelatedServicesSlider from "../../components/CreativeHouseComponent/relatedServices";
// import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
// import ProjectSuccess from "../../components/WebSeries/ProjectSuccess/ProjectSucess";
import { useParams } from "@/src/lib/navigation";
// import BusinessCareerSection from "../../components/Home/HireJoinCta/HireJoinCta";
import ContinuityProgram from "./ContinuityProgram/ContinuityProgram";
import Loader from "../../components/common/Loader/Loader";
import CampaignObjectives from "../../components/WebSeries/CampaignObjectives/CampaignObjectives";
import Partnership from "../../components/WebSeries/Partnership/Partnership";
import ServicesDelivered from "../../components/WebSeries/ServicesDelivered/ServicesDelivered";
import StrategyExecution from "../../components/WebSeries/StrategyExecution/StrategyExecution/StrategyExecution";
import CampaignPerformance from "../../components/WebSeries/CompaignPerformance/CampaignPerformance";
import WhyCocomaDigital from "../../components/WebSeries/WhyCocomaDigital/WhyCocomaDigital";
import ContactPromo from "../../components/WebSeries/ContactPromo/ContactPromo";
import ConsultBanner from "../../components/WebSeries/ConsultBanner/ConsultBanner";
import FAQ from "../../components/WebSeries/FAQ/FAQ";

const WebSeriesIndividual = () => {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState("");
  const [itemData, setItemData] = useState(null);


  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const S3_BASE =
      "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/";
    const absolutize = (v: string): string =>
      !v
        ? ""
        : /^https?:\/\//.test(v) || v.startsWith("/")
          ? v
          : S3_BASE + v.replace(/^\/+/, "");
    const mediaUrl = (v: any, legacyKey?: string, doc?: any): string => {
      const raw = !v
        ? legacyKey && doc
          ? doc[legacyKey] || ""
          : ""
        : typeof v === "string"
          ? v
          : typeof v === "object" && v.url
            ? v.url
            : legacyKey && doc
              ? doc[legacyKey] || ""
              : "";
      return absolutize(raw);
    };
    const adaptDoc = (d: any) => {
      if (!d) return null;
      const adaptNestedRow = (r: any) => ({
        ...r,
        image: mediaUrl(r?.image, "legacyImage", r),
      });
      return {
        ...d,
        poster_image: mediaUrl(d.poster_image, "legacyImageUrl", d),
        category_id:
          typeof d.category === "object" ? d.category?.id : d.category,
        images: Array.isArray(d.images)
          ? d.images.map((i: any) => ({
            ...i,
            image: mediaUrl(i?.image, "legacyImage", i),
          }))
          : [],
        ideas_strategy_planning: Array.isArray(d.ideas_strategy_planning)
          ? d.ideas_strategy_planning.map(adaptNestedRow)
          : [],
        pre_launch_activity: Array.isArray(d.pre_launch_activity)
          ? d.pre_launch_activity.map(adaptNestedRow)
          : [],
        performance: Array.isArray(d.performance)
          ? d.performance.map(adaptNestedRow)
          : [],
      };
    };

    const fetchMarketingHouseDetails = async () => {
      try {
        /* Phase 5l: fetch from the API marketing-house-items by slug. */
        const url = new URL("/content-api/marketing-house-items", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setItemData(adaptDoc(body?.docs?.[0] ?? null));
      } catch (err: any) {
        if (cancelled) return;
        setIsError(err?.message || "Error fetching item details");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMarketingHouseDetails();
    return () => { cancelled = true; };
  }, [slug]);


  if (isLoading) {
    return (
      <Loader />
    )
  }

  if (isError && !isLoading) {
    return <p>{isError}</p>;
  }

  return (
    <>
      {itemData &&
        <div className="w-full flex flex-col justify-center content-center">
          <SingleWebSeriesData itemData={itemData} />

          <CampaignObjectives itemData={itemData} />
          {/* Partnership callout — shows "<Brand> 🤝 Cocoma Digital" right
              under Client Goals. Reinforces the collaboration angle and
              visually breaks up the long case study with an on-niche moment. */}
          <Partnership clientName={itemData?.client} />
          {/* "What we delivered" pill cloud — quick scan of services
              Cocoma covered on this campaign. Auto-deduced from the
              same itemData fields the rest of the page already uses,
              so it stays accurate per case study with no admin edit. */}
          <ServicesDelivered itemData={itemData} />
          {/* <ClientRequirement itemData={itemData} /> */}

          {(itemData?.ideas_strategy_planning?.length || itemData?.pre_launch_activity?.length) &&
            <StrategyExecution itemData={itemData} />
          }

          {itemData?.other_activity_category?.length > 0 &&
            <OtherActivities itemData={itemData} />
          }

          {itemData?.content_created_category?.length > 0 &&
            <ContentCreateByTeam itemData={itemData} />
          }

          <div id="views" className="w-full">
            <ConsultBanner />
          </div>

          {itemData?.performance?.length > 0 && <CampaignPerformance itemData={itemData} />}

          {itemData?.continuity_category?.length > 0 &&
            <ContinuityProgram itemData={itemData} />
          }

          {/* <div className="marketing-house-success-section-main-wrapper">
            <div className="marketing-house-success-section-container">
              <ProjectSuccess />
            </div>
          </div> */}

          {/* <RelatedServicesSlider Haddertitle="Related Services" /> */}

          {/* <div className="home-book-call-container-wrapper">
            <div className="home-book-call-container">
              <BookCallBanner
                templateId={itemData?.book_call_id}
              />
            </div>
          </div> */}

          {itemData?.our_advantage_template_id && <WhyCocomaDigital our_advantage_id={itemData?.our_advantage_template_id} />}

          {/* Industry-relevant peer case studies — backed by
              /api/marketing-recommendations. Tiered same-category +
              featured + global-fallback so the rail always renders 6
              cards, even for items in thin categories (Reality Show:
              1 doc; Live Match: 2). Pass `slug` so the route can do
              its own parent lookup + exclude. */}
          {slug && (
            <RelatedCaseStudies
              slug={slug}
              categoryId={itemData?.category_id}
              excludeId={itemData?.id}
            />
          )}

          {/* <RelatedServicesSlider Haddertitle="Explore More Film & Media Services" /> */}
          {/* <BusinessCareerSection /> */}

          <ContactPromo />

          <FAQ slug={slug} />

        </div>
      }
      {!itemData && !isLoading && !isError && <p>No data found</p>}
    </>
  );
};

export default WebSeriesIndividual;


