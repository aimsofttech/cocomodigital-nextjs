import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupPortfolioItemApi, groupPortfolioCategoryApi, groupServiceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; lockedCategoryId?: string; }

type VideoTab = 'upload' | 'url';

export default function PortfolioItemForm({ onSuccess, onCancel, editId, lockedItemId, lockedCategoryId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [items, setItems] = useState<any[]>([]);        // group service items
  const [categories, setCategories] = useState<any[]>([]); // portfolio categories
  const [videoTab, setVideoTab] = useState<VideoTab>('upload');
  const editCatId = useRef('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedItem = watch('group_service_item_id');
  const selectedCat = watch('portfolio_category_id');

  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || []));
    groupPortfolioCategoryApi.getAll({ limit: 500 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      groupPortfolioItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        editCatId.current = item.portfolio_category_id?._id || item.portfolio_category_id || '';
        editCatId.current = editCatId.current ? String(editCatId.current) : '';
        reset({ ...item, status: String(item.status), portfolio_category_id: editCatId.current });
        if (item.portfolio_item_video_type === 'url') setVideoTab('url');
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected category once options exist (avoids placeholder revert on edit).
  useEffect(() => {
    if (isEdit && categories.length && editCatId.current) setValue('portfolio_category_id', editCatId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isEdit]);

  // Preselect the Group Service Item when adding from the items link (once options load).
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedItemId || !items.length || lockedApplied.current) return;
    setValue('group_service_item_id', lockedItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedItemId, isEdit, items]);

  // Preselect the Portfolio Category when adding from the category link (once
  // options load); the derive effect above then fills the Group Service Item.
  const lockedCatApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedCategoryId || !categories.length || lockedCatApplied.current) return;
    setValue('portfolio_category_id', lockedCategoryId);
    lockedCatApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCategoryId, isEdit, categories]);

  // Derive the Group Service Item from the chosen Portfolio Category (fills blanks only).
  useEffect(() => {
    if (!selectedCat || !categories.length || !items.length || selectedItem) return;
    const c = categories.find((x: any) => String(x._id) === String(selectedCat));
    if (c?.group_service_item_id) setValue('group_service_item_id', String(c.group_service_item_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, categories, items, selectedItem]);

  // Portfolio Category options scoped to the chosen Group Service Item (keep current selection visible).
  const categoryOptions = categories.filter(
    (c: any) => !selectedItem || String(c.group_service_item_id) === String(selectedItem) || String(c._id) === String(selectedCat)
  );

  const itemReg = register('group_service_item_id', { required: 'Required' });

  const switchVideoTab = (tab: VideoTab) => {
    setVideoTab(tab);
    setValue('portfolio_item_video_url', '');
    setValue('portfolio_item_video_type', tab);
  };

  const onSubmit = async (formData: any) => {
    const payload = {
      group_service_item_id: formData.group_service_item_id,
      portfolio_category_id: formData.portfolio_category_id,
      portfolio_item_image: formData.portfolio_item_image,
      portfolio_item_video_url: formData.portfolio_item_video_url || '',
      portfolio_item_video_type: formData.portfolio_item_video_url ? videoTab : '',
      display_order: Number(formData.display_order) || 0,
      status: Number(formData.status),
    };
    try {
      if (isEdit && id) await groupPortfolioItemApi.update(id, payload);
      else await groupPortfolioItemApi.create(payload);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Group Service Item <span className="text-red-500">*</span></label>
          <select
            {...itemReg}
            onChange={(e) => { itemReg.onChange(e); setValue('portfolio_category_id', ''); }}
            className="form-select"
          >
            <option value="">Select service item</option>
            {items.map((it: any) => <option key={it._id} value={it._id}>{it.group_service_item_title}</option>)}
          </select>
          {errors.group_service_item_id && <p className="form-error">{String(errors.group_service_item_id.message)}</p>}
        </div>
        <div>
          <label className="form-label">Portfolio Category <span className="text-red-500">*</span></label>
          <select {...register('portfolio_category_id', { required: 'Required' })} className="form-select">
            <option value="">Select category</option>
            {categoryOptions.map((c: any) => <option key={c._id} value={c._id}>{c.portfolio_category_name}</option>)}
          </select>
          {errors.portfolio_category_id && <p className="form-error">{String(errors.portfolio_category_id.message)}</p>}
        </div>
      </div>

      <ImageUpload name="portfolio_item_image" label="Item Image" uploadType="image" folder="group-service" value={watch('portfolio_item_image')} onChange={(url) => setValue('portfolio_item_image', url)} />

      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional - Choose one method)</span></label>
        <div className="flex gap-2 border-b border-gray-200">
          <button type="button" className={tabClass(videoTab === 'upload')} onClick={() => switchVideoTab('upload')}>Upload Video</button>
          <button type="button" className={tabClass(videoTab === 'url')} onClick={() => switchVideoTab('url')}>Video URL</button>
        </div>
        <div className="border border-t-0 border-gray-200 rounded-b-lg p-4">
          {videoTab === 'upload' ? (
            <ImageUpload
              name="portfolio_item_video_url"
              label="Choose Video File (MP4, WEBM, OGG - Max 50MB)"
              uploadType="video"
              folder="group-service"
              value={watch('portfolio_item_video_url')}
              onChange={(url) => { setValue('portfolio_item_video_url', url); setValue('portfolio_item_video_type', 'upload'); }}
            />
          ) : (
            <div>
              <label className="form-label">Video URL</label>
              <input
                className="form-input"
                placeholder="https://youtube.com/... or video URL"
                value={watch('portfolio_item_video_url') || ''}
                onChange={(e) => { setValue('portfolio_item_video_url', e.target.value); setValue('portfolio_item_video_type', 'url'); }}
              />
            </div>
          )}
        </div>
      </div>

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
      <PageHeader title={isEdit ? 'Edit Portfolio Item' : 'Add Portfolio Item'} breadcrumbs={[{ label: 'Portfolio Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
