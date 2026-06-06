import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { marketingHouseStaticsApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function HighlightsForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      marketingHouseStaticsApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && id) await marketingHouseStaticsApi.update(id, data);
      else await marketingHouseStaticsApi.create(data);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
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
