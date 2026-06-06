import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creativeHouseItemApi, creativeHouseCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ItemForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    creativeHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      setLoading(true);
      creativeHouseItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status), creative_house_category_id: item.creative_house_category_id?._id || item.creative_house_category_id });
      }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await creativeHouseItemApi.update(id, fd);
      else await creativeHouseItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Category <span className="text-red-500">*</span></label>
        <select {...register('creative_house_category_id', { required: 'Required' })} className="form-select">
          <option value="">Select category</option>
          {categories.map((c: any) => <option key={c._id} value={c._id}>{c.creative_house_category_name}</option>)}
        </select>
        {errors.creative_house_category_id && <p className="form-error">{String(errors.creative_house_category_id.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('creative_house_title', { required: 'Required' })} className="form-input" />
          {errors.creative_house_title && <p className="form-error">{String(errors.creative_house_title.message)}</p>}
        </div>
        <div><label className="form-label">Slug</label><input {...register('creative_house_slug')} className="form-input" placeholder="e.g. creative-item-slug" /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Video URL</label><input {...register('creative_house_video_url')} className="form-input" placeholder="https://youtube.com/..." /></div>
      <div><label className="form-label">Description</label><textarea {...register('creative_house_description')} className="form-textarea" /></div>
      <ImageUpload name="creative_house_thumbnail" label="Thumbnail" uploadType="image" folder="creative-house" value={watch('creative_house_thumbnail')} onChange={(url) => setValue('creative_house_thumbnail', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Creative Item' : 'Add Creative Item'} breadcrumbs={[{ label: 'Creative Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
