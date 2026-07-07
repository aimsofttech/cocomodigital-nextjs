import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupPortfolioCategoryApi, groupServiceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

export default function PortfolioCategoryForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const scopedItemId = lockedItemId || itemId || '';
  const [items, setItems] = useState<any[]>([]);
  const editItemId = useRef('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || []));
    if (isEdit && id) {
      groupPortfolioCategoryApi.getOne(id).then(({ data }) => {
        editItemId.current = data.data.groupServiceItemId ? String(data.data.groupServiceItemId) : '';
        reset({ ...data.data, status: String(data.data.status), groupServiceItemId: editItemId.current });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected item once options are loaded (avoids placeholder revert).
  useEffect(() => {
    if (isEdit && items.length && editItemId.current) setValue('groupServiceItemId', editItemId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isEdit]);

  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !scopedItemId || !items.length || lockedApplied.current) return;
    setValue('groupServiceItemId', scopedItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedItemId, isEdit, items]);

  const onSubmit = async (data: any) => {
    const payload = { ...data, groupServiceItemId: data.groupServiceItemId || scopedItemId };
    try {
      if (isEdit && id) await groupPortfolioCategoryApi.update(id, payload);
      else await groupPortfolioCategoryApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Group Service Item <span className="text-red-500">*</span></label>
        <select
          {...register('groupServiceItemId', { required: scopedItemId ? false : 'Required' })}
          className="form-select disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={Boolean(scopedItemId)}
          title={scopedItemId ? 'Locked to the current group service item' : undefined}
        >
          <option value="">Select service item</option>
          {items.map((it: any) => <option key={it._id} value={it._id}>{it.title}</option>)}
        </select>
        {errors.groupServiceItemId && <p className="form-error">{String(errors.groupServiceItemId.message)}</p>}
      </div>
      <div>
        <label className="form-label">Category Name <span className="text-red-500">*</span></label>
        <input {...register('name', { required: 'Required' })} className="form-input" placeholder="Enter category name" />
        {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Portfolio Category' : 'Add Portfolio Category'} breadcrumbs={[{ label: 'Portfolio Category', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
