import TrustedBrandsMarquee from "@/src/components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";
import HowItWorksSteps from "@/src/components/Services/HowItWorksSteps/HowItWorksSteps";
import CredentialsStrip from "@/src/components/SingleVideo/CredentialsStrip/CredentialsStrip";
import FloatingCallChip from "@/src/components/SingleVideo/FloatingCallChip/FloatingCallChip";
import HireOrJoin from "@/src/components/SingleVideo/HireOrJoin/HireOrJoin";
import {
  DESIGN_BLOCKS,
  DESIGN_HIRE_OR_JOIN_CARDS,
  DESIGN_STATS,
  DESIGN_STEPS,
  SHOW_PRICING,
} from "./designData";
import DesignFaq from "./DesignFaq";
import DesignHero from "./DesignHero";
import DesignMobileCartBar from "./DesignMobileCartBar";
import DesignPricing from "./DesignPricing";
import DesignServiceBlock from "./DesignServiceBlock";
import DesignTeam from "./DesignTeam";
import { WRAP } from "./designTheme";

/**
 * /services/design — the Design services page, in the order the approved
 * mockup lays it out. Nav, footer, cart toast and back-to-top come from
 * SiteShell like every other public page.
 *
 * Shared bands (logo strip, how-it-works, "why teams keep coming back",
 * "two ways to work with Cocoma", the floating call chip) are the same
 * components the thumbnail page renders; only this page's copy is passed in.
 */
export default function DesignPage() {
  return (
    <div className="w-full bg-page text-body">
      <DesignHero />

      <TrustedBrandsMarquee />

      <HowItWorksSteps steps={DESIGN_STEPS} />

      <section id="services" aria-label="Design services" className="w-full bg-page pt-14 pb-10">
        <div className={`${WRAP} flex flex-col gap-10`}>
          {DESIGN_BLOCKS.map((block, index) => (
            <DesignServiceBlock key={block.id} block={block} flip={index % 2 === 1} />
          ))}
        </div>
      </section>

      <DesignTeam />

      <CredentialsStrip
        heading={DESIGN_STATS.heading}
        stats={DESIGN_STATS.stats}
        pills={DESIGN_STATS.pills}
      />

      {/* Mocked until the rate card lands; when hidden nothing is rendered,
          so the FAQ sits straight under the stats band. */}
      {SHOW_PRICING ? <DesignPricing /> : null}

      <DesignFaq />

      {/* `heading` is typed as required but optional in practice: undefined
          renders the component's own "Two ways to work with Cocoma". */}
      <HireOrJoin cards={DESIGN_HIRE_OR_JOIN_CARDS} heading={undefined} />

      <DesignMobileCartBar />
      <FloatingCallChip />
    </div>
  );
}
