import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creativeHouseProjectApi, creativeHouseItemApi, creativeHouseCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ProjectForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    creativeHouseItemApi.getAll({ limit: 100 }).then(({ data }) => setItems(data.data || []));
    creativeHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      creativeHouseProjectApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status), creative_house_item_id: item.creative_house_item_id?._id || item.creative_house_item_id, creative_house_category_id: item.creative_house_category_id?._id || item.creative_house_category_id });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await creativeHouseProjectApi.update(id, fd);
      else await creativeHouseProjectApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Creative Item (Optional)</label>
          <select {...register('creative_house_item_id')} className="form-select">
            <option value="">None</option>
            {items.map((i: any) => <option key={i._id} value={i._id}>{i.creative_house_title}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Creative Category (Optional)</label>
          <select {...register('creative_house_category_id')} className="form-select">
            <option value="">None</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.creative_house_category_name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Project Title <span className="text-red-500">*</span></label>
        <input {...register('project_title', { required: 'Required' })} className="form-input" placeholder="Enter project title" />
        {errors.project_title && <p className="form-error">{String(errors.project_title.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Description</label><textarea {...register('project_description')} className="form-textarea" placeholder="Write a short description…" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Video URL</label><input {...register('project_video_url')} className="form-input" placeholder="https://youtube.com/..." /></div>
      </div>
      <ImageUpload name="project_image" label="Project Image" uploadType="image" folder="creative-house" value={watch('project_image')} onChange={(url) => setValue('project_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Creative Project' : 'Add Creative Project'} breadcrumbs={[{ label: 'Creative Project', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
