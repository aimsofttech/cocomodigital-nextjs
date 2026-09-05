"use client";

/**
 * /caspian — the media library.
 *
 * Find things, decide on them, and add to them.
 *
 * Adding is behind media:create and is genuinely live locally, because
 * ingest now writes through a storage driver rather than straight at S3 —
 * so a drop on a developer's machine lands on that machine's disk and can
 * never reach the production bucket.
 *
 * That is still not the same as being safe to open to the studio. The S3
 * objects carry public-read (defect D4), so anything uploaded against the
 * real bucket is world-readable by URL. The caspian/ prefix has to go
 * private before this tab is put in front of anyone.
 *
 * Signed in with the SAME token as /admin — key `cocoma_token`. Anyone
 * already in the panel is already in here, which is the whole reason this
 * lives on cocomadigital.com rather than on its own subdomain.
 *
 * The gate below is a courtesy, not a control. It decides what to draw;
 * the API decides what may be read, and it decides it again on every
 * request whatever this component believes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Upload from "./Upload";
import Detail from "./Detail";
import Describe from "./Describe";
import { justify, familyOf, ratioOf } from "./justify";
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

  /* Video plays in place, with controls and metadata-only preload.
   *
   * No autoplay: a grid of forty tiles all deciding to play at once is
   * both unusable and, on a phone plan, expensive. `preload="metadata"`
   * fetches the header — enough for a duration and a first frame — and
   * the rest only when someone presses play. S3 answers range requests
   * (206), so scrubbing works without downloading the whole file. */
  if (asset.kind === "video" && asset.url && !failed) {
    return (
      <video
        className={styles.thumbImg}
        src={asset.url}
        controls
        preload="metadata"
        playsInline
        onError={() => setFailed(true)}
      />
    );
  }

  if (asset.kind === "video" || failed || !asset.url) {
    return (
      <div className={styles.thumbFallback}>
        <span>{asset.kind === "video" ? "video unavailable" : "no preview"}</span>
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={check}
      className={styles.thumbImg}
      /* The small copy when one exists. A tile is 216px wide and the
         original can be 12 MB; sixty of those is the difference between a
         grid that opens and one that crawls. Falls back to the original,
         which is always correct and sometimes slow. */
      src={asset.thumbUrl || asset.url}
      /* Empty alt, not the caption: the caption is already printed under
       * the tile, so announcing it again is duplication, and a thumbnail
       * beside its own description is decorative. */
      alt=""
      /* Lazy ONLY when falling back to the original. It was a mitigation
       * for pulling full-size photographs into a grid, and a rendition is
       * about 5 KB — sixty of those is a third of a megabyte, less than
       * the cost of the deferral. It also does not reliably trigger in
       * every renderer, which turns a working grid into an empty one. */
      loading={asset.thumbUrl ? "eager" : "lazy"}
      decoding="async"
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
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [openId, setOpenId] = useState<string | null>(null);
  /* Row height, not column count — the only knob a justified layout takes. */
  const [rowH, setRowH] = useState(220);
  const [containerW, setContainerW] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  /* A callback ref, not a mount effect.
   *
   * This component early-returns while the session resolves, and again if
   * the user cannot view media — so the grid element does not exist on
   * first render. A useEffect with [] deps runs once against a null ref,
   * gives up, and never runs again: the grid measures 0 forever and lays
   * out no rows. A callback ref fires whenever the node actually appears.
   *
   * Measured on the CONTAINER rather than the window, because opening the
   * detail overlay adds a scrollbar and keying off window width would
   * reflow every row behind it. */
  const gridRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    setContainerW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerW(w);
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  useEffect(() => () => roRef.current?.disconnect(), []);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("caspian.rowH"));
      if (saved >= 120 && saved <= 340) setRowH(saved);
    } catch { /* private window, or storage blocked — the default is fine */ }
  }, []);
  const setDensity = (h: number) => {
    setRowH(h);
    try { window.localStorage.setItem("caspian.rowH", String(h)); } catch { /* ignore */ }
  };

  const mayView = can("media", "view");
  const mayDecide = can("media", "update");
  const mayAdd = can("media", "create");

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
        /* confirm: [] on purpose.
         *
         * The server defaults an absent `confirm` to all five governance
         * fields and stamps each setBy 'human'. From a grid tile the
         * reviewer can see a thumbnail and a caption — not the rights, not
         * the consent — so claiming they personally decided those would put
         * a person's name on a judgement they never made, and setBy is only
         * worth anything if it is never wrong.
         *
         * So a tile approval records the verdict and nothing else. Putting
         * your name to specific fields happens in the detail view, where
         * those fields are actually on screen. */
        await approveAsset(asset.id, { confirm: [] });
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

  const rows = useMemo(
    () => (containerW > 0 ? justify(assets, containerW, rowH, 6) : []),
    [assets, containerW, rowH],
  );

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

      {mayAdd && (
        <div className={styles.tabs} role="tablist">
          {(["library", "upload"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`${styles.tab} ${tab === t ? styles.tabOn : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "library" ? "Library" : "Add files"}
            </button>
          ))}
        </div>
      )}

      {tab === "upload" && mayAdd && (
        <Upload
          onDone={() => {
            /* Bump the same nonce the library reads, so a finished drop
               shows up behind the tab rather than after a manual refresh. */
            setNonce((n) => n + 1);
          }}
        />
      )}

      {tab === "library" && (
      <>
      {mayDecide && <Describe onDone={() => setNonce((n) => n + 1)} />}
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
          <div className={styles.density} role="group" aria-label="Tile size">
            {[[300, "Large"], [220, "Medium"], [150, "Small"]].map(([h, label]) => (
              <button
                key={String(h)}
                className={`${styles.densityBtn} ${rowH === h ? styles.densityOn : ""}`}
                onClick={() => setDensity(h as number)}
              >
                {label}
              </button>
            ))}
          </div>
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

      <div className={styles.grid} ref={gridRef}>
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={styles.row}
            style={{
              height: `${row.height}px`,
              /* The height is already known, so the browser can skip layout
                 and paint for rows below the fold without guessing. */
              contentVisibility: ri > 5 ? "auto" : undefined,
              containIntrinsicSize: ri > 5 ? `auto ${row.height}px` : undefined,
            } as React.CSSProperties}
          >
            {row.items.map(({ item: a, width, height }) => {
              const state = a.review?.state || "proposed";
              const blocked = a.clearance?.level === "blocked";
              return (
                <article
                  key={a.id}
                  className={`${styles.tile} ${blocked ? styles.tileBlocked : ""}`}
                  data-family={familyOf(a)}
                  style={{ width: `${width}px`, height: `${height}px` }}
                  role="button"
                  tabIndex={0}
                  aria-label={a.caption || `${a.kind} asset`}
                  onClick={() => setOpenId(a.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpenId(a.id); }}
                >
                  <Thumb asset={a} />

                  {/* At rest, only BLOCKED gets ink.
                      "Restricted" is the majority of this library, not the
                      exception — most rows have rights: unknown — so a
                      marker on those would fire on nearly every tile and be
                      ignored within a day. It appears on hover instead. */}
                  {blocked && <span className={styles.lock} aria-hidden="true">🔒</span>}

                  <div className={styles.veil}>
                    <p className={styles.veilCaption}>
                      {a.caption || <em>Not described yet</em>}
                    </p>
                    <p className={styles.veilFacts}>
                      {a.clearance?.level !== "clear" && (
                        <span className={blocked ? styles.veilBad : styles.veilWarn}>
                          {blocked ? "do not take" : "internal only"}
                        </span>
                      )}
                      <span>{state}</span>
                      {a.namedPeople > 0 && <span>{a.namedPeople} named</span>}
                      {a.kind === "video" && <span>video</span>}
                    </p>
                    <div className={styles.veilActions} onClick={(e) => e.stopPropagation()}>
                      {!blocked && (
                        <button
                          className={styles.veilBtn}
                          onClick={() => navigator.clipboard?.writeText(a.url)}
                        >
                          Copy link
                        </button>
                      )}
                      {mayDecide && state !== "approved" && (
                        <button className={styles.veilBtn} disabled={acting === a.id}
                          onClick={() => decide(a, "approve")}>Approve</button>
                      )}
                      {mayDecide && state !== "rejected" && (
                        <button className={styles.veilBtn} disabled={acting === a.id}
                          onClick={() => decide(a, "reject")}>Reject</button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
      </>
      )}

      {openId && (() => {
        const i = assets.findIndex((x) => x.id === openId);
        if (i === -1) return null;
        return (
          <Detail
            seed={assets[i]}
            mayDecide={mayDecide}
            onClose={() => setOpenId(null)}
            onChanged={() => setNonce((n) => n + 1)}
            /* Wraps at both ends. Running off the end of a filtered set and
               getting nothing is a dead end; coming back round is at worst
               a repeat, and it keeps one key doing one predictable thing. */
            onStep={(dir) => {
              const next = (i + dir + assets.length) % assets.length;
              setOpenId(assets[next].id);
            }}
          />
        );
      })()}
    </div>
  );
}
