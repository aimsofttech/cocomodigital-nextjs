import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHouseContentItemApi, marketingHouseContentCategoryApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

// Item records expose their name under `title` (or legacy `title`).
const itemName = (it: any) => it.title || it.title || 'Untitled';

export default function ContentItemModuleForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [contentCategories, setContentCategories] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  // Video can be provided as an external URL or an uploaded file.
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketingHouseCategoryId');
  const selectedItem = watch('marketingHouseItemId');

  // Load all marketing categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // When locked to a marketing item, force the field value and resolve its name.
  useEffect(() => {
    if (!lockedItemId) return;
    setValue('marketingHouseItemId', lockedItemId);
    marketingHouseItemApi.getOne(lockedItemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.title || lockedItemId))
      .catch(() => setLockedName(lockedItemId));
  }, [lockedItemId, setValue]);

  // Load the existing record when editing.
  useEffect(() => {
    if (isEdit && editId) {
      marketingHouseContentItemApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          marketingHouseCategoryId: rec.marketingHouseCategoryId ? String(rec.marketingHouseCategoryId) : '',
          marketingHouseItemId: rec.marketingHouseItemId ? String(rec.marketingHouseItemId) : '',
          marketingHouseContentCreatedCategoryId: rec.marketingHouseContentCreatedCategoryId ? String(rec.marketingHouseContentCreatedCategoryId) : '',
        });
        if (rec.upload_video_url) setVideoTab('upload');
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

  // Load the content categories belonging to the selected marketing item.
  useEffect(() => {
    if (!selectedItem) { setContentCategories([]); return; }
    marketingHouseContentCategoryApi.getAll({ marketingHouseItemId: selectedItem, limit: 200 })
      .then(({ data }) => setContentCategories(data.data || []))
      .catch(() => toast.error('Failed to load content categories'));
  }, [selectedItem]);

  const categoryReg = register('marketingHouseCategoryId', lockedItemId ? {} : { required: 'Required' });
  const itemReg = register('marketingHouseItemId', { required: 'Required' });

  // Switch video input method, clearing the other field so only one is submitted.
  const switchVideoTab = (tab: 'url' | 'upload') => {
    setVideoTab(tab);
    if (tab === 'url') setValue('upload_video_url', '');
    else setValue('url', '');
  };

  const onSubmit = async (formData: any) => {
    if (lockedItemId) formData.marketingHouseItemId = lockedItemId;
    if (!lockedItemId && !formData.marketingHouseItemId) { toast.error('Please select an item'); return; }
    const fd = new FormData();
    fd.append('marketingHouseItemId', formData.marketingHouseItemId);
    ['marketingHouseContentCreatedCategoryId', 'image', 'displayOrder', 'status'].forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== '') fd.append(k, String(formData[k]));
    });
    // Always send both video fields (empty allowed) so switching/clearing persists.
    fd.append('url', formData.url ?? '');
    fd.append('upload_video_url', formData.upload_video_url ?? '');
    try {
      if (isEdit && editId) await marketingHouseContentItemApi.update(editId, fd);
      else await marketingHouseContentItemApi.create(fd);
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
            onChange={(e) => { categoryReg.onChange(e); setValue('marketingHouseItemId', ''); setValue('marketingHouseContentCreatedCategoryId', ''); }}
            className="form-select"
          >
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.name}</option>)}
          </select>
          {errors.marketingHouseCategoryId && <p className="form-error">{String(errors.marketingHouseCategoryId.message)}</p>}
        </div>
      )}
      {/* Marketing Item + Content Category in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Marketing Item <span className="text-red-500">*</span></label>
          {lockedItemId ? (
            <>
              <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || lockedItemId} disabled readOnly />
              <input type="hidden" {...register('marketingHouseItemId')} />
              <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Item.</p>
            </>
          ) : (
            <>
              <select
                {...itemReg}
                onChange={(e) => { itemReg.onChange(e); setValue('marketingHouseContentCreatedCategoryId', ''); }}
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
          <label className="form-label">Content Category</label>
          <select {...register('marketingHouseContentCreatedCategoryId')} className="form-select" disabled={!selectedItem}>
            <option value="">{selectedItem ? 'Select content category' : 'Select an item first'}</option>
            {contentCategories.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Video: external URL or uploaded file */}
      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional — choose one method)</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => switchVideoTab('url')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Video URL</button>
          <button type="button" onClick={() => switchVideoTab('upload')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'upload' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Upload Video</button>
        </div>
        {videoTab === 'url' ? (
          <input {...register('url')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="upload_video_url" label="Upload Video (MP4, WEBM, OGG)" uploadType="video" folder="marketing-house"
            value={watch('upload_video_url')} onChange={(url) => setValue('upload_video_url', url)} />
        )}
      </div>

      <ImageUpload name="image" label="Image" uploadType="image" folder="marketing-house" value={watch('image')} onChange={(url) => setValue('image', url)} />
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
