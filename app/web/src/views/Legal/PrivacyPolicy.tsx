// @ts-nocheck
import LegalPage from "./_shared/LegalPage";

/**
 * /privacy-policy
 *
 * Multi-jurisdiction privacy notice — hits the disclosures
 * required by GDPR (EU/UK), CCPA/CPRA (California), DPDP Act
 * 2023 (India), Privacy Act 1988 / APPs (Australia), PDPA
 * (Singapore), and APPI (Japan). Region-specific notices are
 * grouped under section "Region-specific notices" so the body
 * stays readable for global readers while still satisfying
 * each region's mandatory disclosure points.
 *
 * Inputs from Anil:
 *   - Privacy contact: hello@cocomadigital.com
 *   - Retention: 30 days after a contract ends
 *
 * Inputs still to fill before going live (kept inline as
 * <span class="legal-todo"> markers):
 *   - Real sub-processor list (currently example placeholders)
 *   - Where servers physically sit (for transfers section)
 *
 * Lawyer review required before binding. Last updated date is
 * the date of the redesign — Anil to bump on each material
 * revision.
 */

const PRIVACY_EMAIL = "hello@cocomadigital.com";
const COMPANY_NAME = "Cocoma Digital Private Limited";
const COMPANY_ADDRESS =
  "25, Maa Sharda Villa, Near St. Blaise Church, Amboli, Andheri West, Mumbai, Maharashtra 400058, India";
