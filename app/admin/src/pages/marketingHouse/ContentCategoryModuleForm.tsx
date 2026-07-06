import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHouseContentCategoryApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

// Item records expose their name under `title` (or legacy `title`).
const itemName = (it: any) => it.title || it.title || 'Untitled';

export default function ContentCategoryModuleForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketingHouseCategoryId');

  // Load all marketing categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load the existing record when editing (the API response already includes the
  // resolved category id via the backend lookup, so we can prefill both selects).
  useEffect(() => {
    if (isEdit && editId) {
      marketingHouseContentCategoryApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          navigateTo: rec.navigateTo != null && rec.navigateTo !== '' ? String(rec.navigateTo) : '',
          marketingHouseCategoryId: rec.marketingHouseCategoryId ? String(rec.marketingHouseCategoryId) : '',
          marketingHouseItemId: rec.marketingHouseItemId ? String(rec.marketingHouseItemId) : '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [editId]);

  // Load the marketing items belonging to the selected category.
  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    marketingHouseItemApi.getAll({ marketingHouseCategoryId: selectedCategory, limit: 200 })
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error('Failed to load items'));
  }, [selectedCategory]);

  // When locked to a specific Marketing Campaign, force the field value and resolve
  // the item's display name for the read-only input.
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
    const payload = {
      marketingHouseItemId: formData.marketingHouseItemId,
      name: formData.name,
      navigateTo: formData.navigateTo ? Number(formData.navigateTo) : undefined,
      slug: formData.slug,
      displayOrder: formData.displayOrder,
      status: formData.status,
    };
    try {
      if (isEdit && editId) await marketingHouseContentCategoryApi.update(editId, payload);
      else await marketingHouseContentCategoryApi.create(payload);
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
            <label className="form-label">Marketing Category <span className="text-red-500">*</span></label>
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
            <label className="form-label">Marketing Campaign <span className="text-red-500">*</span></label>
            <select {...register('marketingHouseItemId', { required: 'Required' })} className="form-select" disabled={!selectedCategory}>
              <option value="">{selectedCategory ? 'Select item' : 'Select a category first'}</option>
              {items.map((it: any) => <option key={it._id} value={it._id}>{itemName(it)}</option>)}
            </select>
            {errors.marketingHouseItemId && <p className="form-error">{String(errors.marketingHouseItemId.message)}</p>}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Category Name <span className="text-red-500">*</span></label>
          <input {...register('name', { required: 'Required' })} className="form-input" placeholder="Enter category name" />
          {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div>
        <label className="form-label">Navigate To</label>
        <div className="flex flex-wrap items-center gap-6 mt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="radio" value="1" {...register('navigateTo')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Content Items</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="radio" value="2" {...register('navigateTo')} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Content Items Carousels</span>
          </label>
        </div>
      </div>
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
