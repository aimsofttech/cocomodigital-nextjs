"use client";

/**
 * One asset, in full.
 *
 * An overlay over the grid rather than its own page, for three reasons
 * that are all about the person using it:
 *
 *   - The grid already holds the asset it was opened from, so the frame
 *     paints immediately and the full record reconciles when it lands.
 *     No spinner on the common path.
 *   - Left and right step through the current result set. For "which of
 *     these six is the one" that is worth more than everything else on
 *     this screen combined, and it only exists because the surrounding
 *     list is still in memory.
 *   - Closing returns you to your scroll position and your filters,
 *     which a route change would throw away.
 *
 * WHAT THIS SCREEN IS FOR
 *
 * Two audiences, one screen, and the split is by permission rather than
 * by mode: an editor came to decide "is this the one" and take it; a
 * reviewer came to put their name to something. The editor's half is on
 * top because it is the majority of visits by a wide margin.
 *
 * The governance shown to the editor is deliberately narrow — a clearance
 * strip and nothing else. The setBy map, the review note and the describe
 * provenance are a reviewer's concern and appear only for someone holding
 * media:update.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAsset,
  patchAsset,
  approveAsset,
  rejectAsset,
  fileLocation,
  CONFIRMABLE,
  CaspianError,
  type CaspianAsset,
  type CaspianAssetDetail,
  type FaceBox,
} from "@/src/lib/caspian";
import People, { FaceBoxes } from "./People";
import styles from "./Caspian.module.css";

const RIGHTS = ["own", "client-ip", "stock", "unknown"];
const CONSENT = ["released", "staff", "not-required", "unknown", "minors", "refused"];

const FIELD_LABEL: Record<string, string> = {
  rights: "Whose is it",
  consent: "Who is in it",
  sensitive: "Sensitive",
  usable: "Fit to publish",
  people: "People in frame",
};

const fmtBytes = (n: number) => {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Who decided a field — three states, not two.
 *
 * A field absent from the setBy map has been decided by nobody, and that
 * is a different thing from "a model proposed it". Collapsing the two is
 * how "rights: unknown, never looked at" comes to read the same as
 * "rights: unknown, and someone checked".
 */
function Decider({ by, name }: { by?: "human" | "model"; name: string }) {
  if (by === "human") {
    return <span className={`${styles.decider} ${styles.deciderHuman}`}>a person decided this</span>;
  }
  if (by === "model") {
    return <span className={`${styles.decider} ${styles.deciderModel}`}>the model proposed this</span>;
  }
  return (
    <span className={styles.decider} title={`Nothing has been recorded for ${name}`}>
      nobody has decided this
    </span>
  );
}

