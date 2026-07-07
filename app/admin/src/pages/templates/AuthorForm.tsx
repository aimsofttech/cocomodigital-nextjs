import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authorTemplateApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function AuthorForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      authorTemplateApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await authorTemplateApi.update(id, formData);
      else await authorTemplateApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Author Name <span className="text-red-500">*</span></label>
          <input {...register('name', { required: 'Required' })} className="form-input" placeholder="Enter author name" />
          {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
        <div><label className="form-label">Designation</label><input {...register('designation')} className="form-input" placeholder="e.g. Content Writer" /></div>
      </div>
      <div><label className="form-label">Bio</label><textarea {...register('bio')} className="form-textarea" placeholder="Write a short bio…" /></div>
      <ImageUpload name="image" label="Author Photo" recommended={{ width: 256, height: 256, ratio: '1:1', formats: 'JPG, PNG, WebP', maxSizeMB: 1, note: 'shown as a circular avatar — exact square matters' }} uploadType="image" folder="templates" value={watch('image')} onChange={(url) => setValue('image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
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
      <PageHeader title={isEdit ? 'Edit Author Template' : 'Add Author Template'} breadcrumbs={[{ label: 'Author Templates', path: '/templates/author' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
