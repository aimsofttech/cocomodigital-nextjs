import { useState } from 'react';
import { PlayCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

// S3 bucket base URL — images stored as S3 keys (relative paths) need this prepended
const S3_URL = (import.meta as any).env?.VITE_AWS_URL || '';
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

function buildUrl(src: string): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  // Raw S3 key (e.g. "thumbnails/abc.jpg") → prepend S3 bucket base URL
  const base = S3_URL || API_URL;
  return `${base}/${src}`.replace(/([^:]\/)\/+/g, '$1');
}

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]+)/);
  return m ? m[1] : '';
}

// ── ImageCell ─────────────────────────────────────────────────────────────────
// Default thumbnail size is a wide ~2.8:1 landscape (140×50) so table previews
// match the card ratio used on the web frontend. Pages can still override `size`.
export function ImageCell({ src, alt = 'image', size = 'w-[140px] h-[50px]', bg = '' }: { src?: string | null; alt?: string; size?: string; bg?: string }) {
  const [open, setOpen] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`${size} rounded-lg ${bg || 'bg-gray-100'} border border-gray-200 flex items-center justify-center`}>
        <PhotoIcon className="w-5 h-5 text-gray-300" />
      </div>
    );
  }

  const url = buildUrl(src);

  return (
    <>
      <img
        src={url}
        alt={alt}
        className={`${size} ${bg ? `object-contain p-1 ${bg}` : 'object-cover'} rounded-lg border border-gray-200 cursor-zoom-in hover:border-primary-400 hover:scale-105 transition-all`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onError={() => setErrored(true)}
      />
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title="Image Preview" size="xl">
          <div className={`flex items-center justify-center p-2 min-h-32 ${bg ? `${bg} rounded-lg` : ''}`}>
            <img src={url} alt={alt} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg" />
          </div>
        </Modal>
      )}
    </>
  );
}

// ── VideoCell ─────────────────────────────────────────────────────────────────
export function VideoCell({ src, thumbnail }: { src?: string | null; thumbnail?: string | null }) {
  const [open, setOpen] = useState(false);

  if (!src) {
    return (
      <div className="w-16 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
        <PlayCircleIcon className="w-5 h-5 text-gray-300" />
      </div>
    );
  }

  const isYt = isYouTube(src);
  const ytId = isYt ? getYouTubeId(src) : '';
  const thumbUrl = thumbnail
    ? buildUrl(thumbnail)
    : isYt && ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
  const videoUrl = buildUrl(src);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="relative w-16 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-primary-400 hover:scale-105 transition-all group bg-gray-900 flex-shrink-0"
        title="Preview video"
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt="thumb"
            className="absolute inset-0 w-full h-full object-cover opacity-75"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircleIcon className="w-6 h-6 text-white drop-shadow group-hover:scale-110 transition-transform" />
        </div>
      </button>

      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title="Video Preview" size="xl">
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            {isYt && ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <video src={videoUrl} controls autoPlay className="w-full h-full" />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
