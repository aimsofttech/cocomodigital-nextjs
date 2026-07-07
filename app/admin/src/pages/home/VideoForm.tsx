import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { videoApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

export default function VideoForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      videoApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await videoApi.update(id, formData);
      else await videoApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/home/video');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Video <span className="text-red-500">*</span></label>
        <ImageUpload name="url" uploadType="video" folder="home/videos" value={watch('url')} onChange={(url) => setValue('url', url, { shouldValidate: true, shouldDirty: true })} />
        <input {...register('url', { required: 'Required' })} className="form-input mt-2" placeholder="Or paste a video URL (https://youtube.com/...)" />
        {errors.url && <p className="form-error">{String(errors.url.message)}</p>}
      </div>
      <ImageUpload name="thumbnail" label="Video Thumbnail" recommended={{ width: 1920, height: 1080, ratio: '16:9', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }} uploadType="image" folder="home" value={watch('thumbnail')} onChange={(url) => setValue('thumbnail', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/home/video')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Video' : 'Add Video'}
        breadcrumbs={[{ label: 'Videos', path: '/home/video' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
