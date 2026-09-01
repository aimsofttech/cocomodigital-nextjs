import { useEffect, useState } from 'react';
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { ICON_OPTIONS, usePodcastPageOptions } from './constants';

/* Podcast-specific form controls. The generic ones (TextField, TextAreaField,
 * SelectField, OrderAndStatus, FormActions) come from components/ui/FormFields
 * and are re-exported here so a form imports everything from one place.
 */

export {
  SelectField,
  TextField,
  TextAreaField,
  OrderAndStatus,
  FormActions,
} from '@/components/ui/FormFields';

/**
 * The "which page does this belong to?" dropdown.
 *
 * A select's value can't be applied before its <option> list has rendered — it
 * silently falls back to the placeholder — so both the edit value and the
 * URL-scoped value are re-applied once the options land.
 */
export function PodcastPageSelect({
  register, setValue, errors, lockedPageId, editValue, isEdit,
}: {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
  lockedPageId?: string;
  /** Value loaded from the record being edited. */
  editValue?: string;
  isEdit?: boolean;
}) {
  const { pages } = usePodcastPageOptions();

  useEffect(() => {
    if (!pages.length) return;
    const value = isEdit ? editValue : lockedPageId;
    if (value) setValue('podcastPageId', value);
  }, [pages, isEdit, editValue, lockedPageId, setValue]);

  return (
    <div>
      <label className="form-label">
        Podcast Page <span className="text-red-500">*</span>
      </label>
      <select
        {...register('podcastPageId', { required: lockedPageId ? false : 'Required' })}
        className="form-select disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
        disabled={Boolean(lockedPageId)}
        title={lockedPageId ? 'Locked to the page this list was opened from' : undefined}
      >
        <option value="">Select a podcast page</option>
        {pages.map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>
      {errors.podcastPageId && (
        <p className="form-error">{String(errors.podcastPageId.message)}</p>
      )}
    </div>
  );
}

/**
 * Icon picker. Values are registry names the web app maps to an inline SVG;
 * anything not in the list renders without an icon, so this is a closed select
 * rather than free text.
 */
export function PodcastIconSelect({
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
          <option key={icon.value} value={icon.value}>{icon.label}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        {hint || 'Icon shown on the card. Names come from the page’s own icon set.'}
      </p>
    </div>
  );
}

/**
 * Shared load/submit plumbing for a child form.
 *
 * Loads the record in edit mode, normalises `status` to the string the select
 * expects, and folds the URL-scoped page id and section key into the payload so
 * a row created from a scoped list always lands in the right band.
 */
export function usePodcastChildForm({
  api, id, isEdit, lockedPageId, lockedSectionKey, reset, onLoaded,
}: {
  api: { getOne?: (id: string) => Promise<any>; create?: (d: any) => Promise<any>; update?: (id: string, d: any) => Promise<any> };
  id?: string;
  isEdit: boolean;
  lockedPageId?: string;
  lockedSectionKey?: string;
  reset: (values: any) => void;
  onLoaded?: (data: any) => void;
}) {
  // State rather than a ref: PodcastPageSelect re-applies the value in an
  // effect keyed on it, which only fires if the change is rendered.
  const [loadedPageId, setLoadedPageId] = useState('');

  useEffect(() => {
    if (!isEdit || !id || !api.getOne) return;
    api.getOne(id)
      .then(({ data }) => {
        const record = data.data;
        const parentId = record.podcastPageId ? String(record.podcastPageId) : '';
        setLoadedPageId(parentId);
        reset({
          ...record,
          status: String(record.status ?? 1),
          podcastPageId: parentId,
        });
        onLoaded?.(record);
      })
      .catch(() => { /* the API layer already surfaces the error toast */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const submit = async (values: any) => {
    const payload = {
      ...values,
      podcastPageId: values.podcastPageId || lockedPageId,
    };
    // A list opened from a band's button creates rows into that band, even
    // though the form hides the section select.
    if (!payload.sectionKey && lockedSectionKey) payload.sectionKey = lockedSectionKey;
    if (isEdit && id && api.update) return api.update(id, payload);
    if (api.create) return api.create(payload);
    throw new Error('This record cannot be saved');
  };

  return { loadedPageId, submit };
}
