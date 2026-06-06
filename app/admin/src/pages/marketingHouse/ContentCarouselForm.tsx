import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { marketingHouseContentCarouselApi, marketingHouseContentItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ContentCarouselForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<any>();

  useEffect(() => {
    marketingHouseContentItemApi.getAll({ limit: 100 }).then(({ data }) => setContentItems(data.data || []));
    if (isEdit && id) {
      marketingHouseContentCarouselApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    if (itemId) fd.append('marketing_house_item_id', itemId);
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await marketingHouseContentCarouselApi.update(id, fd);
      else await marketingHouseContentCarouselApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Content Item</label>
        <select {...register('content_created_item_id')} className="form-select">
          <option value="">Select content item</option>
          {contentItems.map((c: any) => <option key={c._id} value={c._id}>{c.item_title || c._id}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Carousel Title</label><input {...register('carousel_title')} className="form-input" /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <ImageUpload name="carousel_image" label="Carousel Image" uploadType="image" folder="marketing-house" value={watch('carousel_image')} onChange={(url) => setValue('carousel_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Content Carousel' : 'Add Content Carousel'} breadcrumbs={[{ label: 'Content Carousel', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
