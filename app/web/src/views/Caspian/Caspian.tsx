"use client";

/**
 * /caspian — the media library.
 *
 * Phase 1: find things, and decide on them. No uploading yet, because the
 * bytes are still world-readable (the S3 objects carry public-read) and
 * adding to a library you cannot yet protect is the wrong order.
 *
 * Signed in with the SAME token as /admin — key `cocoma_token`. Anyone
 * already in the panel is already in here, which is the whole reason this
 * lives on cocomadigital.com rather than on its own subdomain.
 *
 * The gate below is a courtesy, not a control. It decides what to draw;
 * the API decides what may be read, and it decides it again on every
 * request whatever this component believes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminLogin,
  storeAdminToken,
  clearAdminToken,
  useAdminSession,
} from "@/src/lib/adminSession";
import {
  listAssets,
  listSearches,
  approveAsset,
  rejectAsset,
  CaspianError,
  type CaspianAsset,
  type SavedSearch,
} from "@/src/lib/caspian";
import styles from "./Caspian.module.css";

const RIGHTS_LABEL: Record<string, string> = {
  own: "Ours",
  "client-ip": "Client IP",
  stock: "Stock",
  unknown: "Rights unknown",
};

/* Review state drives a colour because it is the one thing a reviewer
   scans for. Rights gets a label but no colour — four categories of equal
   weight, none of them an alarm. */
const STATE_CLASS: Record<string, string> = {
  approved: styles.stateApproved,
  rejected: styles.stateRejected,
  proposed: styles.stateProposed,
};

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminLogin(email, password);
      if (!res?.token) throw new Error("That email and password did not match.");
      storeAdminToken(res.token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.gate}>
      <form className={styles.gateCard} onSubmit={submit}>
        <h1 className={styles.gateTitle}>Caspian</h1>
        <p className={styles.gateSub}>
          Cocoma&rsquo;s media library. Sign in with your admin panel account &mdash;
          it&rsquo;s the same one.
        </p>
        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email" value={email} autoComplete="username" required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className={styles.gateError} role="alert">{error}</p>}
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

/* Fixtures and un-migrated rows point at object keys that do not resolve,
   and a broken-image icon in a grid of forty reads as "the library is
   broken". A tile that says what it is holding is more honest and, for a
   video, is all we could show anyway until posters are generated. */
