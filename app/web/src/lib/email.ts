/* Opens a mailto: link with a web-mail fallback.

   A plain <a href="mailto:..."> silently does nothing when the visitor
   has no default mail app configured (very common on Windows + Chrome).
   This helper first hands the mailto to the OS; if the browser never
   loses focus within the grace period — meaning no mail app opened —
   it falls back to Gmail's compose screen in a new tab.

   Keep the mailto href on the anchor itself (accessibility, middle-click,
   copy-address) and call this from onClick with preventDefault. */

const FALLBACK_DELAY_MS = 1200;

export function openMailto(mailtoHref: string): void {
  // mailto: parses cleanly with URL — pathname is the address and
  // subject/body arrive as regular search params.
  let gmailHref = "";
  try {
    const url = new URL(mailtoHref);
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: url.pathname,
      su: url.searchParams.get("subject") || "",
      body: url.searchParams.get("body") || "",
    });
    gmailHref = `https://mail.google.com/mail/?${params.toString()}`;
  } catch {
    /* malformed href — still attempt the native handoff below */
  }

  let mailAppOpened = false;
  const markHandled = () => {
    mailAppOpened = true;
  };
  // A mail client opening steals focus from the tab/window.
  window.addEventListener("blur", markHandled);
  document.addEventListener("visibilitychange", markHandled);

  window.location.href = mailtoHref;

  window.setTimeout(() => {
    window.removeEventListener("blur", markHandled);
    document.removeEventListener("visibilitychange", markHandled);
    if (!mailAppOpened && gmailHref) {
      window.open(gmailHref, "_blank", "noopener,noreferrer");
    }
  }, FALLBACK_DELAY_MS);
}
