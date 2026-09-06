"use client";

/**
 * Naming people in a frame.
 *
 * THE DESIGN PROBLEM IS REPETITION, NOT PRECISION
 *
 * A shoot is two hundred frames of the same six people. Tagging each one
 * individually is work nobody does twice, so the tags stop after the first
 * folder and every search that depends on them returns nothing.
 *
 * So the order of operations here is deliberately backwards from what a
 * tagging UI usually does. Suggestions come first, as one-click rows,
 * because the answer is nearly always "the same people as the frame
 * before". Drawing a box is the rare, deliberate case and is one click
 * further away. And "also in the rest of this drop" is the loudest control
 * on the panel, because it is the one that turns an afternoon of tagging
 * into ten seconds.
 *
 * WHY NOTHING IS APPLIED AUTOMATICALLY
 *
 * A wrong name is not cosmetic. The API drops `usable` when the person
 * tagged has refused a release, so a bad auto-tag silently makes a good
 * asset unpublishable — and the reverse, a real refusal left unrecorded
 * because something already tagged somebody else, puts a person who said
 * no on a public page. Context is strong evidence, not proof, and the gap
 * between those is exactly where a person belongs.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listPeople,
  createPerson,
  tagPerson,
  untagPerson,
  suggestPeople,
  tagBatch,
  CaspianError,
  type CaspianPerson,
  type PersonSuggestion,
  type TaggedPerson,
  type FaceBox,
} from "@/src/lib/caspian";
import styles from "./Caspian.module.css";

export default function People({
  assetId, folder, jobId, tagged, pendingBox, onBoxUsed, onChanged,
}: {
  assetId: string;
  folder: string;
  jobId: string | null;
  tagged: TaggedPerson[];
  /* A box drawn on the frame but not yet attributed. It rides along with
     whichever name is chosen next, then clears — a box without a person
     is not a thing this system can store. */
  pendingBox: FaceBox | null;
  onBoxUsed: () => void;
  onChanged: () => void;
}) {
  const [people, setPeople] = useState<CaspianPerson[]>([]);
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listPeople().then(setPeople).catch(() => setPeople([]));
    suggestPeople(assetId).then(setSuggestions).catch(() => setSuggestions([]));
  }, [assetId]);

  useEffect(refresh, [refresh, tagged.length]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setError(null); setMsg(null);
    try {
      const r = (await fn()) as { message?: string; warnings?: string[] };
      const warn = r?.warnings?.length ? r.warnings.join(" ") : "";
      if (warn || r?.message) setMsg(warn || r.message || null);
      onChanged();
      refresh();
    } catch (e) {
      setError(e instanceof CaspianError ? e.message : "That did not go through.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={styles.peopleBlock}>
      <h3 className={styles.askTitle}>Who is in this</h3>

      {tagged.length > 0 && (
        <ul className={styles.tagList}>
          {tagged.map((t) => (
            <li key={t.tagId} className={styles.tagChip}>
              <span>{t.person?.name || "unknown"}</span>
              {t.box && <span className={styles.tagBoxed} title="has a marked position">▣</span>}
              <button
                className={styles.tagX}
                aria-label={`Remove ${t.person?.name}`}
                disabled={busy !== null || !t.person}
                onClick={() => t.person && run(`untag:${t.person.id}`, () => untagPerson(assetId, t.person!.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Suggestions first. This is the path that gets used. */}
      {suggestions.length > 0 && (
        <div className={styles.suggests}>
          <p className={styles.askWhy}>
            Worked out from who is in the frames around this one — not from looking
            at the picture. Check before you accept.
          </p>
          {suggestions.map((s) => (
            <div key={s.personId} className={styles.suggestRow}>
              <button
                className={styles.suggestAccept}
                disabled={busy !== null}
                onClick={() => run(`tag:${s.personId}`, () => tagPerson(assetId, { personId: s.personId, box: pendingBox }).then((r) => { onBoxUsed(); return r; }))}
              >
                + {s.name}
              </button>
              <span className={`${styles.conf} ${
                s.confidence === "likely" ? styles.confHigh : styles.confLow
              }`}>{s.confidence}</span>
              <span className={styles.suggestWhy}>{s.reasons[0]}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.toggles}>
        <select
          className={styles.select}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Someone else"
        >
          <option value="">Someone else…</option>
          {people
            .filter((p) => !tagged.some((t) => t.person?.id === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.release === "refused" ? " — refused a release" : ""}
              </option>
            ))}
        </select>
        <button
          className={styles.ghostSm}
          disabled={!pick || busy !== null}
          onClick={() => run("tag", () => tagPerson(assetId, { personId: pick, box: pendingBox }).then((r) => { setPick(""); onBoxUsed(); return r; }))}
        >
          Add
        </button>
      </div>

      <div className={styles.toggles}>
        <input
          className={styles.searchBox}
          placeholder="Not in the directory? Add a name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className={styles.ghostSm}
          disabled={!newName.trim() || busy !== null}
          onClick={() => run("create", async () => {
            const p = await createPerson(newName.trim());
            setNewName("");
            const r = await tagPerson(assetId, { personId: p.id, box: pendingBox });
            onBoxUsed();
            return r;
          })}
        >
          Add &amp; tag
        </button>
      </div>

      {/* The control that makes tagging worth doing at all. */}
      {tagged.length > 0 && (folder || jobId) && (
        <div className={styles.batchBox}>
          <p className={styles.askWhy}>
            Same people through the rest of the shoot? Name them everywhere at once
            instead of frame by frame.
          </p>
          {tagged.filter((t) => t.person).map((t) => (
            <button
              key={t.tagId}
              className={styles.ghostSm}
              disabled={busy !== null}
              onClick={() => run(`batch:${t.person!.id}`, () =>
                tagBatch(t.person!.id, folder ? { folder } : { job: jobId! }))}
            >
              {busy === `batch:${t.person!.id}` ? "Naming…" : `${t.person!.name} — everywhere in this ${folder ? "drop" : "project"}`}
            </button>
          ))}
        </div>
      )}

      {msg && <p className={styles.restricted}>{msg}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}

/**
 * The boxes drawn over the frame.
 *
 * Coordinates are 0-1 fractions, never pixels — the same photograph is
 * shown at a dozen sizes and a pixel box is right at exactly one of them.
 * Click-drag to draw; there is no face detection here and there is not
 * going to be one on this stack, so the box is placed by the person who
 * knows who it is.
 */
export function FaceBoxes({
  tagged, drawing, onDrawn,
}: {
  tagged: TaggedPerson[];
  drawing: boolean;
  onDrawn: (box: FaceBox) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState<FaceBox | null>(null);

  const frac = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
    };
  };

  return (
    <div
      ref={ref}
      className={`${styles.boxLayer} ${drawing ? styles.boxLayerDraw : ""}`}
      onMouseDown={(e) => { if (drawing) { setStart(frac(e)); setLive(null); } }}
      onMouseMove={(e) => {
        if (!drawing || !start) return;
        const p = frac(e);
        setLive({
          x: Math.min(start.x, p.x), y: Math.min(start.y, p.y),
          w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y),
        });
      }}
      onMouseUp={() => {
        /* A stray click is a zero-area box, which the API rejects with a
           message about w and h — correct, and a confusing thing to show
           somebody who just missed. Swallow it instead. */
        if (live && live.w > 0.02 && live.h > 0.02) onDrawn(live);
        setStart(null); setLive(null);
      }}
    >
      {tagged.filter((t) => t.box).map((t) => (
        <div
          key={t.tagId}
          className={styles.faceBox}
          style={{
            left: `${t.box!.x * 100}%`, top: `${t.box!.y * 100}%`,
            width: `${t.box!.w * 100}%`, height: `${t.box!.h * 100}%`,
          }}
        >
          <span>{t.person?.name || "?"}</span>
        </div>
      ))}
      {live && (
        <div
          className={`${styles.faceBox} ${styles.faceBoxLive}`}
          style={{
            left: `${live.x * 100}%`, top: `${live.y * 100}%`,
            width: `${live.w * 100}%`, height: `${live.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}
