import { ReactNode, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

export interface DetailField {
  label: string;
  value?: ReactNode;
  /** Span the full grid width (for long text like headings/descriptions). */
  full?: boolean;
}

/** Per-row config returned by CrudListPage's `viewDetails` prop. */
export interface ViewDetailsConfig {
  title?: string;
  /** Optional media preview (image / video) shown above the fields. */
  media?: ReactNode;
  fields: DetailField[];
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

interface ViewDetailsModalProps extends ViewDetailsConfig {
  isOpen: boolean;
  onClose: () => void;
  fields: DetailField[];
}

/** Shared date-time formatter for detail fields (createdAt / updatedAt). */
export const formatDateTime = (v?: string | Date | null): string =>
  v ? new Date(v).toLocaleString() : '';

/** Image preview with a graceful placeholder when the file is missing or
 *  fails to load (e.g. deleted from S3). Use as the `media` node. */
export function DetailImage({ src, alt = 'Preview' }: { src?: string | null; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
        <PhotoIcon className="w-10 h-10" />
        <span className="text-xs font-medium">Image not available</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="max-h-64 w-auto rounded-lg object-contain drop-shadow-md"
    />
  );
}

const isEmpty = (v: ReactNode) => v === null || v === undefined || v === '';

/** Read-only record viewer opened from a list's eye icon. */
export default function ViewDetailsModal({
  isOpen, onClose, title = 'Details', media, fields, size = 'lg',
}: ViewDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-6">
        {media && (
          <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
            {media}
          </div>
        )}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div
              key={f.label}
              className={`rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 transition-colors hover:bg-gray-50 ${f.full ? 'sm:col-span-2' : ''}`}
            >
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</dt>
              <dd className="mt-1.5 break-words text-sm font-medium text-gray-800">
                {isEmpty(f.value) ? <span className="font-normal text-gray-400">N/A</span> : f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
