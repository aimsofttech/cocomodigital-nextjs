"use client";

/**
 * Caspian's front door — dropping a folder into the library.
 *
 * THE HARD PART IS NOT THE FILES, IT IS THE TWO QUESTIONS
 *
 * `rights` and `consent` are the only two facts a vision model can never
 * supply. A model can say what is in the frame; it cannot say who owns it
 * or whether the person in it agreed to be photographed. Whatever is
 * recorded here is stamped setBy: 'human' and no later describe run may
 * overrule it — so a wrong answer here is durable, and it is the answer
 * every downstream "safe to post" decision rests on.
 *
 * Which makes a modal with sensible defaults exactly the wrong shape. A
 * default is a guess wearing a person's name, and someone dropping 200
 * files at the end of a shoot will accept whatever is preselected.
 *
 * So: nothing is preselected, the two questions are on the same screen as
 * the files rather than behind a dialog, and the upload button stays
 * disabled until both are answered. The friction is the feature — it is
 * about eight seconds, once per drop, and it buys a library whose
 * governance means something.
 *
 * The options are phrased as things that happened, not as enum values.
 * "We shot this" is answerable by someone who was there. "own" is not.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listJobs,
  jobOptions,
  createJob,
  uploadBatch,
  MAX_PER_BATCH,
  CaspianError,
  type CaspianJob,
  type JobOptions,
  type UploadResult,
} from "@/src/lib/caspian";
import styles from "./Caspian.module.css";

/* The enum values, with the words a person would actually use. Keys match
   MediaAsset's `rights` and `consent` enums exactly — if one drifts the
   API rejects it by name rather than storing something meaningless. */
const RIGHTS = [
  { value: "own", label: "We shot it", hint: "Cocoma owns this outright" },
  { value: "client-ip", label: "Client's material", hint: "Theirs, not ours to post" },
  { value: "stock", label: "Licensed stock", hint: "Bought — never on a page claiming it is ours" },
  { value: "unknown", label: "I don't know", hint: "Honest, and someone will have to find out" },
];

const CONSENT = [
  { value: "staff", label: "Our own team", hint: "Cocoma people, covered by employment" },
  { value: "released", label: "Signed a release", hint: "There is paperwork" },
  { value: "not-required", label: "Nobody in frame", hint: "Rooms, gear, screens, artwork" },
  { value: "minors", label: "Someone under 18", hint: "Locked out of publishing" },
  { value: "refused", label: "Someone said no", hint: "Kept, never published" },
  { value: "unknown", label: "I don't know", hint: "Honest, and someone will have to find out" },
];

