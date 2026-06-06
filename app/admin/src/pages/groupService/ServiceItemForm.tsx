import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupServiceItemApi, groupServiceCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ServiceItemForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    groupServiceCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      groupServiceItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status), group_service_category_id: item.group_service_category_id?._id || item.group_service_category_id });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await groupServiceItemApi.update(id, formData);
      else await groupServiceItemApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Category <span className="text-red-500">*</span></label>
        <select {...register('group_service_category_id', { required: 'Required' })} className="form-select">
          <option value="">Select category</option>
          {categories.map((c: any) => <option key={c._id} value={c._id}>{c.group_service_category_name}</option>)}
        </select>
        {errors.group_service_category_id && <p className="form-error">{String(errors.group_service_category_id.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('group_service_item_title', { required: 'Required' })} className="form-input" />
          {errors.group_service_item_title && <p className="form-error">{String(errors.group_service_item_title.message)}</p>}
        </div>
        <div><label className="form-label">Slug</label><input {...register('group_service_item_slug')} className="form-input" placeholder="e.g. service-item-slug" /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Description</label><textarea {...register('group_service_item_description')} className="form-textarea" /></div>
      <ImageUpload name="group_service_item_thumbnail" label="Thumbnail" uploadType="image" folder="group-service" value={watch('group_service_item_thumbnail')} onChange={(url) => setValue('group_service_item_thumbnail', url)} />
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
      <PageHeader title={isEdit ? 'Edit Group Service Item' : 'Add Group Service Item'} breadcrumbs={[{ label: 'Group Service Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
