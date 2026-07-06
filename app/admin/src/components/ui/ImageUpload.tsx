import { useRef, useState } from 'react';
import { PhotoIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import uploadApi from '@/services/uploadApi';

type MediaType = 'image' | 'video';

/** Recommended upload specs, shown as a helper line and soft-validated on
    select (warnings only — uploads are never blocked). */
export interface RecommendedSpec {
  width: number;
  height: number;
  /** Display aspect ratio, e.g. '2:3'. */
  ratio?: string;
  /** e.g. 'JPG, PNG, WebP'. */
  formats?: string;
  maxSizeMB?: number;
  /** Extra context, e.g. 'cropped to fit — exact ratio matters'. */
  note?: string;
}

interface ImageUploadProps {
  /** Field name (informational). */
  name?: string;
  label?: string;
  /** Current stored S3 URL (controlled). */
  value?: string;
  /** Called with the uploaded S3 URL (or '' when cleared). */
  onChange: (url: string) => void;
  /** Which dedicated upload API to use. Defaults to 'image'. */
  uploadType?: MediaType;
  /** Optional S3 sub-folder for organisation, e.g. 'brands'. */
  folder?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  /** Recommended dimensions/format guidance shown under the field. */
  recommended?: RecommendedSpec;
}

// Read the pixel dimensions of a local image file (null on failure).
const readImageSize = (file: File) =>
  new Promise<{ w: number; h: number } | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

/**
 * Single media uploader. On select, the file is uploaded to S3 immediately via
 * the dedicated upload API and the returned URL is emitted through `onChange`,
 * so forms only ever submit URLs. Replacing/removing a file uploaded in this
 * session deletes it from S3 to avoid orphans.
 */
export default function ImageUpload({
  name,
  label,
  value,
  onChange,
  uploadType = 'image',
  folder,
  accept,
  required,
  disabled,
  recommended,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // URLs uploaded during this form session (safe to delete on replace/remove).
  const sessionUploads = useRef<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isVideo = uploadType === 'video';
  const acceptAttr = accept || (isVideo ? 'video/*' : 'image/*');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    // Soft validation against the recommended specs — warn, never block.
    if (recommended) {
      if (recommended.maxSizeMB && file.size > recommended.maxSizeMB * 1024 * 1024) {
        toast(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB — larger than the recommended max of ${recommended.maxSizeMB} MB. It may load slowly on the website.`, { icon: '⚠️', duration: 6000 });
      }
      if (!isVideo) {
        const dims = await readImageSize(file);
        if (dims) {
          const recRatio = recommended.width / recommended.height;
          const fileRatio = dims.w / dims.h;
          if (Math.abs(fileRatio - recRatio) / recRatio > 0.2) {
            toast(`Image is ${dims.w}×${dims.h}px — its shape differs from the recommended ${recommended.width}×${recommended.height}px${recommended.ratio ? ` (${recommended.ratio})` : ''}. It may look cropped or letterboxed on the website.`, { icon: '⚠️', duration: 7000 });
          } else if (dims.w < recommended.width * 0.6) {
            toast(`Image is ${dims.w}×${dims.h}px — smaller than the recommended ${recommended.width}×${recommended.height}px, so it may look blurry on the website.`, { icon: '⚠️', duration: 6000 });
          }
        }
      }
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploader = isVideo ? uploadApi.video : uploadApi.image;
      const media = await uploader(file, { folder, onProgress: setProgress });
      // Replacing a file we uploaded earlier this session — clean it up.
      if (value && sessionUploads.current.has(value)) uploadApi.remove(value);
      sessionUploads.current.add(media.url);
      onChange(media.url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to upload ${uploadType}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clear = () => {
    if (value && sessionUploads.current.has(value)) {
      uploadApi.remove(value);
      sessionUploads.current.delete(value);
    }
    onChange('');
  };

  const hasMedia = Boolean(value);

  return (
    <div>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex items-start gap-4">
        {hasMedia ? (
          <div className="relative group">
            {isVideo ? (
              <video
                src={value}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200 bg-black"
                muted
              />
            ) : (
              <img
                src={value}
                alt="preview"
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
            )}
            <button
              type="button"
              onClick={clear}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => !disabled && !uploading && inputRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            {uploading ? (
              <span className="text-xs text-primary-500 font-medium">{progress}%</span>
            ) : (
              <>
                {isVideo ? (
                  <VideoCameraIcon className="w-6 h-6 text-gray-400" />
                ) : (
                  <PhotoIcon className="w-6 h-6 text-gray-400" />
                )}
                <span className="text-xs text-gray-400 mt-1">Upload</span>
              </>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 mt-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="btn-secondary btn-sm text-xs"
          >
            {uploading ? `Uploading ${progress}%` : hasMedia ? 'Change' : 'Select'}
          </button>
          {hasMedia && !uploading && (
            <button type="button" onClick={clear} className="btn btn-sm text-xs text-red-500 hover:bg-red-50">
              Remove
            </button>
          )}
        </div>
      </div>
      {recommended && (
        <p className="mt-1.5 text-[11px] leading-4 text-gray-500">
          Recommended: <span className="font-medium text-gray-700">{recommended.width} × {recommended.height} px</span>
          {recommended.ratio && <> (ratio {recommended.ratio})</>}
          {recommended.formats && <> • {recommended.formats}</>}
          {recommended.maxSizeMB && <> • max {recommended.maxSizeMB} MB</>}
          {recommended.note && <> — {recommended.note}</>}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={acceptAttr}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}