const fmtBytes = (n: number) => {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const STATUS_CLASS: Record<string, string> = {
  uploaded: styles.rUploaded,
  duplicate: styles.rDuplicate,
  rejected: styles.rRejected,
  failed: styles.rFailed,
};

export default function Upload({ onDone }: { onDone: () => void }) {
  const [jobs, setJobs] = useState<CaspianJob[]>([]);
  const [opts, setOpts] = useState<JobOptions | null>(null);
  const [jobId, setJobId] = useState("");
  const [rights, setRights] = useState("");
  const [consent, setConsent] = useState("");
  const [folder, setFolder] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newJob, setNewJob] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const refreshJobs = useCallback(() => {
    listJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    refreshJobs();
    jobOptions().then(setOpts).catch(() => setOpts(null));
  }, [refreshJobs]);

  const job = useMemo(() => jobs.find((j) => j.id === jobId), [jobs, jobId]);
  const batches = Math.ceil(files.length / MAX_PER_BATCH);
  const ready = files.length > 0 && jobId && rights && consent && !busy;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setResults([]);
    setError(null);
    /* Deduped by name+size+lastModified so dropping the same folder twice
       does not queue everything again. The server would collapse the bytes
       anyway, but uploading them twice to find that out is a waste of the
       one thing a folder drop is short of: time. */
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      const next = [...prev];
      Array.from(list).forEach((f) => {
        const k = `${f.name}:${f.size}:${f.lastModified}`;
        if (!seen.has(k)) { seen.add(k); next.push(f); }
      });
      return next;
    });
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    setResults([]);
    setDone(0);

    const all: UploadResult[] = [];
    try {
      /* Sequential, not parallel. The server caps a batch at 20 files and
         600 MB; firing five batches at once would race that ceiling and
         make a 413 look random. One at a time is also the only way the
         progress count means anything. */
      for (let i = 0; i < files.length; i += MAX_PER_BATCH) {
        const slice = files.slice(i, i + MAX_PER_BATCH);
        const res = await uploadBatch(slice, { jobId, rights, consent, folder });
        all.push(...res.results);
        setResults([...all]);
        setDone(i + slice.length);
      }
      setFiles([]);
      onDone();
    } catch (err) {
      /* Whatever already landed stays landed and is shown. A batch that
         fails halfway through 200 files must not read as "nothing worked",
         because re-dropping everything is the expensive mistake. */
      setError(err instanceof CaspianError ? err.message : "The upload stopped partway.");
      setResults([...all]);
      refreshJobs();
    } finally {
      setBusy(false);
    }
  };

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className={styles.uploadPanel}>
      <div
        className={`${styles.drop} ${dragging ? styles.dropOn : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
        <strong>Drop a folder here</strong>
        <span className={styles.muted}>
          or click to choose &middot; images and video &middot; 15 MB an image, 500 MB a video
        </span>
      </div>

      {files.length > 0 && (
        <p className={styles.queue}>
          <strong>{files.length}</strong> file{files.length === 1 ? "" : "s"} ready
          {" · "}{fmtBytes(files.reduce((n, f) => n + f.size, 0))}
          {batches > 1 && ` · sent in ${batches} batches of ${MAX_PER_BATCH}`}
          <button className={styles.ghostSm} onClick={() => setFiles([])} disabled={busy}>
            Clear
          </button>
        </p>
      )}

      <div className={styles.askRow}>
        <div className={styles.ask}>
          <h3 className={styles.askTitle}>
            Which project? <span className={styles.req}>required</span>
          </h3>
          <p className={styles.askWhy}>
            Client, industry and genre live on the project — none of them can be
            read off a photograph later. It also carries the NDA flag.
          </p>
          <div className={styles.toggles}>
            <select
              className={styles.select}
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              aria-label="Project"
            >
              <option value="">Choose a project…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}{j.client ? ` — ${j.client}` : ""}{j.nda ? " (NDA)" : ""}
                </option>
              ))}
            </select>
            <button className={styles.ghostSm} onClick={() => setNewJob((v) => !v)}>
              {newJob ? "Cancel" : "New project"}
            </button>
          </div>
          {job?.nda && (
            <p className={styles.ndaWarn}>
              This project is under NDA. Everything you upload to it is excluded from
              the library&rsquo;s public views and is never sent to a description provider.
            </p>
          )}
          {newJob && opts && (
            <NewJob
              opts={opts}
              onCreated={(j) => {
                setJobs((prev) => [j, ...prev]);
                setJobId(j.id);
                setNewJob(false);
              }}
            />
          )}
        </div>

        <fieldset className={styles.ask}>
          <legend className={styles.askTitle}>
            Whose is it? <span className={styles.req}>required</span>
          </legend>
          <p className={styles.askWhy}>
            No model can answer this. Whatever you pick is recorded as your answer
            and cannot be overwritten by a later description run.
          </p>
          <div className={styles.opts}>
            {RIGHTS.map((o) => (
              <label key={o.value} className={`${styles.opt} ${rights === o.value ? styles.optOn : ""}`}>
                <input
                  type="radio" name="rights" value={o.value}
                  checked={rights === o.value}
                  onChange={() => setRights(o.value)}
                />
                <span className={styles.optLabel}>{o.label}</span>
                <span className={styles.optHint}>{o.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.ask}>
          <legend className={styles.askTitle}>
            Who is in it? <span className={styles.req}>required</span>
          </legend>
          <p className={styles.askWhy}>
            About the people in frame, not the footage. Minors and refusals are kept
            and catalogued — they are simply never publishable.
          </p>
          <div className={styles.opts}>
            {CONSENT.map((o) => (
              <label key={o.value} className={`${styles.opt} ${consent === o.value ? styles.optOn : ""}`}>
                <input
                  type="radio" name="consent" value={o.value}
                  checked={consent === o.value}
                  onChange={() => setConsent(o.value)}
                />
                <span className={styles.optLabel}>{o.label}</span>
                <span className={styles.optHint}>{o.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.sendRow}>
        <input
          className={styles.searchBox}
          placeholder="Name this drop (optional) — e.g. “Studio B, 12 March”"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          aria-label="Name this drop"
        />
        <button className={styles.primary} disabled={!ready} onClick={send}>
          {busy
            ? `Uploading ${done} of ${files.length}…`
            : `Upload ${files.length || ""} file${files.length === 1 ? "" : "s"}`}
        </button>
      </div>

      {!busy && files.length > 0 && !(jobId && rights && consent) && (
        <p className={styles.note}>
          Answer the three questions above and the upload button turns on. They are
          asked once per drop, and they are what makes the library trustworthy later.
        </p>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      {results.length > 0 && (
        <div className={styles.results}>
          <p className={styles.resultsHead}>
            {counts.uploaded || 0} uploaded
            {counts.duplicate ? ` · ${counts.duplicate} already in the library` : ""}
            {counts.rejected ? ` · ${counts.rejected} refused` : ""}
            {counts.failed ? ` · ${counts.failed} failed` : ""}
          </p>
          <ul className={styles.resultList}>
            {results.map((r, i) => (
              <li key={`${r.originalName}-${i}`} className={styles.resultRow}>
                <span className={`${styles.rTag} ${STATUS_CLASS[r.status] || ""}`}>{r.status}</span>
                <span className={styles.rName}>{r.originalName}</span>
                {r.reason && <span className={styles.rWhy}>{r.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Inline project creation, so "New project" is not a trip to another screen. */
function NewJob({
  opts, onCreated,
}: { opts: JobOptions; onCreated: (j: CaspianJob) => void }) {
  const [form, setForm] = useState({
    name: "", client: "", clientType: "unknown",
    industry: "unknown", genre: "unknown", nda: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setErr("A project needs a name."); return; }
    setBusy(true); setErr(null);
    try {
      onCreated(await createJob(form));
    } catch (e) {
      setErr(e instanceof CaspianError ? e.message : "Could not create that project.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.newJob}>
      <input
        className={styles.searchBox} placeholder="Project name"
        value={form.name} onChange={(e) => set("name", e.target.value)}
      />
      <input
        className={styles.searchBox} placeholder="Client (optional)"
        value={form.client} onChange={(e) => set("client", e.target.value)}
      />
      <div className={styles.toggles}>
        {(["clientType", "industry", "genre"] as const).map((k) => (
          <select
            key={k} className={styles.select} value={form[k]}
            onChange={(e) => set(k, e.target.value)} aria-label={k}
          >
            {opts[k].map((v) => <option key={v} value={v}>{k}: {v}</option>)}
          </select>
        ))}
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={form.nda} onChange={(e) => set("nda", e.target.checked)} />
        <span>Under NDA — nothing from this project may be shown publicly</span>
      </label>
      {err && <p className={styles.gateError}>{err}</p>}
      <button className={styles.primary} onClick={submit} disabled={busy}>
        {busy ? "Creating…" : "Create project"}
      </button>
    </div>
  );
}
