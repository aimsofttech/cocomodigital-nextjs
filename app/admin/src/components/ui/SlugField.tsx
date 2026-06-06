import { useEffect, useRef } from 'react';
import type { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { slugify } from '@/utils/slugify';

// Fields we derive the slug from, in priority order (matches the API heuristic).
const SOURCE_KEYS = ['name', 'title', 'heading', 'question'];

function pickSource(values: Record<string, any>): string {
  for (const k of SOURCE_KEYS) {
    if (values?.[k] && String(values[k]).trim()) return String(values[k]);
  }
  const key = Object.keys(values || {}).find(
    (k) => /(_name|_title|_heading)$/.test(k) && values[k] && String(values[k]).trim()
  );
  return key ? String(values[key]) : '';
}

interface Props {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  /** Edit mode: never auto-overwrite the loaded slug (admin can still edit it). */
  isEdit?: boolean;
  label?: string;
  /** Field name to register (defaults to "slug"). */
  name?: string;
}

/**
 * URL-friendly slug input.
 * - Create mode: live auto-generates a slugified value from the name/title field.
 * - Manual edit: once the admin types in the slug, auto-generation stops and the
 *   value is normalised (slugified) on blur.
 * - Edit mode: the existing slug is preserved; the admin can change it freely.
 */
export default function SlugField({
  register,
  watch,
  setValue,
  isEdit = false,
  label = 'Slug',
  name = 'slug',
}: Props) {
  const manualRef = useRef<boolean>(isEdit);
  const values = watch();
  const source = pickSource(values);
  const currentSlug = watch(name);
  const reg = register(name);

  useEffect(() => {
    if (manualRef.current) return;
    const auto = slugify(source);
    if (auto !== (currentSlug || '')) {
      setValue(name, auto, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        {...reg}
        onChange={(e) => {
          manualRef.current = true;
          reg.onChange(e);
        }}
        onBlur={(e) => {
          reg.onBlur(e);
          setValue(name, slugify(e.target.value), { shouldDirty: true });
        }}
        className="form-input"
        placeholder="auto-generated from name — you can edit it"
      />
      <p className="mt-1 text-xs text-gray-500">
        URL-friendly identifier. Auto-filled from the name; edit to override. Must be unique.
      </p>
    </div>
  );
}
