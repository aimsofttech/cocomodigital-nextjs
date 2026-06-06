import api from './api';
import type { UploadedMedia } from '@/types';

const BASE = '/admin/api/uploads';

export type ProgressCb = (percent: number) => void;

interface UploadOpts {
  folder?: string;
  onProgress?: ProgressCb;
}

function buildConfig(folder?: string, onProgress?: ProgressCb) {
  return {
    params: folder ? { folder } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0, // large media uploads must not time out
    onUploadProgress: (e: { loaded: number; total?: number }) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  };
}

async function uploadOne(path: string, file: File, opts: UploadOpts = {}): Promise<UploadedMedia> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`${BASE}${path}`, fd, buildConfig(opts.folder, opts.onProgress));
  return data.data as UploadedMedia;
}

async function uploadMany(path: string, files: File[], opts: UploadOpts = {}): Promise<UploadedMedia[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const { data } = await api.post(`${BASE}${path}`, fd, buildConfig(opts.folder, opts.onProgress));
  return (data.data?.files ?? []) as UploadedMedia[];
}

/**
 * Dedicated media-upload service. Files are uploaded to S3 first; the returned
 * URL is then included in the Create/Update payload. Used by upload components.
 */
export const uploadApi = {
  image: (file: File, opts?: UploadOpts) => uploadOne('/image', file, opts),
  video: (file: File, opts?: UploadOpts) => uploadOne('/video', file, opts),
  images: (files: File[], opts?: UploadOpts) => uploadMany('/images', files, opts),
  videos: (files: File[], opts?: UploadOpts) => uploadMany('/videos', files, opts),
  /** Delete an uploaded object (orphan cleanup / rollback). Best-effort. */
  remove: (urlOrKey: string) =>
    api
      .delete(BASE, { data: /^https?:\/\//i.test(urlOrKey) ? { url: urlOrKey } : { key: urlOrKey } })
      .catch(() => undefined),
};

export default uploadApi;
