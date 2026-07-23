import { ReactNode, useEffect } from 'react';
import clsx from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';

/* ── Spinner ── */
export const Spinner = ({ className = '' }: { className?: string }) => (
  <div className={clsx('flex items-center justify-center py-10', className)}>
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
  </div>
);

/* ── Badge ── */
const BADGE_COLORS: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};
export const Badge = ({ color = 'gray', children }: { color?: string; children: ReactNode }) => (
  <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', BADGE_COLORS[color] || BADGE_COLORS.gray)}>
    {children}
  </span>
);

export const statusColor = (status: string): string =>
  ({
    new: 'blue', contacted: 'yellow', qualified: 'purple', proposal: 'orange',
    negotiation: 'orange', won: 'green', lost: 'red', junk: 'gray',
    scheduled: 'blue', completed: 'green', no_answer: 'yellow', busy: 'yellow',
    cancelled: 'gray', missed: 'red', rescheduled: 'purple',
    open: 'blue', in_progress: 'yellow', done: 'green',
    pending: 'yellow', snoozed: 'purple',
    queued: 'gray', sent: 'blue', delivered: 'green', read: 'green',
    replied: 'purple', failed: 'red', bounced: 'red', manual: 'orange', received: 'purple',
    hot: 'red', warm: 'orange', cold: 'blue',
  } as Record<string, string>)[status] || 'gray';

/* ── Modal ── */
export const Modal = ({
  open, onClose, title, children, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className={clsx('card w-full p-5', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── Empty state ── */
export const Empty = ({ message = 'Nothing here yet.' }: { message?: string }) => (
  <div className="py-12 text-center text-sm text-gray-400">{message}</div>
);

/* ── Pagination ── */
export const Pagination = ({ meta, onPage }: { meta: any; onPage: (p: number) => void }) => {
  if (!meta || !meta.total || meta.total <= meta.limit) return null;
  const pages = Math.ceil(meta.total / meta.limit);
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
      <span className="text-gray-500">
        Page {meta.page} of {pages} · {meta.total} records
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Prev</button>
        <button className="btn-secondary" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Next</button>
      </div>
    </div>
  );
};

/* ── Page header ── */
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ── Confirm dialog (promise-less, simple) ── */
export const confirmAction = (message: string): boolean => window.confirm(message);

export const fmtDate = (d?: string | Date | null): string =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const fmtDateOnly = (d?: string | Date | null): string =>
  d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

export const inr = (n?: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