const LAST_UPDATED = "29 April 2026";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p className="legal-p">
          This Privacy Policy describes how {COMPANY_NAME} (
          <strong>"Cocoma"</strong>, <strong>"we"</strong>,{" "}
          <strong>"us"</strong>) collects, uses, shares, and protects
          information about you when you visit{" "}
          <a className="legal-a" href="https://cocomadigital.com">
            cocomadigital.com
          </a>{" "}
          (the "Site"), submit a form, schedule a meeting, or
          otherwise interact with us through the Site.
        </p>
        <p className="legal-p">
          We've written this notice to satisfy the disclosure
          requirements of the laws that apply to you wherever you
          live — including the GDPR (EU), UK GDPR, CCPA / CPRA
          (California), DPDP Act 2023 (India), Privacy Act 1988
          (Australia), PDPA (Singapore), and APPI (Japan).
          Region-specific rights are spelled out under{" "}
          <a className="legal-a" href="#region-specific">
            Region-specific notices
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p className="legal-p">
          <strong>{COMPANY_NAME}</strong>
          <br />
          {COMPANY_ADDRESS}
        </p>
        <p className="legal-p">
          For privacy questions, requests, or complaints, write to
          us at{" "}
          <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          . For users in the EU/UK, this address also serves as
          our data-protection contact. For users in India, this
          address serves as our Grievance Officer contact under
          Section 8(9) of the DPDP Act 2023.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "Information we collect",
    body: (
      <>
        <h3 className="legal-h3">Information you give us</h3>
        <p className="legal-p">
          When you submit a contact form, schedule a meeting, or
          inquire about our services, you provide:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Identifiers</strong> — name, email address,
            phone number (if provided), company name, and role.
          </li>
          <li className="legal-li">
            <strong>Inquiry content</strong> — the message you send
            us, the type of help you're looking for, and any
            attachments you choose to share.
          </li>
          <li className="legal-li">
            <strong>Career applications</strong> — résumé, work
            history, and any other information you submit through
            our careers section.
          </li>
        </ul>

        <h3 className="legal-h3">Information collected automatically</h3>
        <p className="legal-p">
          When you visit the Site, we (and our service providers)
          may automatically collect:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Device & connection data</strong> — IP address,
            browser type and version, operating system, device
            identifiers, time zone.
          </li>
          <li className="legal-li">
            <strong>Usage data</strong> — pages visited, links
            clicked, referring URL, time spent on pages.
          </li>
          <li className="legal-li">
            <strong>Cookies and similar technologies</strong> — see
            our{" "}
            <a className="legal-a" href="/cookie-policy">
              Cookie Policy
            </a>{" "}
            for the full inventory.
          </li>
        </ul>

        <h3 className="legal-h3">Information from third parties</h3>
        <p className="legal-p">
          If you reach us through a third-party platform (e.g.
          social-media login or referral), we may receive limited
          profile information from that platform under their own
          privacy terms.
        </p>

        <p className="legal-p">
          <strong>We do not collect payment information through
          the Site.</strong> All paid engagements are handled
          through separate engagement letters and invoicing
          channels.
        </p>
      </>
    ),
  },
  {
    id: "why-we-collect",
    title: "Why we use your information",
    body: (
      <>
        <p className="legal-p">
          We use your information for the following purposes. The
          legal basis on which we rely (under GDPR / UK GDPR) and
          the equivalent business purpose (under CCPA/CPRA) are
          listed beside each:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Respond to inquiries and book meetings</strong>{" "}
            — performance of a contract or pre-contract steps you
            asked us to take.
          </li>
          <li className="legal-li">
            <strong>Process job applications</strong> — pre-contract
            steps; legitimate interests in evaluating candidates.
          </li>
          <li className="legal-li">
            <strong>Send marketing emails</strong> — your consent
            (you can withdraw at any time).
          </li>
          <li className="legal-li">
            <strong>Improve the Site and our services</strong> —
            legitimate interests in understanding how the Site is
            used.
          </li>
          <li className="legal-li">
            <strong>Detect and prevent fraud, abuse, and security
            incidents</strong> — legitimate interests; legal
            obligation.
          </li>
          <li className="legal-li">
            <strong>Comply with legal, tax, and regulatory
            obligations</strong> — legal obligation.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-share",
    title: "How we share information",
    body: (
      <>
        <p className="legal-p">
          We share information only as described below. We do{" "}
          <strong>not sell</strong> personal information for money
          or other valuable consideration as those terms are
          defined under the CCPA/CPRA.
        </p>

        <h3 className="legal-h3">Service providers (sub-processors)</h3>
        <p className="legal-p">
          We work with carefully selected third-party providers
          who process information on our behalf and only on our
          instructions. Categories include:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            Cloud hosting and content delivery (e.g. AWS, Vercel)
            — <span className="legal-todo">TODO: confirm</span>
          </li>
          <li className="legal-li">
            Email and form delivery (e.g. transactional email
            providers) —{" "}
            <span className="legal-todo">TODO: confirm</span>
          </li>
          <li className="legal-li">
            Analytics (e.g. Google Analytics) —{" "}
            <span className="legal-todo">TODO: confirm</span>
          </li>
          <li className="legal-li">
            Calendar and scheduling tools —{" "}
            <span className="legal-todo">TODO: confirm</span>
          </li>
          <li className="legal-li">
            CRM and lead-management tools —{" "}
            <span className="legal-todo">TODO: confirm</span>
          </li>
        </ul>
        <p className="legal-p">
          A current list of sub-processors is available on request
          at{" "}
          <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>

        <h3 className="legal-h3">Within the Cocoma group</h3>
        <p className="legal-p">
          We may share information among entities in the Cocoma
          corporate group for the purposes described in this
          notice.
        </p>

        <h3 className="legal-h3">Legal compliance and safety</h3>
        <p className="legal-p">
          We may disclose information when required by law, court
          order, or government request; or when we believe in good
          faith that disclosure is necessary to protect rights,
          safety, or property.
        </p>

        <h3 className="legal-h3">Business transfers</h3>
        <p className="legal-p">
          If we're involved in a merger, acquisition, or asset
          sale, your information may be transferred as part of
          that transaction. We'll notify you (and where required,
          obtain consent) before your information becomes subject
          to a different privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International transfers",
    body: (
      <>
        <p className="legal-p">
          Cocoma is headquartered in India. Some of our service
          providers operate from other countries — including the
          United States and the European Union. When we transfer
          personal data across borders, we rely on appropriate
          safeguards:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>EU/UK transfers</strong> — Standard Contractual
            Clauses ("SCCs") issued by the European Commission and
            the UK International Data Transfer Agreement / Addendum,
            supplemented by additional measures where needed.
          </li>
          <li className="legal-li">
            <strong>India inbound transfers</strong> — handled in
            line with the DPDP Act 2023 and any subsequent
            government-notified transfer rules.
          </li>
          <li className="legal-li">
            <strong>Other regions</strong> — equivalent contractual
            protections where applicable.
          </li>
        </ul>
        <p className="legal-p">
          For a copy of the safeguards we rely on, write to{" "}
          <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep your information",
    body: (
      <>
        <p className="legal-p">
          We keep personal information only as long as we need it
          for the purposes listed above, or as long as the law
          requires. In practice:
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Inquiry data</strong> — kept while we evaluate
            and respond to your inquiry.
          </li>
          <li className="legal-li">
            <strong>Client engagement data</strong> — kept for the
            duration of our engagement and up to{" "}
            <strong>30 days after the contract ends</strong>,
            after which it is deleted or anonymised, unless
            longer retention is required by law (for example, tax
            or accounting records).
          </li>
          <li className="legal-li">
            <strong>Marketing data</strong> — kept until you
            unsubscribe or otherwise withdraw consent.
          </li>
          <li className="legal-li">
            <strong>Job applications</strong> — kept for the
            duration of the recruitment process and a reasonable
            period afterwards in case of a future opening, unless
            you ask us to delete sooner.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p className="legal-p">
          Depending on where you live, you have some or all of the
          following rights over your information. To exercise any
          of them, write to{" "}
          <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>{" "}
          and we'll respond within the time frame your local law
          requires (typically 30 days).
        </p>
        <ul className="legal-ul">
          <li className="legal-li">
            <strong>Access</strong> — get a copy of the information
            we hold about you.
          </li>
          <li className="legal-li">
            <strong>Correction</strong> — fix information that is
            inaccurate or incomplete.
          </li>
          <li className="legal-li">
            <strong>Deletion / erasure</strong> — ask us to delete
            information we no longer need to keep.
          </li>
          <li className="legal-li">
            <strong>Object or restrict processing</strong> — limit
            how we use your information in specific circumstances.
          </li>
          <li className="legal-li">
            <strong>Portability</strong> — get your information in
            a structured, machine-readable format.
          </li>
          <li className="legal-li">
            <strong>Withdraw consent</strong> — at any time, where
            our processing relies on consent.
          </li>
          <li className="legal-li">
            <strong>Lodge a complaint</strong> — with your local
            data-protection authority (see the region-specific
            notices below).
          </li>
        </ul>
        <p className="legal-p">
          We never charge a fee for an ordinary rights request,
          and we never penalise you for making one.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p className="legal-p">
        We use industry-standard technical and organisational
        measures to protect personal information against loss,
        misuse, and unauthorised access — including encryption in
        transit, access controls, vendor due diligence, and
        regular review of our practices. No system is 100%
        secure; if we ever discover a breach affecting your
        information, we'll notify you and the relevant
        authorities in line with applicable law.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children's privacy",
    body: (
      <p className="legal-p">
        The Site is not directed at children. We do not knowingly
        collect personal information from anyone under 13 (under
        US COPPA), under 16 (in many EU member states), or under
        18 (under the Indian DPDP Act). If you believe a child
        has submitted information to us, write to{" "}
        <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
          {PRIVACY_EMAIL}
        </a>{" "}
        and we'll delete it.
      </p>
    ),
  },
  {
    id: "region-specific",
    title: "Region-specific notices",
    body: (
      <>
        <p className="legal-p">
          The following notices supplement the rights described
          above for users in specific jurisdictions. Where a
          region grants stronger rights than those described
          earlier, the regional notice prevails for users in that
          region.
        </p>

        <div className="legal-region">
          <span className="legal-region-label">EU / UK</span>
          <h4 className="legal-region-title">GDPR &amp; UK GDPR</h4>
          <p className="legal-p">
            <strong>Controller:</strong> {COMPANY_NAME}, contact{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
          <p className="legal-p">
            You have all the rights listed above plus the right to
            lodge a complaint with your local supervisory
            authority. In the UK, that's the Information
            Commissioner's Office (
            <a
              className="legal-a"
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
            >
              ico.org.uk
            </a>
            ). In the EU, your country's data-protection authority
            (full list at{" "}
            <a
              className="legal-a"
              href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
              target="_blank"
              rel="noopener noreferrer"
            >
              edpb.europa.eu
            </a>
            ).
          </p>
          <p className="legal-p">
            We don't currently use automated decision-making that
            produces legal or similarly significant effects on
            you.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">California</span>
          <h4 className="legal-region-title">CCPA &amp; CPRA</h4>
          <p className="legal-p">
            We've collected the categories of personal information
            described under{" "}
            <a className="legal-a" href="#what-we-collect">
              Information we collect
            </a>
            . We use it for the business purposes listed under{" "}
            <a className="legal-a" href="#why-we-collect">
              Why we use your information
            </a>
            . We share it with the categories of recipients listed
            under{" "}
            <a className="legal-a" href="#how-we-share">
              How we share information
            </a>
            .
          </p>
          <p className="legal-p">
            California residents have the right to know, delete,
            correct, opt-out of "sale" or "sharing" (for
            cross-context behavioural advertising), limit the use
            of sensitive personal information, and not be
            discriminated against for exercising any of those
            rights.{" "}
            <strong>
              We do not sell or share personal information for
              cross-context behavioural advertising.
            </strong>
          </p>
          <p className="legal-p">
            To exercise any right, write to{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>{" "}
            with "California request" in the subject. You may
            authorise an agent to make a request on your behalf.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">India</span>
          <h4 className="legal-region-title">DPDP Act 2023</h4>
          <p className="legal-p">
            For Data Principals in India: this notice serves as
            our notice under Section 5 of the DPDP Act 2023. The
            personal data we collect, the purposes, and the manner
            of exercising rights are described above.
          </p>
          <p className="legal-p">
            <strong>Grievance Officer / Contact:</strong>{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            . You may also approach the Data Protection Board of
            India once it has been constituted under the Act.
          </p>
          <p className="legal-p">
            You may withdraw consent at any time, request access
            and correction, ask us to erase your data, or
            nominate someone to exercise these rights on your
            behalf in the event of your death or incapacity.
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Australia</span>
          <h4 className="legal-region-title">
            Privacy Act 1988 &amp; Australian Privacy Principles
          </h4>
          <p className="legal-p">
            We handle personal information in line with the
            Australian Privacy Principles (APPs). You may request
            access and correction at any time via{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            . If you're not satisfied with how we've handled a
            complaint, you may escalate to the Office of the
            Australian Information Commissioner (
            <a
              className="legal-a"
              href="https://www.oaic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
            >
              oaic.gov.au
            </a>
            ).
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Singapore</span>
          <h4 className="legal-region-title">PDPA</h4>
          <p className="legal-p">
            We process personal data in line with Singapore's
            Personal Data Protection Act. You may request access
            and correction via{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            . Complaints may also be raised with the Personal Data
            Protection Commission (
            <a
              className="legal-a"
              href="https://www.pdpc.gov.sg"
              target="_blank"
              rel="noopener noreferrer"
            >
              pdpc.gov.sg
            </a>
            ).
          </p>
        </div>

        <div className="legal-region">
          <span className="legal-region-label">Japan</span>
          <h4 className="legal-region-title">APPI</h4>
          <p className="legal-p">
            For users in Japan, we comply with the Act on the
            Protection of Personal Information (APPI). The
            purposes for which we use your information are
            described above. You may request disclosure,
            correction, or suspension of use via{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            . You may also contact the Personal Information
            Protection Commission (
            <a
              className="legal-a"
              href="https://www.ppc.go.jp/en/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ppc.go.jp/en
            </a>
            ).
          </p>
        </div>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates to this notice",
    body: (
      <p className="legal-p">
        We may update this Privacy Policy from time to time to
        reflect changes in our practices, our services, or
        applicable law. The "Last updated" date at the top of the
        page tells you when the most recent revision took effect.
        For material changes, we'll give you reasonable notice
        before the change takes effect — typically by email or
        through a banner on the Site.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <>
        <p className="legal-p">
          For any privacy-related question, request, or complaint,
          please write to:
        </p>
        <p className="legal-p">
          <strong>{COMPANY_NAME}</strong>
          <br />
          {COMPANY_ADDRESS}
          <br />
          Email:{" "}
          <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
        </p>
        <p className="legal-p">
          We'll acknowledge your request within a reasonable time
          and respond within the period your local law requires.
        </p>
      </>
    ),
  },
];

const PrivacyPolicy = () => {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <p>
            Plain-English summary: We collect what you give us
            when you fill out a form or book a meeting, plus a
            small amount of analytics to keep the Site working
            and improving. We don't sell your data. We keep it
            only as long as we need it. You have rights — and
            this page spells them out, region by region.
          </p>
          <p>
            For anything you'd rather just ask in plain English,
            email{" "}
            <a className="legal-a" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </>
      }
      sections={sections}
      otherDocs={[
        { path: "/terms", label: "Terms of Service" },
        { path: "/cookie-policy", label: "Cookie Policy" },
      ]}
    />
  );
};

export default PrivacyPolicy;
