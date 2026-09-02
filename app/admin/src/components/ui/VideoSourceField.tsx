import { useEffect, useRef, useState } from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import ImageUpload from '@/components/ui/ImageUpload';
import type { RecommendedSpec } from '@/components/ui/ImageUpload';

/**
 * "Paste a link" or "upload a file" — one video, chosen one way.
 *
 * The two inputs are mutually exclusive by construction rather than by
 * instruction. Switching tab CLEARS the other field, so a record can never
 * hold both a URL and an upload: the API has a precedence rule for that case
 * (the upload wins) but a rule an editor has to know about is a rule that
 * will surprise someone. Here the form makes the choice visible, and the
 * precedence rule stays as a safety net for records written before this
 * existed or through the API directly.
 *
 * WHICH TAB OPENS: whichever field has a value, upload first — matching the
 * API's precedence, so the form always opens showing what the page is
 * actually playing. Re-derived when the record finishes loading, because the
 * wizard resets the form asynchronously and the first render sees empty
 * values; `touched` stops that from yanking the tab back after the editor has
 * picked one.
 */

export interface VideoSourceFieldProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  /** Field holding a pasted URL. */
  urlName: string;
  /** Field holding the uploaded file's S3 URL. */
  fileName: string;
  label: string;
  /** S3 folder uploads land in. */
  folder: string;
  recommended?: RecommendedSpec;
  urlPlaceholder?: string;
  hint?: string;
}

type Mode = 'url' | 'upload';

export default function VideoSourceField({
  register,
  watch,
  setValue,
  urlName,
  fileName,
  label,
  folder,
  recommended,
  urlPlaceholder,
  hint,
}: VideoSourceFieldProps) {
  const url = watch(urlName);
  const file = watch(fileName);

  const [mode, setMode] = useState<Mode>(() => (file ? 'upload' : 'url'));
  const touched = useRef(false);

  useEffect(() => {
    if (touched.current) return;
    if (file) setMode('upload');
    else if (url) setMode('url');
  }, [url, file]);

  /* Switching tab is what enforces "only one". Clearing the field we are
     leaving is deliberate and immediate: leaving a stale value behind would
     save a record whose other tab still holds a video nobody can see. */
  const choose = (next: Mode) => {
    touched.current = true;
    if (next === mode) return;
    setMode(next);
    if (next === 'url') setValue(fileName, '', { shouldDirty: true });
    else setValue(urlName, '', { shouldDirty: true });
  };

  const tabClass = (tab: Mode) =>
    [
      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
      mode === tab
        ? 'bg-white text-primary-700 shadow-sm'
        : 'text-gray-500 hover:text-gray-700',
    ].join(' ');

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="form-label mb-0">{label}</label>

        <div
          role="tablist"
          aria-label={`${label} source`}
          className="inline-flex gap-1 p-1 bg-gray-100 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'url'}
            className={tabClass('url')}
            onClick={() => choose('url')}
          >
            Video URL
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            className={tabClass('upload')}
            onClick={() => choose('upload')}
          >
            Upload Video
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div>
          <input
            type="url"
            {...register(urlName)}
            className="form-input"
            placeholder={urlPlaceholder}
          />
          <p className="mt-1.5 text-[11px] leading-4 text-gray-500">
            {hint ||
              'Paste any video link. A YouTube link plays through the lightweight click-to-play player; anything else plays directly.'}
          </p>
        </div>
      ) : (
        <div>
          <ImageUpload
            name={fileName}
            uploadType="video"
            folder={folder}
            recommended={recommended}
            value={file}
            previewSrc={file}
            onChange={(next) => setValue(fileName, next, { shouldDirty: true })}
          />
          <p className="mt-1.5 text-[11px] leading-4 text-gray-500">
            Uploaded to AWS S3 as soon as you pick it; the website is served
            the S3 URL.
          </p>
        </div>
      )}
    </div>
  );
}
