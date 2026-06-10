// @ts-nocheck
import { Link } from "@/src/lib/navigation";
import LegalPage from "./_shared/LegalPage";

const PRIVACY_EMAIL = "hello@cocomadigital.com";
// const COMPANY_NAME = "Cocoma Digital Private Limited";
const LAST_UPDATED = "29 April 2026";

const sections = [
  {
    id: "what-are-cookies",
    title: "What are cookies?",
    body: (
      <>
        <p className="legal-p">
          Cookies are small text files that a website places on
          your device when you visit. They let a site remember
          things about your visit — your preferences, whether
          you're signed in, how you navigated to a page — so the
          experience can work properly across page loads.
        </p>
        <p className="legal-p">
          We also use related technologies (pixels, local-storage
          entries, software-development-kit identifiers) which
          serve similar purposes. Whenever this policy says
          <strong>"cookies"</strong>, it covers those too.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-cookies",
    title: "How we use cookies",
    body: (
      <>
        <p className="legal-p">
          We use cookies for a small number of clearly-scoped
          purposes:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Strictly necessary</strong> — make the Site
            work. Without these, forms, sessions, and basic
            navigation would break.
          </li>
          <li className="legal-li">
            <strong>Functional</strong> — remember your
            preferences (language, region, recently-viewed
            content) so you don't have to set them every visit.
          </li>
          <li className="legal-li">
            <strong>Analytics</strong> — help us understand which
            pages get used, where readers drop off, and what to
            improve. The data is aggregated and doesn't identify
            you personally.
          </li>
          <li className="legal-li">
            <strong>Advertising / marketing</strong> — measure the
            performance of campaigns that brought you to the
            Site, and show you relevant follow-up content on
            third-party platforms. We only set these with your
            consent where consent is required.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookie-inventory",
    title: "Cookies we use",
    body: (
      <>
        <p className="legal-p">
          The table below lists the cookies you're most likely to
          see on the Site. We update it after each cookie scan;
          some entries may not appear on every visit, depending
          on what you've consented to and which features you've
          used.{" "}
          <span className="legal-todo">
            TODO: confirm with a current cookie scan.
          </span>
        </p>
        <div className="legal-table-wrapper">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>cocoma_session</td>
                <td>cocomadigital.com</td>
                <td>
                  Maintains your session state (e.g. inquiry cart
                  contents, language).
                </td>
                <td>Strictly necessary</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>cocoma_lang</td>
                <td>cocomadigital.com</td>
                <td>
                  Remembers the language you've selected for the
                  Site.
                </td>
                <td>Functional</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>_ga</td>
                <td>Google Analytics</td>
                <td>
                  Distinguishes unique visitors so we can
                  understand aggregate Site usage.
                </td>
                <td>Analytics</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>_ga_*</td>
                <td>Google Analytics 4</td>
                <td>
                  Persists session state for GA4 (replaces the
                  older <em>_gid</em> cookie).
                </td>
                <td>Analytics</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>_gcl_au</td>
                <td>Google</td>
                <td>
                  Used by Google Ads conversion tracking when an
                  ads campaign is active.
                </td>
                <td>Advertising</td>
                <td>3 months</td>
              </tr>
              <tr>
                <td>li_at / lidc</td>
                <td>LinkedIn</td>
                <td>
                  Set if you load embedded LinkedIn content (e.g.
                  Cocoma's company page).
                </td>
                <td>Functional / Advertising</td>
                <td>Up to 1 year</td>
              </tr>
              <tr>
                <td>YSC / VISITOR_INFO1_LIVE</td>
                <td>YouTube (Google)</td>
                <td>
                  Set when an embedded YouTube video loads — used
                  for video-playback metrics.
                </td>
                <td>Functional / Analytics</td>
                <td>Session — 6 months</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party cookies",
    body: (
      <>
        <p className="legal-p">
          Some features of the Site rely on third-party services
          which set their own cookies under their own privacy
          terms. The current list is reflected in the inventory
          above. Each provider's policy:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            Google (Analytics, Ads, YouTube):{" "}
            <Link
              className="legal-a"
              to="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              policies.google.com/privacy
            </Link>
          </li>
          <li className="legal-li">
            LinkedIn:{" "}
            <Link
              className="legal-a"
              to="https://www.linkedin.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              linkedin.com/legal/privacy-policy
            </Link>
          </li>
          <li className="legal-li">
            Other embedded services as listed in our{" "}
            <Link className="legal-a" to="/privacy-policy">
              Privacy Policy
            </Link>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "controls",
    title: "How to control cookies",
    body: (
      <>
        <p className="legal-p">
          You can manage cookies in three ways:
        </p>

        <h3 className="legal-h3">1. Through our consent banner</h3>
        <p className="legal-p">
          Where required by law, the Site shows a cookie banner
          on your first visit that lets you accept or reject
          non-essential cookies by category. You can change your
          choices at any time by clicking{" "}
          <strong>Cookie preferences</strong> in the footer.{" "}
          <span className="legal-todo">
            TODO: wire the cookie consent banner.
          </span>
        </p>

        <h3 className="legal-h3">2. Through your browser</h3>
        <p className="legal-p">
          Most browsers let you block or delete cookies through
          their settings. Instructions for the major browsers:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <Link
              className="legal-a"
              to="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Chrome
            </Link>
          </li>
          <li className="legal-li">
            <Link
              className="legal-a"
              to="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mozilla Firefox
            </Link>
          </li>
          <li className="legal-li">
            <Link
              className="legal-a"
              to="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Safari
            </Link>
          </li>
          <li className="legal-li">
            <Link
              className="legal-a"
              to="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Edge
            </Link>
          </li>
        </ul>
        <p className="legal-p">
          Disabling all cookies will likely break parts of the
          Site (especially forms and the inquiry cart), so we
          suggest blocking by category rather than wholesale.
        </p>

        <h3 className="legal-h3">3. Through provider opt-outs</h3>
        <ul className="legal-ul">
          <li className="legal-li">
            Google Analytics opt-out (browser add-on):{" "}
            <Link
              className="legal-a"
              to="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              tools.google.com/dlpage/gaoptout
            </Link>
          </li>
          <li className="legal-li">
            EU advertising opt-out (Your Online Choices):{" "}
            <Link
              className="legal-a"
              to="https://www.youronlinechoices.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              youronlinechoices.com
            </Link>
          </li>
          <li className="legal-li">
            US advertising opt-out (Digital Advertising Alliance):{" "}
            <Link
              className="legal-a"
              to="https://optout.aboutads.info"
              target="_blank"
              rel="noopener noreferrer"
            >
              optout.aboutads.info
            </Link>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "region-specific",
    title: "Region-specific consent",
    body: (
      <>
        <p className="legal-p">
          The legal regime around cookies varies. Where you live
          determines what's required for which categories.
        </p>

        <div className="legal-region">
          <span className="legal-region-label">EU / EEA</span>
          <h4 className="legal-region-title">
            ePrivacy Directive
          </h4>
          <p className="legal-p">
            We obtain your prior, freely-given consent before
            setting any non-essential cookies (analytics,
            advertising, functional cookies that aren't strictly
            necessary). Strictly-necessary cookies are set on a
            "legitimate interests" basis and don't require
            consent.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">United Kingdom</span>
          <h4 className="legal-region-title">
            PECR &amp; UK GDPR
          </h4>
          <p className="legal-p">
            UK consent rules mirror the EU regime. The ICO
            considers analytics cookies to require consent (with
            limited exceptions). We follow this approach.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">India</span>
          <h4 className="legal-region-title">
            DPDP Act 2023
          </h4>
          <p className="legal-p">
            For visitors from India, we obtain notice-based
            consent for non-essential cookies in line with
            Section 6 of the DPDP Act. You may withdraw consent
            at any time through our cookie preferences or by
            emailing{" "}
            <Link className="legal-a" to={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </Link>
            .
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Australia</span>
          <h4 className="legal-region-title">
            Privacy Act &amp; Spam Act
          </h4>
          <p className="legal-p">
            Australian visitors are notified about our cookie
            use here and can opt out of non-essential cookies
            through their browser, our consent banner, or the
            provider opt-outs above.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">United States</span>
          <h4 className="legal-region-title">
            CCPA / CPRA &amp; state laws
          </h4>
          <p className="legal-p">
            We honour Global Privacy Control (GPC) signals as a
            valid opt-out request from California residents and
            residents of other US states with similar laws. You
            may also opt out manually through our consent banner
            or by emailing{" "}
            <Link className="legal-a" to={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </Link>
            .
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Singapore</span>
          <h4 className="legal-region-title">PDPA</h4>
          <p className="legal-p">
            Notice-based consent applies. You may opt out of
            non-essential cookies via our consent banner or
            browser settings.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates to this policy",
    body: (
      <p className="legal-p">
        We update this Cookie Policy whenever we change which
        cookies we use, and at least annually. The "Last updated"
        date at the top tells you when the current version took
        effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p className="legal-p">
        Questions about cookies on the Site? Write to{" "}
        <Link className="legal-a" to={`mailto:${PRIVACY_EMAIL}`}>
          {PRIVACY_EMAIL}
        </Link>{" "}
        — we'll get back to you. Cocoma Digital Private Limited,
        25, Maa Sharda Villa, Near St. Blaise Church, Amboli, Andheri West, Mumbai, Maharashtra 400058, India.
      </p>
    ),
  },
];

const CookiePolicy = () => {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Cookie Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <p>
            Plain-English summary: We use a handful of cookies to
            keep the Site working, remember your preferences, and
            understand which pages are useful. You're in control —
            this page lists what we use, why, and how to change
            your mind.
          </p>
          <p>
            For anything you'd rather just ask, email{" "}
            <Link className="legal-a" to={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </Link>
            .
          </p>
        </>
      }
      sections={sections}
      otherDocs={[
        { path: "/privacy-policy", label: "Privacy Policy" },
        { path: "/terms", label: "Terms of Service" },
      ]}
    />
  );
};

export default CookiePolicy;
