/**
 * Caspian's API client.
 *
 * Every call goes to /admin/api/media with the shared admin token, which
 * is the same session the panel uses — an editor already signed into
 * /admin opens /caspian and is already in.
 *
 * There is no client-side governance here on purpose. What may be seen is
 * decided by the API, once, in buildGovernanceFilter; a second opinion in
 * the browser would be a second definition of "safe", and the browser's
 * copy is the one an attacker can edit. The UI's job is to render what it
 * is given and to hide controls the session cannot use — hiding a button
 * is a courtesy, not a control.
 */

import { ADMIN_API_BASE, readAdminToken } from "./adminSession";

export interface CaspianAsset {
  id: string;
  key: string;
  url: string;
  kind: "image" | "video";
  caption: string;
  altText: string;
  tags: string[];
  category: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  rights: "own" | "client-ip" | "stock" | "unknown";
  usable: boolean;
  reviewed: number;
  sensitive: boolean;
  people: number;
  namedPeople: number;
  taggedPeople: TaggedPerson[];
  describeStatus: "pending" | "processing" | "done" | "failed" | "skipped";
  createdAt: string;
  posterUrl: string | null;
  /* Computed on the server in lib/mediaSearches. Never recomputed here —
     a second copy of these rules in the browser is a second definition of
     "safe", and it is the copy that can be edited. */
  clearance: { level: "clear" | "restricted" | "blocked"; reasons: string[] };
  review?: { state: "proposed" | "approved" | "rejected"; byName?: string; at?: string | null };
}

/** One asset in full — what GET /media/:id returns. */
export interface CaspianAssetDetail extends CaspianAsset {
  originalName: string;
  folder: string;
  bytes: number;
  mimetype: string;
  assetType: string;
  shows: string[];
  ocrText: string;
  consent: string;
  nda: boolean;
  /* field -> "human" | "model". A field absent from this map has been
     decided by nobody, which is a third state the UI must be able to say. */
  setBy: Record<string, "human" | "model">;
  reviewNote: string;
  reviewFields: string[];
  describedBy: { provider: string; model: string; at: string; copiedFromChecksum: boolean } | null;
  job: {
    id: string; name: string; client: string; clientType: string;
    industry: string; genre: string; nda: boolean;
  } | null;
  blockers: string[];
  updatedAt: string;
}

/** The five fields a reviewer puts their name to. Mirrors CONFIRMABLE_FIELDS. */
export const CONFIRMABLE = ["rights", "consent", "sensitive", "usable", "people"] as const;
export type Confirmable = (typeof CONFIRMABLE)[number];

export interface SavedSearch {
  key: string;
  label: string;
  note: string;
  requiresJob: boolean;
  values: string[];
  count: number;
}

