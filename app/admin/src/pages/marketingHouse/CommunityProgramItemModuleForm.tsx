import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { marketingHouseCommunityProgramItemApi, marketingHouseCommunityProgramApi, marketingHouseCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Marketing Item), the item is preselected and locked. */
  lockedItemId?: string;
}

// Item records expose their name under `title` (or legacy `marketing_house_title`).
const itemName = (it: any) => it.title || it.marketing_house_title || 'Untitled';
// Continuity (community program) categories store their name here.
const programName = (p: any) => p.community_program_category_name || p.category_name || p.name || 'Untitled';

export default function CommunityProgramItemModuleForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const isEdit = Boolean(editId);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  // Video can be provided as an external URL or an uploaded file.
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('marketing_house_category_id');
  const selectedItem = watch('marketing_house_item_id');

  // Load all marketing categories once for the category selector.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  // When locked, force the item id (driving the Continuity Category cascade) and
  // resolve its display name for the read-only field.
  useEffect(() => {
    if (!lockedItemId) return;
    setValue('marketing_house_item_id', lockedItemId);
    marketingHouseItemApi.getOne(lockedItemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.marketing_house_title || lockedItemId))
      .catch(() => setLockedName(lockedItemId));
  }, [lockedItemId, setValue]);

  // Load the existing record when editing.
  useEffect(() => {
    if (isEdit && editId) {
      marketingHouseCommunityProgramItemApi.getOne(editId).then(({ data }) => {
        const rec = data.data;
        reset({
          ...rec,
          status: String(rec.status),
          marketing_house_category_id: rec.marketing_house_category_id ? String(rec.marketing_house_category_id) : '',
          marketing_house_item_id: rec.marketing_house_item_id ? String(rec.marketing_house_item_id) : '',
          community_program_category_id: rec.community_program_category_id ? String(rec.community_program_category_id) : '',
        });
        if (rec.community_program_item_video_file) setVideoTab('upload');
      }).catch(() => toast.error('Failed to load'));
    }
  }, [editId]);

  // Load the marketing items belonging to the selected category.
  useEffect(() => {
    if (!selectedCategory) { setItems([]); return; }
    marketingHouseItemApi.getAll({ marketing_house_category_id: selectedCategory, limit: 200 })
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error('Failed to load items'));
  }, [selectedCategory]);

  // Load the continuity (community program) categories belonging to the selected item.
  useEffect(() => {
    if (!selectedItem) { setPrograms([]); return; }
    marketingHouseCommunityProgramApi.getAll({ marketing_house_item_id: selectedItem, limit: 200 })
      .then(({ data }) => setPrograms(data.data || []))
      .catch(() => toast.error('Failed to load continuity categories'));
  }, [selectedItem]);

  const categoryReg = register('marketing_house_category_id', lockedItemId ? {} : { required: 'Required' });
  const itemReg = register('marketing_house_item_id', { required: 'Required' });

  // Switch video input method, clearing the other field so only one is submitted.
  const switchVideoTab = (tab: 'url' | 'upload') => {
    setVideoTab(tab);
    if (tab === 'url') setValue('community_program_item_video_file', '');
    else setValue('community_program_item_video_url', '');
  };

  const onSubmit = async (formData: any) => {
    if (lockedItemId) formData.marketing_house_item_id = lockedItemId;
    if (!lockedItemId && !formData.marketing_house_item_id) { toast.error('Please select an item'); return; }
    const fd = new FormData();
    fd.append('marketing_house_item_id', formData.marketing_house_item_id);
    ['community_program_category_id', 'community_program_item_description', 'community_program_item_video_thumbnail', 'display_order', 'status'].forEach((k) => {
      if (formData[k] !== undefined && formData[k] !== '') fd.append(k, String(formData[k]));
    });
    // Always send both video fields (empty allowed) so switching/clearing persists.
    fd.append('community_program_item_video_url', formData.community_program_item_video_url ?? '');
    fd.append('community_program_item_video_file', formData.community_program_item_video_file ?? '');
    try {
      if (isEdit && editId) await marketingHouseCommunityProgramItemApi.update(editId, fd);
      else await marketingHouseCommunityProgramItemApi.create(fd);
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
            onChange={(e) => { categoryReg.onChange(e); setValue('marketing_house_item_id', ''); setValue('community_program_category_id', ''); }}
            className="form-select"
          >
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.category_name || c.name}</option>)}
          </select>
          {errors.marketing_house_category_id && <p className="form-error">{String(errors.marketing_house_category_id.message)}</p>}
        </div>
      )}
      {/* Marketing Item + Continuity Category in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Marketing Item <span className="text-red-500">*</span></label>
          {lockedItemId ? (
            <>
              <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || lockedItemId} disabled readOnly />
              <input type="hidden" {...register('marketing_house_item_id')} />
              <p className="mt-1 text-xs text-gray-500">Locked to the selected Marketing Item.</p>
            </>
          ) : (
            <>
              <select
                {...itemReg}
                onChange={(e) => { itemReg.onChange(e); setValue('community_program_category_id', ''); }}
                className="form-select"
                disabled={!selectedCategory}
              >
                <option value="">{selectedCategory ? 'Select item' : 'Select a category first'}</option>
                {items.map((it: any) => <option key={it._id} value={it._id}>{itemName(it)}</option>)}
              </select>
              {errors.marketing_house_item_id && <p className="form-error">{String(errors.marketing_house_item_id.message)}</p>}
            </>
          )}
        </div>
        <div>
          <label className="form-label">Continuity Category</label>
          <select {...register('community_program_category_id')} className="form-select" disabled={!selectedItem}>
            <option value="">{selectedItem ? 'Select continuity category' : 'Select an item first'}</option>
            {programs.map((p: any) => <option key={p._id} value={p._id}>{programName(p)}</option>)}
          </select>
        </div>
      </div>

      <div><label className="form-label">Description</label><textarea {...register('community_program_item_description')} className="form-textarea" rows={4} /></div>

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
          <input {...register('community_program_item_video_url')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="community_program_item_video_file" label="Upload Video (MP4, WEBM, OGG)" uploadType="video" folder="marketing-house"
            value={watch('community_program_item_video_file')} onChange={(url) => setValue('community_program_item_video_file', url)} />
        )}
      </div>

      <ImageUpload name="community_program_item_video_thumbnail" label="Thumbnail Image" uploadType="image" folder="marketing-house"
        value={watch('community_program_item_video_thumbnail')} onChange={(url) => setValue('community_program_item_video_thumbnail', url)} />

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
