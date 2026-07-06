import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHouseContentCarouselApi, marketingHouseContentItemApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

// Item records expose their name under `title` (or legacy `title`).
const itemName = (it: any) => it.title || it.title || 'Untitled';

export default function ContentCarouselModuleForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketingHouseCategoryId');

  // Load all categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load content items (deeper cascade select) once.
  useEffect(() => {
    marketingHouseContentItemApi.getAll({ limit: 100 }).then(({ data }) => setContentItems(data.data || []))
      .catch(() => toast.error('Failed to load content items'));
  }, []);

  // Load the existing record when editing.
  useEffect(() => {
    if (isEdit && editId) {
      marketingHouseContentCarouselApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          marketingHouseCategoryId: rec.marketingHouseCategoryId ? String(rec.marketingHouseCategoryId) : '',
          marketingHouseItemId: rec.marketingHouseItemId ? String(rec.marketingHouseItemId) : '',
          content_created_item_id: rec.content_created_item_id ? String(rec.content_created_item_id) : '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [editId]);

  // Load the items belonging to the selected category (item selector options).
  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    marketingHouseItemApi.getAll({ marketingHouseCategoryId: selectedCategory, limit: 200 })
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error('Failed to load items'));
  }, [selectedCategory]);

  // When locked to a specific Marketing Campaign, pin the value and fetch its name.
  useEffect(() => {
    if (!lockedItemId) return;
    setValue('marketingHouseItemId', lockedItemId);
    marketingHouseItemApi.getOne(lockedItemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.title || lockedItemId))
      .catch(() => setLockedName(lockedItemId));
  }, [lockedItemId, setValue]);

  const categoryReg = register('marketingHouseCategoryId', lockedItemId ? {} : { required: 'Required' });

  const onSubmit = async (formData: any) => {
    if (lockedItemId) formData.marketingHouseItemId = lockedItemId;
    if (!lockedItemId && !formData.marketingHouseItemId) { toast.error('Please select an item'); return; }
    const fd = new FormData();
    fd.append('marketingHouseItemId', formData.marketingHouseItemId);
    ['content_created_item_id', 'carousel_title', 'image', 'slug', 'displayOrder', 'status'].forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== '') fd.append(k, String(formData[k]));
    });
    try {
      if (isEdit && editId) await marketingHouseContentCarouselApi.update(editId, fd);
      else await marketingHouseContentCarouselApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      onSuccess?.();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {lockedItemId ? (
        <div>
          <label className="form-label">Marketing Campaign <span className="text-red-500">*</span></label>
          <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || lockedItemId} disabled readOnly />
          <input type="hidden" {...register('marketingHouseItemId')} />
          <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Campaign.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Category <span className="text-red-500">*</span></label>
            <select
              {...categoryReg}
              onChange={(e) => { categoryReg.onChange(e); setValue('marketingHouseItemId', ''); }}
              className="form-select"
            >
              <option value="">Select category</option>
              {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.name}</option>)}
            </select>
            {errors.marketingHouseCategoryId && <p className="form-error">{String(errors.marketingHouseCategoryId.message)}</p>}
          </div>
          <div>
            <label className="form-label">Item <span className="text-red-500">*</span></label>
            <select {...register('marketingHouseItemId', { required: 'Required' })} className="form-select" disabled={!selectedCategory}>
              <option value="">{selectedCategory ? 'Select item' : 'Select a category first'}</option>
              {items.map((it: any) => <option key={it._id} value={it._id}>{itemName(it)}</option>)}
            </select>
            {errors.marketingHouseItemId && <p className="form-error">{String(errors.marketingHouseItemId.message)}</p>}
          </div>
        </div>
      )}
      <div>
        <label className="form-label">Content Item</label>
        <select {...register('content_created_item_id')} className="form-select">
          <option value="">Select content item</option>
          {contentItems.map((c: any) => <option key={c._id} value={c._id}>{c.item_title || c._id}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Carousel Title</label><input {...register('carousel_title')} className="form-input" placeholder="Enter carousel title" /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <ImageUpload name="image" label="Carousel Image" uploadType="image" folder="marketing-house" value={watch('image')} onChange={(url) => setValue('image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel?.()} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}