export default function Detail({
  seed, onClose, onChanged, onStep, mayDecide,
}: {
  seed: CaspianAsset;
  onClose: () => void;
  onChanged: () => void;
  onStep: (dir: -1 | 1) => void;
  mayDecide: boolean;
}) {
  const [asset, setAsset] = useState<CaspianAssetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [pendingBox, setPendingBox] = useState<FaceBox | null>(null);

  /* Reset every time the asset changes — a half-typed caption or a ticked
     confirmation must never follow you onto the next asset. */
  useEffect(() => {
    setAsset(null);
    setDraft({});
    setConfirm([]);
    setError(null);
    getAsset(seed.id)
      .then(setAsset)
      .catch((e) => setError(e instanceof CaspianError ? e.message : "Could not load that asset."));
  }, [seed.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      /* Arrow keys belong to the field while someone is typing in one. */
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        if (e.key === "Escape") (t as HTMLInputElement).blur();
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  const a = asset || (seed as Partial<CaspianAssetDetail> as CaspianAssetDetail);
  const clearance = a.clearance || { level: "clear", reasons: [] };
  const dirty = Object.keys(draft).length > 0;

  const value = (k: string) => (
    k in draft ? draft[k] : (a as unknown as Record<string, unknown>)[k]
  );
  const set = (k: string, v: unknown) => {
    setDraft((d) => ({ ...d, [k]: v }));
    /* Changing a governance field IS deciding it, so tick its confirmation
       rather than making the person say the same thing twice. */
    if ((CONFIRMABLE as readonly string[]).includes(k)) {
      setConfirm((c) => (c.includes(k) ? c : [...c, k]));
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      const fresh = await getAsset(seed.id);
      setAsset(fresh);
      setDraft({});
      setConfirm([]);
      onChanged();
    } catch (e) {
      setError(e instanceof CaspianError ? e.message : "That did not go through.");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setError(null);
    try {
      const { url } = await fileLocation(seed.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof CaspianError ? e.message : "Could not fetch that file.");
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Asset detail">
      <div className={styles.sheet}>
        <button className={styles.closeX} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.frame}>
          {/* Inside the frame, not the sheet. Anchored to the sheet they
              sit at its vertical centre — which on a narrow viewport, where
              the layout stacks, is the middle of the text panel, so the
              chevrons land on top of the clearance warning. */}
          <button className={`${styles.step} ${styles.stepPrev}`} onClick={() => onStep(-1)} aria-label="Previous">‹</button>
          <button className={`${styles.step} ${styles.stepNext}`} onClick={() => onStep(1)} aria-label="Next">›</button>
          {a.kind === "video" && a.url ? (
            <video className={styles.frameMedia} src={a.url} poster={a.posterUrl || undefined} controls preload="metadata" playsInline />
          ) : a.url ? (
            <div className={styles.framed}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.frameMedia} src={a.url} alt={a.altText || ""} />
              <FaceBoxes
                tagged={a.taggedPeople || []}
                drawing={drawing}
                onDrawn={(box) => { setPendingBox(box); setDrawing(false); }}
              />
            </div>
          ) : (
            <div className={styles.thumbFallback}><span>no preview</span></div>
          )}
          <p className={styles.tech}>
            {[a.width && a.height ? `${a.width} × ${a.height}` : "", (a.mimetype || "").split("/")[1]?.toUpperCase(),
              fmtBytes(a.bytes), a.duration ? `${Math.round(a.duration)}s` : ""].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className={styles.panel} ref={panelRef}>
          {/* Clearance first, and only when there is something to say. A
              green tick on the 90% that are fine trains people to ignore
              the strip on the 10% that are not. */}
          {clearance.level !== "clear" && (
            <div className={clearance.level === "blocked" ? styles.blocked : styles.restricted}>
              <strong>{clearance.level === "blocked" ? "Do not take this out of the building" : "Not for a public Cocoma page"}</strong>
              <ul>{clearance.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}

          {clearance.level === "blocked" ? (
            <p className={styles.muted}>
              There is no download for this one. If you believe that is wrong, the fix is
              to correct the record rather than to work around it.
            </p>
          ) : (
            <button className={styles.primary} onClick={download} disabled={busy}>
              {clearance.level === "restricted" ? "Download — internal use" : "Download"}
            </button>
          )}

          <div className={styles.actions}>
            <button className={styles.ghostSm} onClick={() => navigator.clipboard?.writeText(a.url)}>Copy link</button>
            {a.originalName && <span className={styles.muted}>{a.originalName}</span>}
          </div>

          <h2 className={styles.detailCaption}>
            {a.caption || <em className={styles.muted}>Not described yet</em>}
          </h2>
          {a.tags?.length > 0 && <p className={styles.tags}>{a.tags.join(" · ")}</p>}

          <dl className={styles.facts2}>
            {a.job && (
              <>
                <dt>Project</dt>
                <dd>{a.job.name}{a.job.client ? ` — ${a.job.client}` : ""}{a.job.nda ? " (NDA)" : ""}</dd>
              </>
            )}
            <dt>Added</dt><dd>{fmtDate(a.createdAt)}</dd>
            {a.assetType && a.assetType !== "unknown" && (<><dt>Kind</dt><dd>{a.assetType}</dd></>)}
            {a.namedPeople > 0 && (<><dt>Named</dt><dd>{a.namedPeople} in this frame</dd></>)}
            {a.describedBy && (
              <>
                <dt>Described</dt>
                <dd>
                  {a.describedBy.copiedFromChecksum
                    ? "copied from an identical file already described"
                    : `${a.describedBy.provider} · ${a.describedBy.model}`}
                </dd>
              </>
            )}
          </dl>

          {a.reviewNote && (
            <div className={styles.rejectNote}>
              <strong>Rejected</strong>
              <p>{a.reviewNote}</p>
              {a.review?.byName && <span className={styles.muted}>{a.review.byName} · {fmtDate(a.review.at)}</span>}
            </div>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          {asset && (
            <>
              <div className={styles.actions}>
                <button
                  className={drawing ? styles.primary : styles.ghostSm}
                  onClick={() => { setDrawing((d) => !d); setPendingBox(null); }}
                >
                  {drawing ? "Drag a box around their face — click to cancel" : "Mark a face"}
                </button>
                {pendingBox && <span className={styles.muted}>box ready — pick who it is</span>}
              </div>
              <People
                assetId={seed.id}
                folder={a.folder || ""}
                jobId={a.job?.id || null}
                tagged={a.taggedPeople || []}
                pendingBox={pendingBox}
                onBoxUsed={() => setPendingBox(null)}
                onChanged={() => {
                  getAsset(seed.id).then(setAsset).catch(() => {});
                  onChanged();
                }}
              />
            </>
          )}

          {/* ── reviewer half ─────────────────────────────────────────── */}
          {mayDecide && asset && (
            <section className={styles.reviewBlock}>
              <h3 className={styles.askTitle}>The record</h3>
              <p className={styles.askWhy}>
                Changing any of these marks it decided by you, and the describer
                will never overwrite it again.
              </p>

              <label className={styles.fieldRow}>
                <span>{FIELD_LABEL.rights}</span>
                <select className={styles.select} value={String(value("rights") ?? "")} onChange={(e) => set("rights", e.target.value)}>
                  {RIGHTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Decider by={a.setBy?.rights} name="rights" />
              </label>

              <label className={styles.fieldRow}>
                <span>{FIELD_LABEL.consent}</span>
                <select className={styles.select} value={String(value("consent") ?? "")} onChange={(e) => set("consent", e.target.value)}>
                  {CONSENT.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Decider by={a.setBy?.consent} name="consent" />
              </label>

              <label className={styles.fieldRow}>
                <span>{FIELD_LABEL.usable}</span>
                <input type="checkbox" checked={Boolean(value("usable"))} onChange={(e) => set("usable", e.target.checked)} />
                <Decider by={a.setBy?.usable} name="usable" />
              </label>

              <label className={styles.fieldRow}>
                <span>{FIELD_LABEL.sensitive}</span>
                <input type="checkbox" checked={Boolean(value("sensitive"))} onChange={(e) => set("sensitive", e.target.checked)} />
                <Decider by={a.setBy?.sensitive} name="sensitive" />
              </label>

              {a.blockers?.length > 0 && (
                <div className={styles.restricted}>
                  <strong>Cannot be approved as it stands</strong>
                  <ul>{a.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.ghostSm}
                  disabled={!dirty || busy}
                  onClick={() => run(() => patchAsset(seed.id, draft))}
                >
                  {dirty ? `Save ${Object.keys(draft).length} change${Object.keys(draft).length === 1 ? "" : "s"}` : "Save"}
                </button>
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => run(() => approveAsset(seed.id, { confirm, corrections: draft }))}
                >
                  {confirm.length
                    ? `Approve, standing behind ${confirm.length}`
                    : "Approve"}
                </button>
                <button
                  className={styles.ghostSm}
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt("Why? The person who uploaded it sees this.");
                    if (reason && reason.trim().length >= 3) run(() => rejectAsset(seed.id, reason.trim()));
                  }}
                >
                  Reject
                </button>
              </div>
              {confirm.length > 0 && (
                <p className={styles.note}>
                  You are recording that you personally decided{" "}
                  {confirm.map((c) => FIELD_LABEL[c] || c).join(", ").toLowerCase()}.
                  Approving without touching a field claims nothing about it.
                </p>
              )}
            </section>
          )}

          <p className={styles.keys}>← → move · Esc close</p>
        </div>
      </div>
    </div>
  );
}
