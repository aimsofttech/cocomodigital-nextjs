import { useRef, useState } from 'react';
import { PhotoIcon, VideoCameraIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import uploadApi from '@/services/uploadApi';

type MediaType = 'image' | 'video';

interface MediaUploadProps {
  label?: string;
  /** Current list of stored S3 URLs (controlled). */
  value?: string[];
  onChange: (urls: string[]) => void;
  uploadType?: MediaType;
  folder?: string;
  /** Maximum number of items allowed. */
  max?: number;
  accept?: string;
  disabled?: boolean;
}

/**
 * Multiple media uploader. Files are uploaded to S3 immediately (in one batched
 * request) and the list of URLs is emitted via `onChange`. Removing a file that
 * was uploaded this session deletes it from S3 to avoid orphans.
 */
export default function MediaUpload({
  label,
  value = [],
  onChange,
  uploadType = 'image',
  folder,
  max = 20,
  accept,
  disabled,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionUploads = useRef<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isVideo = uploadType === 'video';
  const acceptAttr = accept || (isVideo ? 'video/*' : 'image/*');
  const urls = value || [];

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;

    const room = max - urls.length;
    if (room <= 0) {
      toast.error(`You can upload at most ${max} ${uploadType}s.`);
      return;
    }
    const toUpload = files.slice(0, room);

    setUploading(true);
    setProgress(0);
    try {
      const uploader = isVideo ? uploadApi.videos : uploadApi.images;
      const media = await uploader(toUpload, { folder, onProgress: setProgress });
      const newUrls = media.map((m) => m.url);
      newUrls.forEach((u) => sessionUploads.current.add(u));
      onChange([...urls, ...newUrls]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to upload ${uploadType}s`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeAt = (idx: number) => {
    const url = urls[idx];
    if (url && sessionUploads.current.has(url)) {
      uploadApi.remove(url);
      sessionUploads.current.delete(url);
    }
    onChange(urls.filter((_, i) => i !== idx));
  };

  const canAddMore = urls.length < max;

  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div className="flex flex-wrap items-start gap-3">
        {urls.map((url, idx) => (
          <div key={url + idx} className="relative group">
            {isVideo ? (
              <video src={url} className="w-24 h-24 object-cover rounded-lg border border-gray-200 bg-black" muted />
            ) : (
              <img src={url} alt="preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {canAddMore && (
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
                <PlusIcon className="w-3 h-3 text-gray-400 mt-0.5" />
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}
