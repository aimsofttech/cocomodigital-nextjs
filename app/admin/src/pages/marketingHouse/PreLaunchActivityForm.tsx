import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHousePreLaunchApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

// Item records expose their name under `title` (or legacy `marketing_house_title`).
const itemName = (it: any) => it.title || it.marketing_house_title || 'Untitled';

export default function PreLaunchActivityForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketing_house_category_id');

  // Load all categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load the existing record when editing (the API response already includes the
  // resolved category id via the backend lookup, so we can prefill both selects).
  useEffect(() => {
    if (isEdit && editId) {
      marketingHousePreLaunchApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          marketing_house_category_id: rec.marketing_house_category_id ? String(rec.marketing_house_category_id) : '',
          marketing_house_item_id: rec.marketing_house_item_id ? String(rec.marketing_house_item_id) : '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [editId]);

  // Load the items belonging to the selected category (item selector options).
  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    marketingHouseItemApi.getAll({ marketing_house_category_id: selectedCategory, limit: 200 })
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error('Failed to load items'));
  }, [selectedCategory]);

  // When locked, force the item id into form state and resolve its display name.
  useEffect(() => {
    if (lockedItemId) setValue('marketing_house_item_id', lockedItemId);
  }, [lockedItemId, setValue]);

  useEffect(() => {
    if (!lockedItemId) { setLockedName(''); return; }
    marketingHouseItemApi.getOne(lockedItemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.marketing_house_title || ''))
      .catch(() => setLockedName(''));
  }, [lockedItemId]);

  const categoryReg = register('marketing_house_category_id', lockedItemId ? {} : { required: 'Required' });

  const onSubmit = async (formData: any) => {
    if (lockedItemId) formData.marketing_house_item_id = lockedItemId;
    if (!lockedItemId && !formData.marketing_house_item_id) { toast.error('Please select an item'); return; }
    const fd = new FormData();
    fd.append('marketing_house_item_id', formData.marketing_house_item_id);
    ['activity_title', 'activity_description', 'activity_image', 'slug', 'display_order', 'status'].forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== '') fd.append(k, String(formData[k]));
    });
    try {
      if (isEdit && editId) await marketingHousePreLaunchApi.update(editId, fd);
      else await marketingHousePreLaunchApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      onSuccess?.();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {lockedItemId ? (
        <div>
          <label className="form-label">Marketing Item <span className="text-red-500">*</span></label>
          <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || lockedItemId} disabled readOnly />
          <input type="hidden" {...register('marketing_house_item_id')} />
          <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Category <span className="text-red-500">*</span></label>
            <select
              {...categoryReg}
              onChange={(e) => { categoryReg.onChange(e); setValue('marketing_house_item_id', ''); }}
              className="form-select"
            >
              <option value="">Select category</option>
              {categories.map((c: any) => <option key={c._id} value={c._id}>{c.category_name || c.name}</option>)}
            </select>
            {errors.marketing_house_category_id && <p className="form-error">{String(errors.marketing_house_category_id.message)}</p>}
          </div>
          <div>
            <label className="form-label">Item <span className="text-red-500">*</span></label>
            <select {...register('marketing_house_item_id', { required: 'Required' })} className="form-select" disabled={!selectedCategory}>
              <option value="">{selectedCategory ? 'Select item' : 'Select a category first'}</option>
              {items.map((it: any) => <option key={it._id} value={it._id}>{itemName(it)}</option>)}
            </select>
            {errors.marketing_house_item_id && <p className="form-error">{String(errors.marketing_house_item_id.message)}</p>}
          </div>
        </div>
      )}
      <div>
        <label className="form-label">Activity Title <span className="text-red-500">*</span></label>
        <input {...register('activity_title', { required: 'Required' })} className="form-input" />
        {errors.activity_title && <p className="form-error">{String(errors.activity_title.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Description</label><textarea {...register('activity_description')} className="form-textarea" /></div>
      <ImageUpload name="activity_image" label="Activity Image" uploadType="image" folder="marketing-house" value={watch('activity_image')} onChange={(url) => setValue('activity_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel?.()} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}
