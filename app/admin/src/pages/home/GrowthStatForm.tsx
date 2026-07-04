import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { growthStatApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

/* "Growth at a glance" stat tile. The homepage animates a count-up on
   the numeric part, so the number is stored separately from its
   prefix/suffix: the tile renders `${prefix}${value}${suffix}` (e.g.
   "$" + 600 + "K+" → "$600K+") above the label. */
export default function GrowthStatForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      growthStatApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      const payload = {
        prefix: formData.prefix || '',
        value: Number(formData.value),
        suffix: formData.suffix || '',
        label: formData.label,
        displayOrder: Number(formData.displayOrder) || 0,
        status: Number(formData.status),
      };
      if (isEdit && id) await growthStatApi.update(id, payload);
      else await growthStatApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate('/home/growth-stats');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const preview = `${watch('prefix') || ''}${watch('value') ?? ''}${watch('suffix') || ''}`;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Prefix</label>
          <input {...register('prefix')} className="form-input" placeholder="e.g. $" />
        </div>
        <div>
          <label className="form-label">Value <span className="text-red-500">*</span></label>
          <input {...register('value', { required: 'Required' })} type="number" step="any" className="form-input" placeholder="e.g. 45" />
          {errors.value && <p className="form-error">{String(errors.value.message)}</p>}
        </div>
        <div>
          <label className="form-label">Suffix</label>
          <input {...register('suffix')} className="form-input" placeholder="e.g. M+, B+, K+, %" />
        </div>
      </div>
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
        Displays as: <span className="font-semibold text-gray-900">{preview || '—'}</span>
      </div>
      <div>
        <label className="form-label">Label <span className="text-red-500">*</span></label>
        <input {...register('label', { required: 'Required' })} className="form-input" placeholder="e.g. Subscribers Built" />
        {errors.label && <p className="form-error">{String(errors.label.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select" defaultValue="1"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/home/growth-stats')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Growth Number' : 'Add Growth Number'}
        breadcrumbs={[{ label: 'Home' }, { label: 'Growth Numbers', path: '/home/growth-stats' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
