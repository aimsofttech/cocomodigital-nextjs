import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { marketingHouseStaticsApi, marketingHouseItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Marketing Campaign), the item is preselected and locked. */
  lockedItemId?: string;
}

const itemLabel = (it: any) => it?.title || it?.title || it?.slug || it?._id || '';

export default function HighlightsForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [items, setItems] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  // Marketing items for the dropdown (and to resolve the locked item's name).
  useEffect(() => {
    marketingHouseItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || [])).catch(() => {});
  }, []);

  // Load the highlight on edit; otherwise seed the locked item id on create.
  useEffect(() => {
    if (isEdit && id) {
      marketingHouseStaticsApi.getOne(id).then(({ data }) => {
        const rec = data.data || {};
        reset({
          ...rec,
          status: String(rec.status ?? 1),
          marketingHouseItemId: rec.marketingHouseItemId ?? lockedItemId ?? '',
        });
      }).catch(() => toast.error('Failed to load'));
    } else if (lockedItemId) {
      setValue('marketingHouseItemId', lockedItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep the locked value applied (e.g. opening the add modal).
  useEffect(() => {
    if (lockedItemId) setValue('marketingHouseItemId', lockedItemId);
  }, [lockedItemId, setValue]);

  const onSubmit = async (formData: any) => {
    // Always carry the relationship; force the locked id when present.
    const payload = { ...formData };
    if (lockedItemId) payload.marketingHouseItemId = lockedItemId;
    try {
      if (isEdit && id) await marketingHouseStaticsApi.update(id, payload);
      else await marketingHouseStaticsApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const selectedId = watch('marketingHouseItemId');
  const lockedName = itemLabel(items.find((it) => String(it._id) === String(lockedItemId))) || lockedItemId;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Marketing Campaign relationship */}
      <div>
        <label className="form-label">Marketing Campaign <span className="text-red-500">*</span></label>
        {lockedItemId ? (
          <>
            <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName} disabled readOnly />
            {/* Keep the value in submitted form state even though the select is hidden. */}
            <input type="hidden" {...register('marketingHouseItemId')} />
            <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Campaign.</p>
          </>
        ) : (
          <>
            <select {...register('marketingHouseItemId', { required: 'Required' })} className="form-select">
              <option value="">Select Marketing Campaign</option>
              {items.map((it: any) => <option key={it._id} value={it._id}>{itemLabel(it)}</option>)}
            </select>
            {errors.marketingHouseItemId && <p className="form-error">{String(errors.marketingHouseItemId.message)}</p>}
            {selectedId && !items.some((it) => String(it._id) === String(selectedId)) && (
              <p className="mt-1 text-xs text-amber-600">Currently linked item is not in the list (legacy reference): {String(selectedId)}</p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Name <span className="text-red-500">*</span></label>
          <input {...register('name', { required: 'Required' })} className="form-input" placeholder="e.g. Platform" />
          {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
        </div>
        <div>
          <label className="form-label">Value</label>
          <input {...register('value')} className="form-input" placeholder="e.g. 100+" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Highlight' : 'Add Highlight'} breadcrumbs={[{ label: 'Highlights', path: '/marketing/highlights' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
