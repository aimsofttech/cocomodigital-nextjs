// @ts-nocheck
"use client";
import { useParams } from "@/src/lib/navigation";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
import TrustedByStrip from "../../components/SingleVideo/TrustedByStrip/TrustedByStrip";
import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import BriefAndRequirement from "../../components/SingleVideo/BriefAndRequirement/BriefAndRequirement";
import CreativeHouseServices from "../../components/SingleVideo/CreativeHouseServices/CreativeHouseServices";
import CreativeSlider from "../../components/SingleVideo/CreativeSlider/CreativeSlider";
import FinalOutput from "../../components/SingleVideo/FinalOutput/FinalOutput";
import HowWeEdit from "../../components/SingleVideo/HowWeEdit/HowWeEdit";
import InviteForService from "../../components/SingleVideo/InviteForEdit/InviteForEdit";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
import HireOrJoin from "../../components/SingleVideo/HireOrJoin/HireOrJoin";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader/Loader";


export default function SingleVideo() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setError] = useState("");
  const [singleVideoData, setSingleVideoData] = useState(null);
  const [allCategories, setAllCategories] = useState(null);
  const [brands, setBrands] = useState([]);



  useEffect(() => {
    setSingleVideoData(null);
    setAllCategories(null);
    setBrands([]);
    setIsLoading(true);

    const fetchSingleVideo = async () => {
      try {
        const itemUrl = new URL("/content-api/creative-house-items", window.location.origin);
        itemUrl.searchParams.set("where[slug][equals]", slug);
        itemUrl.searchParams.set("limit", "1");
        itemUrl.searchParams.set("depth", "1");
        const catUrl = new URL("/content-api/service-categories", window.location.origin);
        catUrl.searchParams.set("limit", "50");
        /* "Trusted by" brand logos — same admin-driven brands list the
           homepage uses. Sorted by display order, capped in the strip. */
        const brandUrl = new URL("/content-api/brands", window.location.origin);
        brandUrl.searchParams.set("limit", "12");
        brandUrl.searchParams.set("sort", "order");
        const [itemRes, catRes, brandRes] = await Promise.all([
          fetch(itemUrl, { headers: { Accept: "application/json" } }),
          fetch(catUrl, { headers: { Accept: "application/json" } }),
          fetch(brandUrl, { headers: { Accept: "application/json" } }),
        ]);
        if (!itemRes.ok) throw new Error(`HTTP ${itemRes.status}`);
        const itemBody = await itemRes.json();
        const catBody = catRes.ok ? await catRes.json() : { docs: [] };
        const brandBody = brandRes.ok ? await brandRes.json() : { docs: [] };
        setSingleVideoData(itemBody?.docs?.[0] ?? null);
        setAllCategories(catBody?.docs ?? []);
        /* Map the adapted brand doc (name / legacyImageUrl) into the
           shape TrustedByStrip reads (brand_name / brand_image). */
        setBrands(
          (brandBody?.docs ?? []).map((b) => ({
            id: b.id,
            brand_name: b.name,
            brand_image: b.legacyImageUrl,
          })),
        );
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchSingleVideo();
    }
  }, [slug]);


  if (isLoading) {
    return (
      <Loader />
    )
  }

  if (isError) {
    <p>{isError}</p>
  }


  return (
    <>
      <HowWeEdit data={singleVideoData} />
      <BriefAndRequirement RequireMentData={singleVideoData} />
      {singleVideoData?.creative_house_approach?.length > 0 && (
        <CreativeSlider
          CreativeSliderData={singleVideoData?.creative_house_approach}
        />
      )}
      {singleVideoData?.creative_house_final_output?.length > 0 && (
        <FinalOutput FinalOutputData={singleVideoData} />
      )}

      <InviteForService authorId={singleVideoData?.author_id} />

      <CredentialsStrip />

      <TrustedByStrip brands={brands} />

      <div className="home-book-call-container-wrapper">
        <div className="home-book-call-container">
          <BookCallBanner
            templateId={
              singleVideoData?.book_call_id
            }
          />
        </div>
      </div>
      <CreativeHouseServices
        allCategories={allCategories}
        serviceData={singleVideoData?.services}
      />

      <HireOrJoin />

      <FloatingCallChip />
    </>
  );
}
