import { useState } from 'react';
import Modal from './Modal';

interface StatusToggleProps {
  status: number | string;
  /** Called with the new status (1 = Active, 0 = Inactive) after the user confirms. */
  onConfirm: (newStatus: number) => Promise<void> | void;
  /** Optional item name shown in the confirmation message. */
  label?: string;
}

/** Pure visual toggle switch — does not own any state. */
function Switch({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 ${
        on ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function StatusToggle({ status, onConfirm, label }: StatusToggleProps) {
  const isActive = status === 1 || status === '1' || status === 'active';
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const nextStatus = isActive ? 0 : 1;
  const nextLabel = nextStatus === 1 ? 'Active' : 'Inactive';

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(nextStatus);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Status text and switch kept tightly together, vertically centered */}
      <div className="inline-flex items-center gap-2 whitespace-nowrap leading-none">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-none ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <Switch on={isActive} onClick={() => setOpen(true)} />
      </div>

      <Modal isOpen={open} onClose={() => (saving ? undefined : setOpen(false))} title="Change Status" size="sm">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-gray-600">
            Are you sure you want to set{label ? ` "${label}"` : ' this item'} as{' '}
            <span className={`font-semibold ${nextStatus === 1 ? 'text-green-600' : 'text-gray-700'}`}>{nextLabel}</span>?
          </p>

          {/* Preview row — text on the left, switch on the right */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  nextStatus === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {nextLabel}
              </span>
              <Switch on={nextStatus === 1} disabled />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="button" onClick={handleConfirm} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
