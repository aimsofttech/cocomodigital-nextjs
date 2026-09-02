// @ts-nocheck
"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import SecondaryLink from "../../common/SecondaryLink/SecondaryLink";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import { usePathname } from "next/navigation";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import type { BookCallData } from "../../../lib/homeServerFetch";

interface BookCallBannerProps {
  // Pre-fetched from the server (home page SSR path)
  bookCallData?: BookCallData | null;
  // Legacy client-side fetch path (other pages)
  templateId?: number | string;
}

const BookCallBanner = ({ bookCallData: serverData, templateId = 1 }: BookCallBannerProps) => {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 500px)");

  // Client-fetch state — only used when templateId is provided
  // and no server data was passed in.
  const [clientData, setClientData] = useState<BookCallData | null>(null);

  const fetchBookCallData = useCallback(async () => {
    if (!templateId) return;
    /* the API book-call-templates by id, flattened to legacy
       BookCallData shape (book_title1, book_description1, etc).
       Public read; depth=1 expands the book_image upload to a
       full media doc so we can grab its url. */
    try {
      const url = new URL("/content-api/book-call-templates", window.location.origin);
      url.searchParams.set("where[id][equals]", String(templateId));
      url.searchParams.set("limit", "1");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const doc = body?.docs?.[0];
      if (!doc) {
        setClientData(null);
        return;
      }
      setClientData({
        id: doc.id,
        book_heading: doc.book_heading,
        book_button_text: doc.book_button_text,
        book_image:
          (typeof doc.book_image === "object" && doc.book_image?.url) ||
          doc.legacyImageUrl,
        book_title1: doc.left_column?.book_title1,
        book_description1: doc.left_column?.book_description1,
        book_title2: doc.right_column?.book_title2,
        book_description2: doc.right_column?.book_description2,
      });
    } catch {
      console.error("Failed to fetch Book Call data for template ID:", templateId);
      setClientData(null);
    }
  }, [templateId]);

  useEffect(() => {
    // Only fetch client-side when the server didn't pass data
    if (!serverData && templateId) {
      fetchBookCallData();
    }
  }, [serverData, templateId, fetchBookCallData]);

  const bookCall = serverData ?? clientData;

  return bookCall?.book_button_text ? (
    <div className="home-book-call-main edit-host">
      <EditPencil to={adminRoutes.templates.bookCall(bookCall?.id)} label="the book-a-call banner" />
      <div className="home-book-call-img-wrapper">
        {!pathname?.startsWith("/case-studies") && bookCall?.book_image && (
          <Image
            src={bookCall.book_image}
            alt="Book A Call"
            width={600}
            height={600}
            style={{ width: "100%", height: "auto" }}
          />
        )}
        {pathname?.startsWith("/case-studies") && !isMobile && bookCall?.book_image && (
          <Image
            src={bookCall.book_image}
            alt="Book A Call"
            width={600}
            height={600}
            style={{ width: "100%", height: "auto" }}
          />
        )}

        <div className="res-home-book-call-btn-wrapper">
          <SecondaryLink title={bookCall?.book_button_text} path="/ScheduleMeeting" />
        </div>
      </div>

      <div className="home-book-call-content-wrapper pb-3">
        <h2 className="home-book-call-content-main-title font-primary">{bookCall?.book_heading}</h2>

        <div>
          <h5 className="home-book-call-content-title">{bookCall?.book_title1}</h5>
          <p className="home-book-call-content-description">{bookCall?.book_description1}</p>
        </div>

        <div>
          <h5 className="home-book-call-content-title">{bookCall?.book_title2}</h5>
          <p className="home-book-call-content-description">{bookCall?.book_description2}</p>
        </div>

        <div className="home-book-call-btn-wrapper">
          <div style={{ minWidth: "350px" }}>
            <SecondaryLink title={bookCall?.book_button_text} path="/ScheduleMeeting" />
          </div>
        </div>
      </div>

    </div>
  ) : null;
};

export default BookCallBanner;
