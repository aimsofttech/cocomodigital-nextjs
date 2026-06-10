// @ts-nocheck
"use client";
import { useParams } from "@/src/lib/navigation";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
// "Trusted by" brand grid — light section, logos in their original
// colours. Sourced from the same admin-driven brands list the
// homepage uses (Redux). The homepage version is a marquee that
// only shows 1-2 logos at a time on mobile; this is a static
// grid so all 12 brands are scannable in one glance.
import TrustedByStrip from "../../components/SingleVideo/TrustedByStrip/TrustedByStrip";
// Credentials block — track-record stat numbers (count-up) +
// operational scale pills (turnaround, dedicated PM, WhatsApp/Slack,
// timezones, multilingual team). Sits between the brand grid and
// the Section12 book-call CTA so the reader gets a hard credibility
// pulse right before the booking ask.
import CredentialsStrip from "../../components/SingleVideo/CredentialsStrip/CredentialsStrip";
import BriefAndRequirement from "../../components/SingleVideo/BriefAndRequirement/BriefAndRequirement";
import CreativeHouseServices from "../../components/SingleVideo/CreativeHouseServices/CreativeHouseServices";
import CreativeSlider from "../../components/SingleVideo/CreativeSlider/CreativeSlider";
import FinalOutput from "../../components/SingleVideo/FinalOutput/FinalOutput";
import HowWeEdit from "../../components/SingleVideo/HowWeEdit/HowWeEdit";
// The invite strip lives just before Section12 (the "Next-Level
// Video Editing" book-call CTA). Sticky behaviour kicks in once
// it scrolls into view and stays at top until the next section
// appears — gives the reader a focused conversion prompt right
// after they finish the main content.
//
// FloatingCallChip is the persistent bottom-right CTA on this
// page; auto-hides when Section12 enters view so we don't double
// up.
import InviteForService from "../../components/SingleVideo/InviteForEdit/InviteForEdit";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
// Final two-path closer at the bottom of the page — Hire Cocoma
// (yellow primary CTA) vs Join Cocoma (dark secondary CTA). After
// the user has scanned everything, the closing question is one of
// two things: "I want you to make videos for me" OR "I want to
// work at Cocoma". One card per intent.
import HireOrJoin from "../../components/SingleVideo/HireOrJoin/HireOrJoin";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader/Loader";


export default function SingleVideo() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setError] = useState("");
  const [singleVideoData, setSingleVideoData] = useState(null);
  const [allCategories, setAllCategories] = useState(null);



  useEffect(() => {
    // Reset stale data IMMEDIATELY on slug change so navigating
    // /creatives/A → /creatives/B doesn't briefly render
    // A's content while B's fetch is in flight. Same pattern as
    // SingleService and Services pages.
    setSingleVideoData(null);
    setAllCategories(null);
    setIsLoading(true);

    const fetchSingleVideo = async () => {
      try {
        /* Phase 5l: pure the API — fetch the creative-house-item
           by slug + the service-categories list (the legacy
           response combined both). depth=1 expands the image
           upload field for the player thumbnail. */
        const itemUrl = new URL("/content-api/creative-house-items", window.location.origin);
        itemUrl.searchParams.set("where[slug][equals]", slug);
        itemUrl.searchParams.set("limit", "1");
        itemUrl.searchParams.set("depth", "1");
        const catUrl = new URL("/content-api/service-categories", window.location.origin);
        catUrl.searchParams.set("limit", "50");
        const [itemRes, catRes] = await Promise.all([
          fetch(itemUrl, { headers: { Accept: "application/json" } }),
          fetch(catUrl, { headers: { Accept: "application/json" } }),
        ]);
        if (!itemRes.ok) throw new Error(`HTTP ${itemRes.status}`);
        const itemBody = await itemRes.json();
        const catBody = catRes.ok ? await catRes.json() : { docs: [] };
        setSingleVideoData(itemBody?.docs?.[0] ?? null);
        setAllCategories(catBody?.docs ?? []);
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
      {/* Invite strip sits just before the "Next-Level Video
          Editing" Section12 book-call CTA — focused conversion
          prompt right after the main content finishes. */}
      <InviteForService authorId={singleVideoData?.author_id} />

      {/* Credibility crescendo. Order builds step by step into
          the book-call ask:
            CredentialsStrip → operational stats + pills
            TrustedByStrip   → recognisable client logos
            Section12        → in-page book-call CTA
          The trusted-by client logos land as the social-proof
          beat right before the booking CTA — same pattern used
          on the SingleService page so the conversion flow reads
          identically across every conversion-oriented page. */}
      <CredentialsStrip />

      <TrustedByStrip />

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

      {/* Final two-path CTA — Hire vs Join. Sits at the very
          bottom so it's the last thing the user sees after every
          other section has made its case. */}
      <HireOrJoin />

      {/* Sticky bottom-right "Talk to Anil" chip. Auto-hides
          when the mid-page Section12 book-call CTA enters view
          so the message doesn't double up. Only mounted on the
          single-video page (not on case study pages). */}
      <FloatingCallChip />
    </>
  );
}