export interface Page<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** Thrown with the API's own message, which is written for a person. */
export class CaspianError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readAdminToken();
  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  let body: { message?: string; data?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    /* A proxy error page, or the API being down. Fall through to the
       status-based message below rather than showing "Unexpected token <". */
  }

  if (!res.ok) {
    /* 401 and 403 are different events and the API is careful to separate
       them: 401 means the session is gone, 403 means it is fine and this
       is not yours. Conflating them would sign a reviewer out mid-queue
       for touching one asset above their level. */
    const fallback =
      res.status === 401
        ? "Your session has expired. Sign in again."
        : res.status === 403
          ? "You do not have permission to do that."
          : `The library did not respond as expected (${res.status}).`;
    throw new CaspianError(res.status, body.message || fallback);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const listAssets = (params: {
  q?: string;
  search?: string;
  value?: string;
  rights?: string;
  kind?: string;
  reviewState?: string;
  publishable?: string;
  page?: number;
  limit?: number;
}) => call<Page<CaspianAsset>>(`/media${qs(params)}`);

export const listSearches = () =>
  call<{ data: SavedSearch[] }>("/media/searches").then((r) => r.data);

/**
 * Approve, naming the fields you are putting your name to.
 *
 * `confirm` is not optional in practice. The server defaults it to ALL of
 * CONFIRMABLE_FIELDS when it is absent, and every listed field is stamped
 * setBy 'human' — so posting an empty body claims a person personally
 * decided the rights, consent, sensitivity, usability and headcount of an
 * asset they may have glanced at for a second. That is precisely the claim
 * setBy exists to make trustworthy, so the caller has to make it on
 * purpose.
 */
export const approveAsset = (
  id: string,
  opts: { confirm: string[]; note?: string; corrections?: Record<string, unknown> } = { confirm: [] },
) =>
  call<{ message: string; data: CaspianAsset }>(`/media/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({
      confirm: opts.confirm,
      note: opts.note || "",
      ...(opts.corrections || {}),
    }),
  });

export const getAsset = (id: string) =>
  call<{ data: CaspianAssetDetail }>(`/media/${id}`).then((r) => r.data);

export const patchAsset = (id: string, patch: Record<string, unknown>) =>
  call<{ data: CaspianAssetDetail }>(`/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((r) => r.data);

/**
 * Where the file is, asked for with the session's header.
 *
 * The download route is behind auth, so a plain link cannot reach it and
 * following its 302 in the browser is not possible. Pulling the bytes into
 * a blob would work for a photograph and is wrong for a 500 MB video. So
 * we ask where, then navigate there.
 */
export const fileLocation = (id: string) =>
  call<{ data: { url: string; filename: string } }>(`/media/${id}/file?as=url`)
    .then((r) => r.data);

export const rejectAsset = (id: string, reason: string) =>
  call<{ message: string }>(`/media/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

/* ── jobs ──────────────────────────────────────────────────────────────── */

export interface CaspianJob {
  id: string;
  name: string;
  client: string;
  clientType: string;
  industry: string;
  genre: string;
  nda: boolean;
  assetCount: number;
}

export interface JobOptions {
  clientType: string[];
  industry: string[];
  genre: string[];
}

export const listJobs = () =>
  call<{ data: CaspianJob[] }>("/media-jobs").then((r) => r.data);

export const jobOptions = () =>
  call<{ data: JobOptions }>("/media-jobs/options").then((r) => r.data);

export const createJob = (job: Partial<CaspianJob>) =>
  call<{ data: CaspianJob }>("/media-jobs", {
    method: "POST",
    body: JSON.stringify(job),
  }).then((r) => r.data);

/* ── upload ────────────────────────────────────────────────────────────── */

export interface UploadResult {
  originalName: string;
  status: "uploaded" | "duplicate" | "rejected" | "failed";
  reason?: string;
  kind?: string;
  bytes?: number;
}

export interface UploadSummary {
  received: number;
  uploaded: number;
  duplicate: number;
  rejected: number;
  failed: number;
  bytesStored: number;
  bytesSkipped: number;
}

/** The server's own ceiling. Batches are split to match it, not guessed. */
export const MAX_PER_BATCH = 20;

/**
 * One batch. Multipart, so it cannot use `call` — that sets a JSON
 * content type, and setting Content-Type by hand on a FormData request
 * omits the multipart boundary the parser needs.
 */
export async function uploadBatch(
  files: File[],
  meta: { jobId: string; rights: string; consent: string; folder?: string },
): Promise<{ summary: UploadSummary; results: UploadResult[] }> {
  const token = readAdminToken();
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("jobId", meta.jobId);
  form.append("rights", meta.rights);
  form.append("consent", meta.consent);
  if (meta.folder) form.append("folder", meta.folder);

  const res = await fetch(`${ADMIN_API_BASE}/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  let body: { message?: string; data?: { summary: UploadSummary; results: UploadResult[] } } = {};
  try {
    body = await res.json();
  } catch {
    /* 413 from the batch-size cap arrives as an HTML error page from the
       proxy, not JSON. Fall through to the status message below. */
  }

  /* 201 with rejections in it is a success with notes, not a failure —
     the server says so deliberately, so that a client does not re-upload
     the nineteen files that worked. Only an all-refused batch is 400. */
  if (!res.ok && !body.data) {
    throw new CaspianError(
      res.status,
      body.message
        || (res.status === 413
          ? "That batch is too large. Try fewer files at once."
          : `Upload failed (${res.status}).`),
    );
  }
  return body.data as { summary: UploadSummary; results: UploadResult[] };
}

/* ── people ────────────────────────────────────────────────────────────── */

export interface CaspianPerson {
  id: string;
  name: string;
  kind: string;
  role?: string;
  release: string;
  status: number;
}

export interface FaceBox { x: number; y: number; w: number; h: number }

export interface TaggedPerson {
  tagId: string;
  person: { id: string; name: string; role: string } | null;
  box: FaceBox | null;
  note: string;
  taggedAt: string;
}

export const listPeople = (q?: string) =>
  call<{ data: CaspianPerson[] }>(`/media/people${q ? `?q=${encodeURIComponent(q)}` : ""}`)
    .then((r) => r.data);

export const createPerson = (name: string, kind = "internal") =>
  call<{ data: CaspianPerson }>("/media/people", {
    method: "POST",
    body: JSON.stringify({ name, kind }),
  }).then((r) => r.data);

/**
 * Name somebody in a frame.
 *
 * `box` is 0-1 fractions of the frame, never pixels — the same photograph
 * is served at different sizes and a pixel box would be wrong at all but
 * one of them. The server rejects anything above 1 with that explanation.
 *
 * The response can carry `warnings`: tagging someone who has refused a
 * release drops `usable` on the asset, and that is worth showing rather
 * than letting a reviewer discover it later.
 */
export const tagPerson = (
  assetId: string,
  body: { personId: string; box?: FaceBox | null; note?: string },
) =>
  call<{ data: unknown; warnings?: string[]; message?: string }>(`/media/${assetId}/people`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const untagPerson = (assetId: string, personId: string) =>
  call<{ message: string }>(`/media/${assetId}/people/${personId}`, { method: "DELETE" });

export interface PersonSuggestion {
  personId: string;
  name: string;
  role: string;
  release: string;
  score: number;
  /* Words rather than a number: "0.82" invites a reader to think it is
     calibrated, and it is a ranking. */
  confidence: "likely" | "possible" | "a guess";
  reasons: string[];
}

export const suggestPeople = (assetId: string) =>
  call<{ data: PersonSuggestion[] }>(`/media/${assetId}/people/suggestions`).then((r) => r.data);

/** Name one person across a whole drop or project. Scope is required. */
export const tagBatch = (personId: string, scope: { folder?: string; job?: string }) =>
  call<{ message: string; data: { tagged: number; demoted: number } }>(
    `/media/people/${personId}/tag-batch`,
    { method: "POST", body: JSON.stringify(scope) },
  );
