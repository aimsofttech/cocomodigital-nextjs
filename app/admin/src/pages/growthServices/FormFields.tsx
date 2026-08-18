import { useEffect, useState } from 'react';
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { ICON_OPTIONS, useGrowthServiceOptions } from './constants';

/* Form controls shared by the seven child forms in this module. Everything is
 * a plain register()-driven input so the forms stay consistent with the rest of
 * the admin panel. */

interface SelectOption { value: string | number; label: string }

/**
 * The "which page does this belong to?" dropdown.
 *
 * A select's value can't be applied before its <option> list has rendered — it
 * silently falls back to the placeholder — so both the edit value and the
 * URL-scoped value are re-applied once the options land.
 */
export function ServiceSelect({
  register, setValue, errors, lockedServiceId, editValue, isEdit,
}: {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
  lockedServiceId?: string;
  /** Value loaded from the record being edited. */
  editValue?: string;
  isEdit?: boolean;
}) {
  const { services } = useGrowthServiceOptions();

  useEffect(() => {
    if (!services.length) return;
    const value = isEdit ? editValue : lockedServiceId;
    if (value) setValue('growthServiceId', value);
  }, [services, isEdit, editValue, lockedServiceId, setValue]);

  return (
    <div>
      <label className="form-label">
        Growth Service <span className="text-red-500">*</span>
      </label>
      <select
        {...register('growthServiceId', { required: lockedServiceId ? false : 'Required' })}
        className="form-select disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
        disabled={Boolean(lockedServiceId)}
        title={lockedServiceId ? 'Locked to the service this list was opened from' : undefined}
      >
        <option value="">Select a growth service</option>
        {services.map((s) => (
          <option key={s._id} value={s._id}>{s.name}</option>
        ))}
      </select>
      {errors.growthServiceId && (
        <p className="form-error">{String(errors.growthServiceId.message)}</p>
      )}
    </div>
  );
}

/**
 * Icon picker. Values are registry names the web app maps to a React component;
 * anything not in the list renders without an icon, so this is a closed select
 * rather than free text.
 */
export function IconSelect({
  register, name = 'icon', label = 'Icon', required = false, hint,
}: {
  register: UseFormRegister<any>;
  name?: string;
  label?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <select {...register(name, required ? { required: 'Required' } : {})} className="form-select">
        <option value="">No icon</option>
        {ICON_OPTIONS.map((icon) => (
          <option key={icon} value={icon}>{icon}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        {hint || 'Icon shown on the card. Names come from the site’s icon set.'}
      </p>
    </div>
  );
}

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
}: {
  register: UseFormRegister<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  errors?: FieldErrors<any>;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        {...register(name, required ? { required: 'Required' } : {})}
        type={type}
        className="form-input"
        placeholder={placeholder}
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

/** Display Order + Status pair — the last row of every form in this module. */
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

/**
 * Shared load/submit plumbing for a child form.
 *
 * Loads the record in edit mode, normalises `status` to the string the select
 * expects, and folds the URL-scoped service id into the payload so a row
 * created from a scoped list always lands on the right page.
 */
export function useChildForm({
  api, id, isEdit, lockedServiceId, reset, onLoaded,
}: {
  api: { getOne?: (id: string) => Promise<any>; create?: (d: any) => Promise<any>; update?: (id: string, d: any) => Promise<any> };
  id?: string;
  isEdit: boolean;
  lockedServiceId?: string;
  reset: (values: any) => void;
  onLoaded?: (data: any) => void;
}) {
  // State rather than a ref: ServiceSelect re-applies the value in an effect
  // keyed on it, which only fires if the change is rendered.
  const [loadedServiceId, setLoadedServiceId] = useState('');

  useEffect(() => {
    if (!isEdit || !id || !api.getOne) return;
    api.getOne(id)
      .then(({ data }) => {
        const record = data.data;
        const parentId = record.growthServiceId ? String(record.growthServiceId) : '';
        setLoadedServiceId(parentId);
        reset({
          ...record,
          status: String(record.status ?? 1),
          growthServiceId: parentId,
        });
        onLoaded?.(record);
      })
      .catch(() => { /* the API layer already surfaces the error toast */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const submit = async (values: any) => {
    const payload = {
      ...values,
      growthServiceId: values.growthServiceId || lockedServiceId,
    };
    if (isEdit && id && api.update) return api.update(id, payload);
    if (api.create) return api.create(payload);
    throw new Error('This record cannot be saved');
  };

  return { loadedServiceId, submit };
}
