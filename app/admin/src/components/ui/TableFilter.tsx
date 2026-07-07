import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FunnelIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FilterType = 'status' | 'select' | 'date-range' | 'number-range' | 'boolean' | 'year';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  /** Options for select/status/boolean fields */
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  /**
   * true  → sent to API as query param (server-side)
   * false → applied in-memory to current page data (client-side)
   * Defaults: status/select/boolean → true, date-range/number-range/year → false
   */
  serverSide?: boolean;
  /** Override the API param name (defaults to `key`) */
  apiParam?: string;
}

export interface FilterValues {
  [key: string]: any;
}

interface TableFilterProps {
  fields: FilterField[];
  values: FilterValues;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  activeCount: number;
  loading?: boolean;
  /** Called when user clicks "Apply Filters" — defaults to collapsing the panel */
  onApply?: () => void;
}

// ── Default option sets ───────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
];

const BOOLEAN_OPTIONS = [
  { value: '', label: 'All' },
  { value: '1', label: 'Yes' },
  { value: '0', label: 'No' },
];

// ── Helper: is a value "empty" ────────────────────────────────────────────────
export function isEmptyValue(v: any): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v === 'object') {
    return !Object.values(v).some((x) => x !== '' && x !== null && x !== undefined);
  }
  return false;
}

// ── Client-side filter applicator ─────────────────────────────────────────────
export function applyClientFilters(data: any[], values: FilterValues, fields: FilterField[]): any[] {
  const clientFields = fields.filter((f) => f.serverSide === false || (!f.serverSide && (f.type === 'date-range' || f.type === 'number-range' || f.type === 'year')));
  if (!clientFields.length) return data;

  return data.filter((item) => {
    for (const field of clientFields) {
      const value = values[field.key];
      if (isEmptyValue(value)) continue;

      switch (field.type) {
        case 'date-range': {
          const raw = item.createdAt || item.created_at || item.updatedAt;
          if (!raw) continue;
          const date = new Date(raw);
          if (value.from && date < new Date(value.from)) return false;
          if (value.to && date > new Date(value.to + 'T23:59:59.999Z')) return false;
          break;
        }
        case 'number-range': {
          const num = Number(item[field.key] ?? 0);
          if (value.min !== '' && value.min !== undefined && num < Number(value.min)) return false;
          if (value.max !== '' && value.max !== undefined && num > Number(value.max)) return false;
          break;
        }
        case 'year': {
          if (item[field.key] !== undefined && String(item[field.key]) !== String(value)) return false;
          break;
        }
        default:
          break;
      }
    }
    return true;
  });
}

// ── Extract server-side params ────────────────────────────────────────────────
export function extractServerParams(values: FilterValues, fields: FilterField[]): Record<string, any> {
  const params: Record<string, any> = {};
  for (const field of fields) {
    // An explicit `serverSide: true` always wins (e.g. a year filter backed by
    // the API); otherwise range/year types default to client-side filtering.
    const isServer = field.serverSide === true
      || (field.serverSide !== false && field.type !== 'date-range' && field.type !== 'number-range' && field.type !== 'year');
    if (!isServer) continue;
    const value = values[field.key];
    if (isEmptyValue(value)) continue;
    const paramKey = field.apiParam || field.key;
    // Server-side ranges are flattened to <key>From/<key>To scalar params
    // (e.g. createdAt → createdAtFrom/createdAtTo, handled by crudFactory).
    if (field.type === 'date-range' || field.type === 'number-range') {
      if (value.from) params[`${paramKey}From`] = value.from;
      if (value.to) params[`${paramKey}To`] = value.to;
      continue;
    }
    params[paramKey] = value;
  }
  return params;
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Individual field renderers ────────────────────────────────────────────────
function StatusField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  const opts = field.options || STATUS_OPTIONS;
  const current = value ?? '';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {opts.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(String(opt.value) === current ? '' : String(opt.value))}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
              String(opt.value) === current
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  const opts = [{ value: '', label: `All ${field.label}` }, ...(field.options || [])];
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="form-select text-sm py-2"
      >
        {opts.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function DateRangeField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  return (
    <div className="col-span-1 sm:col-span-2">
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="date"
            value={value?.from ?? ''}
            onChange={(e) => onChange({ ...(value || {}), from: e.target.value })}
            className="form-input text-sm py-2 w-full"
          />
          <span className="text-xs text-gray-400 mt-0.5 block">From</span>
        </div>
        <div className="flex-1">
          <input
            type="date"
            value={value?.to ?? ''}
            onChange={(e) => onChange({ ...(value || {}), to: e.target.value })}
            className="form-input text-sm py-2 w-full"
          />
          <span className="text-xs text-gray-400 mt-0.5 block">To</span>
        </div>
      </div>
    </div>
  );
}

function NumberRangeField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          value={value?.min ?? ''}
          onChange={(e) => onChange({ ...(value || {}), min: e.target.value })}
          className="form-input text-sm py-2 flex-1"
          placeholder="Min"
        />
        <input
          type="number"
          value={value?.max ?? ''}
          onChange={(e) => onChange({ ...(value || {}), max: e.target.value })}
          className="form-input text-sm py-2 flex-1"
          placeholder="Max"
        />
      </div>
    </div>
  );
}

