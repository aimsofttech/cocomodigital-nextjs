import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { bannerTitleTemplateApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function BannerTitleForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      bannerTitleTemplateApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await bannerTitleTemplateApi.update(id, formData);
      else await bannerTitleTemplateApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Banner Title <span className="text-red-500">*</span></label>
          <input {...register('banner_title', { required: 'Required' })} className="form-input" placeholder="Enter banner title" />
          {errors.banner_title && <p className="form-error">{String(errors.banner_title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
        <div><label className="form-label">Banner Name</label><input {...register('banner_name')} className="form-input" placeholder="Enter banner name" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Subtitle</label><input {...register('banner_subtitle')} className="form-input" placeholder="Enter subtitle" /></div>
        <div><label className="form-label">Page Name</label><input {...register('page_name')} className="form-input" placeholder="e.g. Home" /></div>
      </div>
      <ImageUpload name="banner_bg_img" label="Banner Background Image" recommended={{ width: 1920, height: 800, ratio: '12:5', formats: 'JPG, PNG, WebP', maxSizeMB: 2, note: 'full-width banner background' }} uploadType="image" folder="templates" value={watch('banner_bg_img')} onChange={(url) => setValue('banner_bg_img', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
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
      <PageHeader title={isEdit ? 'Edit Banner Title' : 'Add Banner Title'} breadcrumbs={[{ label: 'Banner Titles', path: '/templates/banner-title' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
