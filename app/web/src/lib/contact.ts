/* The one place the site's public WhatsApp contact lives.

   Every WhatsApp button on the site opens the TEAM line. Import from
   here instead of writing a number into a component: a number typed
   into a page is how somebody's own phone ends up one tap from every
   casual visitor, and one constant makes moving the team to a new
   line a one-line change.

   NEXT_PUBLIC_TEAM_WHATSAPP overrides the default at build time
   (Next inlines NEXT_PUBLIC_* values). The default is the team number
   the footer has always shown, so the buttons work with no env set. */
const DEFAULT_TEAM_WHATSAPP = "918655643377";

/** Team WhatsApp number, digits only with country code (wa.me format).
    Strip first, then fall back: a value with no digits in it ("TBD", a
    lone "+") must not turn every button into a number-less link. */
export const TEAM_WHATSAPP =
  (process.env.NEXT_PUBLIC_TEAM_WHATSAPP || "").replace(/[^0-9]/g, "") || DEFAULT_TEAM_WHATSAPP;

/* WhatsApp opens the chat with the caret at the END of the prefilled
   text. So the message ends on one open prompt, and the page the
   visitor came from sits in the greeting line where their typing
   cannot land after it. That line is what lets enquiries be counted
   by page. `source` completes "writing from your …": "website",
   "contact page". */
const DEFAULT_OPENER = "I need help with: ";

/** wa.me link to the team line. `opener` must end on its one open prompt. */
export const teamWhatsappLink = (source: string, opener: string = DEFAULT_OPENER): string =>
  `https://wa.me/${TEAM_WHATSAPP}?text=${encodeURIComponent(
    `Hello Cocoma team, writing from your ${source}.\n${opener}`
  )}`;
