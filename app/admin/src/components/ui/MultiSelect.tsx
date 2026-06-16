import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  /** Currently selected values (controlled). */
  value?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/**
 * Chip-style multi-select. Click the control to open a dropdown; picked options
 * appear as removable chips (each with a × button). Closes on outside click.
 * Emits/accepts a plain string[] so it drops into a react-hook-form field.
 */
export default function MultiSelect({ options, value = [], onChange, placeholder = 'Select…' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = Array.isArray(value) ? value : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const remove = (val: string) => onChange(selected.filter((v) => v !== val));
  const labelFor = (val: string) => options.find((o) => o.value === val)?.label ?? val;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((o) => !o)}
        className="form-input h-auto min-h-[2.625rem] flex flex-wrap items-center gap-1.5 cursor-pointer pr-8"
      >
        {selected.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 text-xs font-medium pl-2 pr-1 py-0.5 rounded"
          >
            {labelFor(val)}
            <button
              type="button"
              title="Remove"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); remove(val); }}
              className="rounded-full p-0.5 hover:bg-primary-200 hover:text-primary-900"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
          {options.map((o) => {
            const isSel = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => toggle(o.value)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${isSel ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
              >
                <span>{o.label}</span>
                {isSel && <CheckIcon className="w-4 h-4 text-primary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
