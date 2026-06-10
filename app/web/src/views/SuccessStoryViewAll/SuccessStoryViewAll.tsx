// @ts-nocheck
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
import SuccessStoriesViewAll from "../../components/SuccessStory/ViewAll";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";

/**
 * /success-story-view-all — sticker index of every Cocoma case
 * study.
 *
 * Page shape (top to bottom):
 *   1. Custom sticker hero — replaces the previous shared
 *      <MarketingHouseBanner/> (which was identical to the one
 *      on /marketing-portfolio and read as generic).
 *   2. <SuccessStoriesViewAll/> — sticker grid + search + sort.
 *      Cards use Home() data (the dedicated list endpoint still
 *      doesn't return slug) so every card is clickable through
 *      to /client-success-stories/:slug.
 *   3. Closing sticker book-call card — replaces the previous
 *      <Section12/> + <ProjectSucess/> combo. One confident CTA
 *      with personal "Anil takes the call" framing. The wrapper
 *      carries the .home-book-call-container-wrapper class so
 *      <FloatingCallChip/> auto-hides when this section enters
 *      the viewport (no double-CTA).
 *   4. <FloatingCallChip/> — sticky bottom-right book-call
 *      affordance throughout, same component used on the detail
 *      pages so the conversion path is consistent across the
 *      success-stories funnel.
 */
interface SuccessStoryViewAllProps {
  initialStories?: any[];
}

const SuccessStoryViewAll = ({ initialStories = [] }: SuccessStoryViewAllProps) => {
  return (
    <>
      <div className="success-view-all-page">
        <section className="success-view-all-hero">
          <div className="success-view-all-hero-inner">
            <p className="success-view-all-hero-eyebrow">
              Success stories
            </p>
            <h1 className="success-view-all-hero-title font-primary">
              Channels grown. Films launched.
              <br />
              Brands built.
            </h1>
            <p className="success-view-all-hero-sub">
              Real outcomes from real partners — case studies of
              what happens when craft, content strategy, and
              audience-building come together inside one team.
            </p>
          </div>
        </section>

        <section className="success-view-all-explore-section">
          <SuccessStoriesViewAll initialStories={initialStories} />
        </section>

        <section className="success-view-all-closer-section home-book-call-container-wrapper">
          <div className="success-view-all-closer">
            <div className="success-view-all-closer-body">
              <p className="success-view-all-closer-eyebrow">
                Want a story like these?
              </p>
              <h2 className="success-view-all-closer-title font-primary">
                Let's build yours.
              </h2>
              <p className="success-view-all-closer-sub">
                Pick a 15-minute slot — Anil takes the call himself.
                Walk away with a clear shape of what we'd do for you.
              </p>
            </div>
            <Link
              to="/ScheduleMeeting"
              className="success-view-all-closer-cta"
            >
              Book a call
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
      <FloatingCallChip />
    </>
  );
};

export default SuccessStoryViewAll;
