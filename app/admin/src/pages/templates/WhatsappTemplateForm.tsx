import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { whatsappTemplateApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function WhatsappTemplateForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      whatsappTemplateApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && id) await whatsappTemplateApi.update(id, data);
      else await whatsappTemplateApi.create(data);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Template Name <span className="text-red-500">*</span></label>
          <input {...register('template_name', { required: 'Required' })} className="form-input" />
          {errors.template_name && <p className="form-error">{String(errors.template_name.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
        <div><label className="form-label">Template Type</label><input {...register('template_type')} className="form-input" placeholder="e.g. promotional, transactional" /></div>
      </div>
      <div>
        <label className="form-label">Template Body <span className="text-red-500">*</span></label>
        <textarea {...register('template_body', { required: 'Required' })} className="form-textarea min-h-28" placeholder="Enter template message content..." />
        {errors.template_body && <p className="form-error">{String(errors.template_body.message)}</p>}
      </div>
      <div>
        <label className="form-label">Status</label>
        <select {...register('status')} className="form-select">
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Edit WhatsApp Template' : 'Add WhatsApp Template'} breadcrumbs={[{ label: 'WhatsApp Templates', path: '/templates/whatsapp' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
