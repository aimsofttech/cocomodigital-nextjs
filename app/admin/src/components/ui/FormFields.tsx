import type { UseFormRegister, FieldErrors } from 'react-hook-form';

/* Plain register()-driven form controls shared by the section-based content
 * modules (Growth Services, Podcast). Kept here rather than inside one module
 * so a second module reuses them instead of copying them; module-specific
 * controls (parent-record pickers, icon lists) stay with their module.
 */

export interface SelectOption { value: string | number; label: string }

/** Labelled <select> bound to a fixed option list. */
export function SelectField({
  register, name, label, options, hint, required = false, errors,
}: {
  register: UseFormRegister<any>;
  name: string;
  label: string;
  options: SelectOption[];
  hint?: string;
  required?: boolean;
  errors?: FieldErrors<any>;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <select {...register(name, required ? { required: 'Required' } : {})} className="form-select">
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {errors?.[name] && <p className="form-error">{String(errors[name]?.message)}</p>}
    </div>
  );
}

/** Text input with optional required validation. */
export function TextField({
  register, name, label, placeholder, required = false, errors, hint, type = 'text',
  readOnly = false,
}: {
  register: UseFormRegister<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  errors?: FieldErrors<any>;
  hint?: string;
  type?: string;
  /* Show the value but refuse edits. Deliberately `readOnly` rather than
     `disabled`: a disabled input is dropped from the submitted payload, which
     would silently blank the field on save. A read-only one still round-trips. */
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        {...register(name, required && !readOnly ? { required: 'Required' } : {})}
        type={type}
        readOnly={readOnly}
        className={`form-input${readOnly ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
        placeholder={readOnly ? undefined : placeholder}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {errors?.[name] && <p className="form-error">{String(errors[name]?.message)}</p>}
    </div>
  );
}

/** Multi-line input. Used for both prose and the one-entry-per-line lists. */
export function TextAreaField({
  register, name, label, placeholder, required = false, errors, hint, rows = 3,
}: {
  register: UseFormRegister<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  errors?: FieldErrors<any>;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        {...register(name, required ? { required: 'Required' } : {})}
        rows={rows}
        className="form-textarea"
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {errors?.[name] && <p className="form-error">{String(errors[name]?.message)}</p>}
    </div>
  );
}

/** Display Order + Status pair — the last row of every child form. */
export function OrderAndStatus({ register }: { register: UseFormRegister<any> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="form-label">Display Order</label>
        <input {...register('displayOrder')} type="number" className="form-input" placeholder="0" />
      </div>
      <div>
        <label className="form-label">Status</label>
        <select {...register('status')} className="form-select">
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
    </div>
  );
}

/** Cancel / Save footer. */
export function FormActions({
  onCancel, isSubmitting,
}: { onCancel: () => void; isSubmitting: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
      <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
