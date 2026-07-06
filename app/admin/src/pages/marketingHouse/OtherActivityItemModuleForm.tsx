import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHouseOtherActivityItemApi, marketingHouseOtherActivityCategoryApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Marketing Campaign), the item is preselected and locked. */
  lockedItemId?: string;
  /** When set (navigated from a Category), that activity category is preselected. */
  lockedCategoryId?: string;
}

// Item records expose their name under `title` (or legacy `title`).
const itemName = (it: any) => it.title || it.title || 'Untitled';

export default function OtherActivityItemModuleForm({ onSuccess, onCancel, editId, lockedItemId, lockedCategoryId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activityCategories, setActivityCategories] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketingHouseCategoryId');
  const selectedItem = watch('marketingHouseItemId');

  // Load all marketing categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // Load the existing record when editing (the API response already includes the
  // resolved category id via the backend lookup, so we can prefill the selects).
  useEffect(() => {
    if (isEdit && editId) {
      marketingHouseOtherActivityItemApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          marketingHouseCategoryId: rec.marketingHouseCategoryId ? String(rec.marketingHouseCategoryId) : '',
          marketingHouseItemId: rec.marketingHouseItemId ? String(rec.marketingHouseItemId) : '',
          marketingHouseOtherActivityCategoryId: rec.marketingHouseOtherActivityCategoryId ? String(rec.marketingHouseOtherActivityCategoryId) : '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [editId]);

  // When locked, force the marketing item id and resolve its display name. The
  // activity-category select below keys off the watched item id, so locking it
  // automatically scopes the sub-category options to this item.
  useEffect(() => {
    if (!lockedItemId) return;
    setValue('marketingHouseItemId', lockedItemId);
    marketingHouseItemApi.getOne(lockedItemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.title || lockedItemId))
      .catch(() => setLockedName(lockedItemId));
  }, [lockedItemId, setValue]);

  // Load the marketing items belonging to the selected category.
  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    marketingHouseItemApi.getAll({ marketingHouseCategoryId: selectedCategory, limit: 200 })
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error('Failed to load items'));
  }, [selectedCategory]);

  // Load the other-activity categories belonging to the selected marketing item.
  useEffect(() => {
    if (!selectedItem) { setActivityCategories([]); return; }
    marketingHouseOtherActivityCategoryApi.getAll({ marketingHouseItemId: selectedItem, limit: 200 })
      .then(({ data }) => setActivityCategories(data.data || []))
      .catch(() => toast.error('Failed to load activity categories'));
  }, [selectedItem]);

  // When navigated from the Categories page (create flow), pre-select that
  // activity category once its options have loaded.
  useEffect(() => {
    if (lockedCategoryId && !isEdit && activityCategories.length) {
      setValue('marketingHouseOtherActivityCategoryId', lockedCategoryId);
    }
  }, [lockedCategoryId, isEdit, activityCategories, setValue]);

  const categoryReg = register('marketingHouseCategoryId', lockedItemId ? {} : { required: 'Required' });
  const itemReg = register('marketingHouseItemId', { required: 'Required' });

  const onSubmit = async (formData: any) => {
    if (lockedItemId) formData.marketingHouseItemId = lockedItemId;
    if (!lockedItemId && !formData.marketingHouseItemId) { toast.error('Please select an item'); return; }
    const fd = new FormData();
    fd.append('marketingHouseItemId', formData.marketingHouseItemId);
    ['marketingHouseOtherActivityCategoryId', 'title', 'description', 'slug', 'displayOrder', 'status'].forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== '') fd.append(k, String(formData[k]));
    });
    // Up to 4 image (uploaded) + video (URL) pairs — always send (empty allowed)
    // so clearing a slot persists; the backend reconciles removed images from S3.
    [1, 2, 3, 4].forEach((n) => {
      fd.append(`image${n}`, formData[`image${n}`] ?? '');
      fd.append(`video${n}`, formData[`video${n}`] ?? '');
    });
    try {
      if (isEdit && editId) await marketingHouseOtherActivityItemApi.update(editId, fd);
      else await marketingHouseOtherActivityItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      onSuccess?.();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!lockedItemId && (
        <div>
          <label className="form-label">Marketing Category <span className="text-red-500">*</span></label>
          <select
            {...categoryReg}
            onChange={(e) => { categoryReg.onChange(e); setValue('marketingHouseItemId', ''); setValue('marketingHouseOtherActivityCategoryId', ''); }}
            className="form-select"
          >
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.name}</option>)}
          </select>
          {errors.marketingHouseCategoryId && <p className="form-error">{String(errors.marketingHouseCategoryId.message)}</p>}
        </div>
      )}
      {/* Marketing Campaign + Activity Category in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Marketing Campaign <span className="text-red-500">*</span></label>
          {lockedItemId ? (
            <>
              <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || lockedItemId} disabled readOnly placeholder="Marketing Campaign" />
              <input type="hidden" {...register('marketingHouseItemId')} />
              <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Campaign.</p>
            </>
          ) : (
            <>
              <select
                {...itemReg}
                onChange={(e) => { itemReg.onChange(e); setValue('marketingHouseOtherActivityCategoryId', ''); }}
                className="form-select"
                disabled={!selectedCategory}
              >
                <option value="">{selectedCategory ? 'Select item' : 'Select a category first'}</option>
                {items.map((it: any) => <option key={it._id} value={it._id}>{itemName(it)}</option>)}
              </select>
              {errors.marketingHouseItemId && <p className="form-error">{String(errors.marketingHouseItemId.message)}</p>}
            </>
          )}
        </div>
        <div>
          <label className="form-label">Activity Category</label>
          <select {...register('marketingHouseOtherActivityCategoryId')} className="form-select" disabled={!selectedItem}>
            <option value="">{selectedItem ? 'Select activity category' : 'Select an item first'}</option>
            {activityCategories.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.name}</option>)}
          </select>
        </div>
      </div>
      {/* Item Title + Slug in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Item Title <span className="text-red-500">*</span></label>
          <input {...register('title', { required: 'Required' })} className="form-input" placeholder="Enter item title" />
          {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div><label className="form-label">Description</label><textarea {...register('description')} className="form-textarea" placeholder="Write a short description…" /></div>
      {/* Up to 4 images (uploaded) each paired with an optional video link */}
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUpload
            name={`image${n}`}
            label={`Image ${n}`}
            recommended={{ width: 1200, height: 800, ratio: '3:2', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }}
            uploadType="image"
            folder="marketing-house"
            value={watch(`image${n}`)}
            onChange={(url) => setValue(`image${n}`, url)}
          />
          <div>
            <label className="form-label">Video {n} <span className="text-gray-400 font-normal">(YouTube, Vimeo, or any direct video link)</span></label>
            <input {...register(`video${n}`)} className="form-input" placeholder="Paste video URL here (optional)" />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel?.()} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Save')}</button>
      </div>
    </form>
  );
}
