// @ts-nocheck
import React, { useMemo } from "react";
/**
 * "What we delivered" pill cloud — sits below the Partnership callout
 * on a case study. Lets a brand manager scan in two seconds whether
 * Cocoma's scope on this campaign covered what they need.
 *
 * Until Anshu adds a dedicated `services` array on marketing house items,
 * we deduce the list from the existing itemData fields:
 *   - content_created_category  → Video Production / Short-Form Content
 *                                 / Creative Carousels / Poster & Thumbnail Design
 *   - other_activity_category   → Partnered Amplification / Paid Amplification
 *                                 / WhatsApp Campaigns / Influencer Marketing /
 *                                 Video SEO / Community Management /
 *                                 [category name as-is fallback]
 *   - ideas_strategy_planning   → Strategy & Planning
 *   - pre_launch_activity       → Pre-Launch Activations
 *   - performance               → Performance Analytics
 *
 * Plus one always-on label ("YouTube Channel Growth") since that's
 * Cocoma's headline service and shows up on every case study by
 * definition.
 *
 * If the deduction yields zero pills (very minimal itemData), the
 * component renders nothing rather than an empty section.
 */

const ALWAYS_ON_SERVICES = ["YouTube Channel Growth"];

/** Map an "other activity" category name to a clean service label.
 *  Falls back to the original name if no rule matches. */
function labelForActivityCategory(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes("youtube") && lower.includes("amplif")) return "Partnered Amplification";
  if (lower.includes("partnered") && lower.includes("youtube")) return "Partnered Amplification";
  if (lower.includes("google ad") || lower.includes("paid")) return "Paid Amplification";
  if (lower.includes("whatsapp")) return "WhatsApp Campaigns";
  if (lower.includes("influenc")) return "Influencer Marketing";
  if (lower.includes("seo")) return "Video SEO";
  if (lower.includes("community")) return "Community Management";
  if (lower.includes("press") || lower.includes("pr ")) return "PR & Press";
  if (lower.includes("meme")) return "Meme Marketing";
  return name; // sensible fallback so unmapped categories still appear
}

function deduceServices(itemData) {
  if (!itemData) return [];
  const services = new Set();

  // Always-on
  ALWAYS_ON_SERVICES.forEach((s) => services.add(s));

  // Content created → production-side services
  itemData.content_created_category?.forEach((cat) => {
    const name = (cat?.category_name || "").toLowerCase();
    if (name.includes("video")) services.add("Video Production");
    if (name.includes("short")) services.add("Short-Form Content");
    if (name.includes("carousel")) services.add("Creative Carousels");
    if (name.includes("poster") || name.includes("thumbnail")) {
      services.add("Poster & Thumbnail Design");
    }
  });

  // Add-on activities → distribution / amplification services
  itemData.other_activity_category?.forEach((cat) => {
    const label = labelForActivityCategory(cat?.category_name);
    if (label) services.add(label);
  });

  // Strategy
  if (itemData.ideas_strategy_planning?.length) services.add("Strategy & Planning");
  if (itemData.pre_launch_activity?.length) services.add("Pre-Launch Activations");

  // Reporting
  if (itemData.performance?.length) services.add("Performance Analytics");

  return Array.from(services);
}

const ServicesDelivered = ({ itemData }) => {
  const services = useMemo(() => deduceServices(itemData), [itemData]);

  if (!services.length) return null;

  return (
    <section className="services-delivered-wrapper" aria-label="Services delivered on this campaign">
      <div className="services-delivered-inner">
        <p className="services-delivered-eyebrow">What we delivered</p>
        <h2 className="services-delivered-heading">
          End-to-end services on{" "}
          <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">
            this campaign
          </span>
        </h2>

        <ul className="services-delivered-pills">
          {services.map((service) => (
            <li key={service} className="services-delivered-pill">
              {service}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ServicesDelivered;
