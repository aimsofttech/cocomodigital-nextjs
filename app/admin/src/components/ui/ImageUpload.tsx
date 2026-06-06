import { useRef, useState } from 'react';
import { PhotoIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import uploadApi from '@/services/uploadApi';

type MediaType = 'image' | 'video';

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
}

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
