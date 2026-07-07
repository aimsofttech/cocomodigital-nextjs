import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { successStoriesApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function SuccessStoriesForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      successStoriesApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await successStoriesApi.update(id, formData);
      else await successStoriesApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Title <span className="text-red-500">*</span></label>
        <input {...register('success_stories_title', { required: 'Required' })} className="form-input" placeholder="Enter success story title" />
        {errors.success_stories_title && <p className="form-error">{String(errors.success_stories_title.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Description</label><textarea {...register('success_stories_description')} className="form-textarea" placeholder="Write a short description…" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">URL</label><input {...register('success_stories_url')} className="form-input" placeholder="https://..." /></div>
      </div>
      <ImageUpload name="success_stories_img" label="Story Image" recommended={{ width: 1200, height: 800, ratio: '3:2', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }} uploadType="image" folder="group-service" value={watch('success_stories_img')} onChange={(url) => setValue('success_stories_img', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Success Stories' : 'Add Success Stories'} breadcrumbs={[{ label: 'Success Stories', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