function Thumb({ asset }: { asset: CaspianAsset }) {
  const [failed, setFailed] = useState(false);

  /* onError alone is not enough. An image can finish failing before React
   * attaches the handler — from cache, or on a fast 404 — and that image
   * then sits there as a broken icon with its alt text spilling over the
   * card. Re-checking on mount catches the ones the event missed:
   * `complete` with a zero naturalWidth is a load that ended badly. */
  const check = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (asset.kind === "video" || failed || !asset.url) {
    return (
      <div className={styles.thumbFallback}>
        <span>{asset.kind === "video" ? "video" : "no preview"}</span>
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={check}
      className={styles.thumbImg}
      src={asset.url}
      /* Empty alt, not the caption: the caption is already printed under
       * the tile, so announcing it again is duplication, and a thumbnail
       * beside its own description is decorative. */
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function Caspian() {
  const { session, loading: sessionLoading, can } = useAdminSession();
  const [nonce, setNonce] = useState(0);

  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [assets, setAssets] = useState<CaspianAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [publishableOnly, setPublishableOnly] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const mayView = can("media", "view");
  const mayDecide = can("media", "update");

  const load = useCallback(async () => {
    if (!mayView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listAssets({
        q: q || undefined,
        search: search || undefined,
        reviewState: reviewState || undefined,
        publishable: publishableOnly ? "1" : undefined,
        limit: 60,
      });
      setAssets(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof CaspianError ? err.message : "Could not reach the library.");
      setAssets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [mayView, q, search, reviewState, publishableOnly]);

  useEffect(() => {
    if (!mayView) return;
    listSearches().then(setSearches).catch(() => setSearches([]));
  }, [mayView, nonce]);

  /* Debounced so typing does not fire a request per keystroke. */
  useEffect(() => {
    if (!mayView) return undefined;
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, mayView, q, nonce]);

  const decide = async (asset: CaspianAsset, verdict: "approve" | "reject") => {
    setActing(asset.id);
    setError(null);
    try {
      if (verdict === "approve") {
        await approveAsset(asset.id);
      } else {
        const reason = window.prompt(
          "Why is this being rejected? The uploader sees this.",
        );
        if (!reason || reason.trim().length < 3) {
          setActing(null);
          return;
        }
        await rejectAsset(asset.id, reason.trim());
      }
      setNonce((n) => n + 1);
    } catch (err) {
      /* The API refuses an approval it cannot stand behind — unknown
         rights, unknown or refused consent — and says exactly why. That
         message is the useful part; do not replace it with "failed". */
      setError(err instanceof CaspianError ? err.message : "That did not go through.");
    } finally {
      setActing(null);
    }
  };

  const activeSearch = useMemo(
    () => searches.find((s) => s.key === search),
    [searches, search],
  );

  if (sessionLoading) {
    return <div className={styles.gate}><p className={styles.muted}>Checking your session…</p></div>;
  }
  if (!session) {
    return <SignIn onDone={() => setNonce((n) => n + 1)} />;
  }
  if (!mayView) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateCard}>
          <h1 className={styles.gateTitle}>Caspian</h1>
          <p className={styles.gateSub}>
            You&rsquo;re signed in as <strong>{session.name || session.email}</strong>, but your
            role doesn&rsquo;t include the media library yet. Ask Anil to tick
            <em> Media Library &rarr; view</em> under Roles &amp; Permissions.
          </p>
          <button
            className={styles.ghost}
            onClick={() => { clearAdminToken(); setNonce((n) => n + 1); }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.name}>Caspian</span>
          <span className={styles.tag}>Cocoma media library</span>
        </div>
        <div className={styles.who}>
          <span className={styles.muted}>
            {session.name || session.email}
            {mayDecide ? " · reviewer" : " · read only"}
          </span>
          <button
            className={styles.ghost}
            onClick={() => { clearAdminToken(); setNonce((n) => n + 1); }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className={styles.controls}>
        <input
          className={styles.searchBox}
          type="search"
          placeholder="Search captions, tags, text in frame…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the library"
        />
        <div className={styles.toggles}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={publishableOnly}
              onChange={(e) => setPublishableOnly(e.target.checked)}
            />
            <span>Safe to post</span>
          </label>
          <select
            className={styles.select}
            value={reviewState}
            onChange={(e) => setReviewState(e.target.value)}
            aria-label="Review state"
          >
            <option value="">Any state</option>
            <option value="proposed">Waiting on a person</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className={styles.chips} role="group" aria-label="Saved searches">
        <button
          className={`${styles.chip} ${search === "" ? styles.chipOn : ""}`}
          onClick={() => setSearch("")}
        >
          Everything <span className={styles.chipCount}>{total}</span>
        </button>
        {searches.map((s) => (
          <button
            key={s.key}
            className={`${styles.chip} ${search === s.key ? styles.chipOn : ""} ${s.count === 0 ? styles.chipEmpty : ""}`}
            onClick={() => setSearch(search === s.key ? "" : s.key)}
            title={s.note}
          >
            {s.label} <span className={styles.chipCount}>{s.count}</span>
          </button>
        ))}
      </div>

      {activeSearch?.note && <p className={styles.note}>{activeSearch.note}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {loading && <p className={styles.muted}>Looking…</p>}

      {!loading && assets.length === 0 && (
        <p className={styles.muted}>
          Nothing matches that. {publishableOnly && "“Safe to post” is a narrow door — it wants approved, ours, not sensitive, and marked usable."}
        </p>
      )}

      <div className={styles.grid}>
        {assets.map((a) => {
          const state = a.review?.state || "proposed";
          return (
            <article key={a.id} className={styles.card}>
              <div className={styles.thumb}>
                <Thumb asset={a} />
                <span className={`${styles.state} ${STATE_CLASS[state] || ""}`}>{state}</span>
              </div>
              <div className={styles.meta}>
                <p className={styles.caption}>
                  {a.caption || <em className={styles.muted}>Not described yet</em>}
                </p>
                <p className={styles.facts}>
                  <span>{RIGHTS_LABEL[a.rights] || a.rights}</span>
                  {a.usable && <span className={styles.ok}>usable</span>}
                  {a.namedPeople > 0 && <span>{a.namedPeople} named</span>}
                  {a.describeStatus !== "done" && <span>{a.describeStatus}</span>}
                </p>
                {a.tags.length > 0 && (
                  <p className={styles.tags}>{a.tags.slice(0, 4).join(" · ")}</p>
                )}
                <div className={styles.actions}>
                  <button
                    className={styles.ghostSm}
                    onClick={() => navigator.clipboard?.writeText(a.url)}
                  >
                    Copy link
                  </button>
                  {mayDecide && state !== "approved" && (
                    <button
                      className={styles.ghostSm}
                      disabled={acting === a.id}
                      onClick={() => decide(a, "approve")}
                    >
                      Approve
                    </button>
                  )}
                  {mayDecide && state !== "rejected" && (
                    <button
                      className={styles.ghostSm}
                      disabled={acting === a.id}
                      onClick={() => decide(a, "reject")}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