function YearField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const opts = [{ value: '', label: 'All Years' }, ...years.map((y) => ({ value: y, label: String(y) }))];
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="form-select text-sm py-2">
        {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </div>
  );
}

function BooleanField({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  const opts = field.options || BOOLEAN_OPTIONS;
  return <StatusField field={{ ...field, options: opts }} value={value} onChange={onChange} />;
}

function FieldRenderer({ field, value, onChange }: { field: FilterField; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case 'status':   return <StatusField field={field} value={value} onChange={onChange} />;
    case 'select':   return <SelectField field={field} value={value} onChange={onChange} />;
    case 'date-range': return <DateRangeField field={field} value={value} onChange={onChange} />;
    case 'number-range': return <NumberRangeField field={field} value={value} onChange={onChange} />;
    case 'year':     return <YearField field={field} value={value} onChange={onChange} />;
    case 'boolean':  return <BooleanField field={field} value={value} onChange={onChange} />;
    default:         return null;
  }
}

// ── Active filter chip ────────────────────────────────────────────────────────
function ActiveChip({ field, value, onRemove }: { field: FilterField; value: any; onRemove: () => void }) {
  let label = '';
  if (field.type === 'status') {
    const opts = field.options || STATUS_OPTIONS;
    label = opts.find((o) => String(o.value) === String(value))?.label || String(value);
  } else if (field.type === 'select' || field.type === 'boolean') {
    const opts = field.options || BOOLEAN_OPTIONS;
    label = opts.find((o) => String(o.value) === String(value))?.label || String(value);
  } else if (field.type === 'date-range') {
    const parts: string[] = [];
    if (value?.from) parts.push(`from ${value.from}`);
    if (value?.to) parts.push(`to ${value.to}`);
    label = parts.join(' ');
  } else if (field.type === 'number-range') {
    const parts: string[] = [];
    if (value?.min !== '' && value?.min !== undefined) parts.push(`min: ${value.min}`);
    if (value?.max !== '' && value?.max !== undefined) parts.push(`max: ${value.max}`);
    label = parts.join(', ');
  } else {
    label = String(value);
  }

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 border border-primary-200">
      <span className="font-medium">{field.label}:</span> {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-primary-100 p-0.5"
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── Main TableFilter component ────────────────────────────────────────────────
export default function TableFilter({
  fields,
  values,
  onChange,
  onReset,
  activeCount,
  loading,
  onApply,
}: TableFilterProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!fields.length) return null;

  const activeFields = fields.filter((f) => !isEmptyValue(values[f.key]));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2.5">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
          {collapsed
            ? <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            : <ChevronUpIcon className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Filter fields */}
      {!collapsed && (
        <>
          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
            {fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => onChange(field.key, v)}
              />
            ))}
          </div>

          {/* Footer: active chips + action buttons */}
          <div className="px-4 pb-3 border-t border-gray-100 pt-3 flex flex-col gap-2.5">
            {activeCount > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-400">Active:</span>
                {activeFields.map((field) => (
                  <ActiveChip
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    onRemove={() => onChange(field.key, '')}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 justify-end">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={() => { onApply?.(); setCollapsed(true); }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading…' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
