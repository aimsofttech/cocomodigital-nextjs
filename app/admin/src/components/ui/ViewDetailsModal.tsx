import { ReactNode } from 'react';
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

const isEmpty = (v: ReactNode) => v === null || v === undefined || v === '';

/** Read-only record viewer opened from a list's eye icon. */
export default function ViewDetailsModal({
  isOpen, onClose, title = 'Details', media, fields, size = 'lg',
}: ViewDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-5">
        {media && <div className="flex justify-center">{media}</div>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {fields.map((f) => (
            <div key={f.label} className={f.full ? 'sm:col-span-2' : ''}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</dt>
              <dd className="mt-1 text-sm text-gray-900 break-words">
                {isEmpty(f.value) ? <span className="text-gray-400">N/A</span> : f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
