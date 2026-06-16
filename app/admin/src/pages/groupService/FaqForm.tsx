import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupServiceItemFaqApi, groupServiceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

export default function FaqForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const scopedItemId = lockedItemId || itemId || '';
  const [items, setItems] = useState<any[]>([]);
  const editItemId = useRef('');
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || []));
    if (isEdit && id) {
      groupServiceItemFaqApi.getOne(id).then(({ data }) => {
        editItemId.current = data.data.group_service_item_id ? String(data.data.group_service_item_id) : '';
        reset({ ...data.data, status: String(data.data.status), group_service_item_id: editItemId.current });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected item once options are loaded (a select value set before
  // its options render reverts to the placeholder otherwise).
  useEffect(() => {
    if (isEdit && items.length && editItemId.current) setValue('group_service_item_id', editItemId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isEdit]);

  // Preselect the scoped item once options are loaded (avoids the select reverting to placeholder).
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !scopedItemId || !items.length || lockedApplied.current) return;
    setValue('group_service_item_id', scopedItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedItemId, isEdit, items]);

  const onSubmit = async (data: any) => {
    const payload = { ...data, group_service_item_id: data.group_service_item_id || scopedItemId };
    try {
      if (isEdit && id) await groupServiceItemFaqApi.update(id, payload);
      else await groupServiceItemFaqApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Group Service Item <span className="text-red-500">*</span></label>
        <select {...register('group_service_item_id', { required: 'Required' })} className="form-select">
          <option value="">Select service item</option>
          {items.map((it: any) => <option key={it._id} value={it._id}>{it.group_service_item_title}</option>)}
        </select>
        {errors.group_service_item_id && <p className="form-error">{String(errors.group_service_item_id.message)}</p>}
      </div>
      <div>
        <label className="form-label">Question <span className="text-red-500">*</span></label>
        <input {...register('question', { required: 'Required' })} className="form-input" placeholder="Enter the question" />
        {errors.question && <p className="form-error">{String(errors.question.message)}</p>}
      </div>
      <div>
        <label className="form-label">Answer <span className="text-red-500">*</span></label>
        <textarea {...register('answer', { required: 'Required' })} className="form-textarea min-h-28" placeholder="Write a short description…" />
        {errors.answer && <p className="form-error">{String(errors.answer.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Group Service FAQ' : 'Add Group Service FAQ'} breadcrumbs={[{ label: 'Group Service FAQ', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
