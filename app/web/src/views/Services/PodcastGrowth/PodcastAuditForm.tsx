"use client";

import { useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import type { PodcastAuditFormCopy } from "@/src/lib/podcast";

/**
 * Free-podcast-audit capture. Three fields only — name, email, show link.
 *
 * Posts to the same public `contact-leads` endpoint the contact page
 * uses (anonymous create is enabled on that collection, and its
 * notifyLead hook sends the email). The show link is folded into the
 * message body behind a `[Type: ...]` tag, matching the convention
 * already used by ContactUs so podcast-audit leads are filterable in
 * the admin without a schema change.
 *
 * Every label, placeholder and message comes from the API so the copy is
 * editable in the admin panel; the endpoint and the field names are not,
 * because they are a contract with the leads collection rather than content.
 */
export default function PodcastAuditForm({
  copy,
}: {
  copy: PodcastAuditFormCopy;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showLink, setShowLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/content-api/contact-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: "",
          message: `[Type: ${copy.leadTag}]\n\nShow link: ${showLink.trim()}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const firstErr =
          Array.isArray(body?.errors) && body.errors[0]?.message;
        throw new Error(firstErr || body?.message || `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || copy.errorFallback);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="pod-audit-done" role="status">
        <p className="pod-audit-done-title">{copy.doneTitle}</p>
        <p className="pod-audit-done-body">
          {copy.doneBody}{" "}
          <a href={`mailto:${copy.contactEmail}`}>{copy.contactEmail}</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="pod-audit-form" onSubmit={handleSubmit} noValidate={false}>
      <div className="pod-audit-field">
        <label htmlFor="pod-audit-name">{copy.nameLabel}</label>
        <input
          id="pod-audit-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.namePlaceholder}
        />
      </div>
      <div className="pod-audit-field">
        <label htmlFor="pod-audit-email">{copy.emailLabel}</label>
        <input
          id="pod-audit-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
        />
      </div>
      <div className="pod-audit-field">
        <label htmlFor="pod-audit-show">{copy.showLabel}</label>
        <input
          id="pod-audit-show"
          name="showLink"
          type="url"
          required
          value={showLink}
          onChange={(e) => setShowLink(e.target.value)}
          placeholder={copy.showPlaceholder}
        />
      </div>

      {error && (
        <p className="pod-audit-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="pod-cta pod-cta--primary pod-audit-submit"
        disabled={submitting}
      >
        {submitting ? copy.submittingLabel : copy.submitLabel}
        <FaArrowRight aria-hidden="true" />
      </button>
      <p className="pod-audit-note">{copy.note}</p>
    </form>
  );
}
