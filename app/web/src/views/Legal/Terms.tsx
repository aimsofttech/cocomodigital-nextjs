// @ts-nocheck
import LegalPage from "./_shared/LegalPage";

/**
 * /terms — Terms of Service for cocomadigital.com.
 *
 * The Site is informational + lead-gen + inquiry-assembly. No
 * payments are processed through the Site, so these Terms cover
 * site usage only — not service engagements. Paid engagements
 * with Cocoma are governed by separate engagement letters /
 * SOWs which take precedence over anything here.
 *
 * Inputs from Anil:
 *   - Governing law: Mumbai, India
 *   - No payment on the website
 *   - Privacy/legal contact: hello@cocomadigital.com
 *
 * Lawyer review required before binding.
 */

const PRIVACY_EMAIL = "hello@cocomadigital.com";
const COMPANY_NAME = "Cocoma Digital Private Limited";
const COMPANY_ADDRESS =
  "25, Maa Sharda Villa, Near St. Blaise Church, Amboli, Andheri West, Mumbai, Maharashtra 400058, India";
const GOVERNING_LAW = "the laws of India";
const COURTS = "the courts of Mumbai, Maharashtra, India";
const LAST_UPDATED = "29 April 2026";

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p className="legal-p">
          These Terms of Service (<strong>"Terms"</strong>) govern
          your use of{" "}
          <a className="legal-a" href="https://cocomadigital.com">
            cocomadigital.com
          </a>{" "}
          (the <strong>"Site"</strong>) operated by{" "}
          {COMPANY_NAME} (<strong>"Cocoma"</strong>,{" "}
          <strong>"we"</strong>, <strong>"us"</strong>). By
          accessing the Site or submitting a form, you agree to
          these Terms. If you don't agree, please don't use the
          Site.
        </p>
        <p className="legal-p">
          These Terms are a legally binding agreement between you
          and Cocoma. They supplement (and don't replace) any
          separate engagement letter or statement of work you may
          sign with us — those documents govern paid services and
          take precedence over anything here in case of conflict.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use the Site",
    body: (
      <p className="legal-p">
        You must be at least 18 years old (or the age of majority
        in your jurisdiction) to use the Site. If you're using it
        on behalf of a company, you represent that you have
        authority to bind that company to these Terms.
      </p>
    ),
  },
  {
    id: "what-the-site-is",
    title: "What the Site is",
    body: (
      <>
        <p className="legal-p">
          The Site is a marketing and lead-generation platform.
          Through the Site you can:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            Read about Cocoma's services, solutions, and case
            studies.
          </li>
          <li className="legal-li">
            Submit a contact or career form.
          </li>
          <li className="legal-li">
            Schedule a discovery meeting.
          </li>
          <li className="legal-li">
            Assemble an inquiry "cart" of services you'd like to
            discuss.
          </li>
        </ul>
        <p className="legal-p">
          <strong>
            No payments are processed through the Site.
          </strong>{" "}
          Any paid relationship with Cocoma starts only after a
          separate engagement letter or statement of work has
          been signed.
        </p>
      </>
    ),
  },
  {
    id: "your-account",
    title: "Your information and inquiries",
    body: (
      <p className="legal-p">
        When you submit a form, schedule a meeting, or assemble an
        inquiry, you provide information about yourself or your
        company. The information you provide is governed by our{" "}
        <a className="legal-a" href="/privacy-policy">
          Privacy Policy
        </a>
        . You agree to provide accurate, current, and complete
        information, and to update it if it changes.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p className="legal-p">
          You agree to use the Site only for lawful purposes. You
          will not:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            Use the Site in a way that violates any law or
            regulation.
          </li>
          <li className="legal-li">
            Submit false, misleading, or fraudulent information.
          </li>
          <li className="legal-li">
            Scrape, harvest, or systematically extract content
            from the Site without our written permission.
          </li>
          <li className="legal-li">
            Attempt to reverse-engineer, decompile, or otherwise
            derive source code from the Site.
          </li>
          <li className="legal-li">
            Introduce malware, viruses, or other harmful code, or
            attempt to gain unauthorised access to the Site or
            the systems behind it.
          </li>
          <li className="legal-li">
            Infringe anyone else's intellectual-property rights,
            privacy rights, or other rights.
          </li>
          <li className="legal-li">
            Interfere with the Site's operation, including by
            denial-of-service attacks or excessive automated
            requests.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <>
        <h3 className="legal-h3">Our content</h3>
        <p className="legal-p">
          The Site, its design, text, graphics, logos, video,
          photography, and code are owned by Cocoma or our
          licensors and are protected by copyright, trademark,
          and other intellectual-property laws. We grant you a
          limited, non-exclusive, non-transferable, revocable
          licence to view the Site for your personal or internal
          business use. All other rights are reserved.
        </p>

        <h3 className="legal-h3">Your content</h3>
        <p className="legal-p">
          Anything you submit through the Site (e.g. inquiry
          messages, applications, attachments) remains yours.
          You grant us a worldwide, non-exclusive, royalty-free
          licence to use, store, and process your submissions
          solely as needed to respond to you, deliver any
          services we agree to, and comply with law.
        </p>

        <h3 className="legal-h3">Trademarks</h3>
        <p className="legal-p">
          "Cocoma", "Cocoma Digital", and our logos are
          trademarks of {COMPANY_NAME}. You may not use them
          without our written permission. Other trademarks
          referenced on the Site are the property of their
          respective owners.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links",
    title: "Third-party links and content",
    body: (
      <p className="legal-p">
        The Site may link to third-party websites, products, or
        services. Those resources are governed by the third
        party's own terms and privacy practices. We don't
        control them and we're not responsible for their
        content, accuracy, or availability.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p className="legal-p">
        To the maximum extent permitted by law, the Site is
        provided <strong>"as is"</strong> and{" "}
        <strong>"as available"</strong> without warranties of any
        kind, whether express, implied, or statutory — including
        warranties of merchantability, fitness for a particular
        purpose, non-infringement, or that the Site will be
        uninterrupted, error-free, or secure. Nothing on the
        Site is professional advice. Any decisions you make based
        on Site content are at your own risk.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p className="legal-p">
          To the maximum extent permitted by law, Cocoma and our
          officers, directors, employees, and contractors will
          not be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages arising
          out of or relating to your use of the Site — including
          loss of profits, revenue, data, goodwill, or other
          intangible losses — even if we've been advised of the
          possibility.
        </p>
        <p className="legal-p">
          To the maximum extent permitted by law, our total
          liability for any claim arising out of or relating to
          the Site is limited to one hundred US dollars (USD
          $100) or the equivalent in your local currency. This
          limit applies in the aggregate, not per incident.
        </p>
        <p className="legal-p">
          <strong>
            Some jurisdictions don't allow the exclusion or
            limitation of certain damages, so the limits above
            may not apply to you in full. Nothing in these Terms
            limits any liability that cannot be limited under
            applicable law (including liability for fraud, death,
            or personal injury caused by negligence).
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    body: (
      <p className="legal-p">
        You agree to indemnify and hold harmless Cocoma and our
        officers, directors, employees, and contractors from any
        claim, demand, damages, loss, or expense (including
        reasonable legal fees) arising out of or related to your
        breach of these Terms, your misuse of the Site, or your
        violation of any law or any third-party right.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p className="legal-p">
        We may suspend or terminate your access to the Site at
        any time, with or without notice, if we believe you have
        breached these Terms or for any other reason at our
        reasonable discretion. The sections of these Terms that
        by their nature should survive termination — including
        Intellectual property, Disclaimers, Limitation of
        liability, Indemnification, and Governing law — will
        survive.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and dispute resolution",
    body: (
      <>
        <p className="legal-p">
          These Terms, and any dispute arising out of or relating
          to them or your use of the Site, are governed by{" "}
          {GOVERNING_LAW}, without regard to conflict-of-laws
          rules. The {COURTS} have exclusive jurisdiction over
          any such dispute, and you consent to the personal
          jurisdiction of those courts.
        </p>
        <p className="legal-p">
          Before starting formal proceedings, the parties agree
          to attempt to resolve any dispute in good faith for at
          least 30 days following written notice.
        </p>
      </>
    ),
  },
  {
    id: "consumer-rights",
    title: "Region-specific consumer rights",
    body: (
      <>
        <p className="legal-p">
          The provisions below apply if your local law grants you
          stronger rights than the rest of these Terms. Where a
          regional rule prevails, it does so only to the extent
          required by your local law.
        </p>

        <div className="legal-region">
          <span className="legal-region-label">EU / UK</span>
          <h4 className="legal-region-title">
            Consumer rights and dispute resolution
          </h4>
          <p className="legal-p">
            If you're a consumer in the EU or UK, your statutory
            consumer rights are not affected by these Terms. The
            governing-law clause above does not deprive you of
            the protection afforded by mandatory rules of the
            country where you live. EU consumers may use the
            European Commission's Online Dispute Resolution
            platform (
            <a
              className="legal-a"
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
            >
              ec.europa.eu/consumers/odr
            </a>
            ).
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Australia</span>
          <h4 className="legal-region-title">
            Australian Consumer Law
          </h4>
          <p className="legal-p">
            If you're a consumer under the Australian Consumer
            Law, you have guarantees that cannot be excluded.
            Nothing in these Terms excludes, restricts, or
            modifies any right or remedy available to you under
            the Australian Consumer Law.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">India</span>
          <h4 className="legal-region-title">
            Consumer Protection Act, 2019
          </h4>
          <p className="legal-p">
            If you're a consumer under the Consumer Protection
            Act, 2019, your statutory rights are not affected.
            You may also raise complaints with the relevant
            consumer-redressal forum under that Act.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">United States</span>
          <h4 className="legal-region-title">
            State-level consumer rights
          </h4>
          <p className="legal-p">
            Nothing in these Terms is intended to override
            mandatory consumer-protection rights granted to you
            by the law of the US state in which you reside.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p className="legal-p">
        We may update these Terms from time to time. The "Last
        updated" date at the top tells you when the current
        version took effect. For material changes, we'll give you
        reasonable notice — typically through a banner on the
        Site or by email if we have your address. Your continued
        use of the Site after the changes take effect means you
        accept the updated Terms.
      </p>
    ),
  },
  {
    id: "miscellaneous",
    title: "Miscellaneous",
    body: (
      <>
        <p className="legal-p">
          <strong>Entire agreement.</strong> These Terms, together
          with our Privacy Policy and any engagement letter you
          sign with us, are the entire agreement between you and
          Cocoma about the Site and supersede any prior
          agreements about the same subject matter.
        </p>
        <p className="legal-p">
          <strong>Severability.</strong> If any part of these
          Terms is held unenforceable, the rest stays in effect.
        </p>
        <p className="legal-p">
          <strong>No waiver.</strong> Our failure to enforce a
          right under these Terms is not a waiver of that right.
        </p>
        <p className="legal-p">
          <strong>Assignment.</strong> You may not assign these
          Terms without our written consent. We may assign these
          Terms to an affiliate or in connection with a merger,
          acquisition, or sale of assets.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p className="legal-p">
        Questions about these Terms? Write to:
        <br />
        <strong>{COMPANY_NAME}</strong>
        <br />
        {COMPANY_ADDRESS}
        <br />
        Email:{" "}
        <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
          {PRIVACY_EMAIL}
        </a>
      </p>
    ),
  },
];

const Terms = () => {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <p>
            Plain-English summary: These Terms cover your use of
            cocomadigital.com — the marketing site, the inquiry
            forms, and the booking flow. They do <em>not</em>{" "}
            cover paid engagements with us; those are governed by
            a separate engagement letter you'd sign before any
            work starts.
          </p>
          <p>
            Questions? Email{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </>
      }
      sections={sections}
      otherDocs={[
        { path: "/privacy-policy", label: "Privacy Policy" },
        { path: "/cookie-policy", label: "Cookie Policy" },
      ]}
    />
  );
};

export default Terms;
