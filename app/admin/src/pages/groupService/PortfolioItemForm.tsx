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

  const selectedItem = watch('groupServiceItemId');
  const selectedCat = watch('portfolioCategoryId');

  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || []));
    groupPortfolioCategoryApi.getAll({ limit: 500 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      groupPortfolioItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        editCatId.current = item.portfolioCategoryId?._id || item.portfolioCategoryId || '';
        editCatId.current = editCatId.current ? String(editCatId.current) : '';
        reset({ ...item, status: String(item.status), portfolioCategoryId: editCatId.current });
        if (item.videoType === 'url') setVideoTab('url');
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected category once options exist (avoids placeholder revert on edit).
  useEffect(() => {
    if (isEdit && categories.length && editCatId.current) setValue('portfolioCategoryId', editCatId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isEdit]);

  // Preselect the Group Service Item when adding from the items link (once options load).
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedItemId || !items.length || lockedApplied.current) return;
    setValue('groupServiceItemId', lockedItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedItemId, isEdit, items]);

  // Preselect the Portfolio Category when adding from the category link (once
  // options load); the derive effect above then fills the Group Service Item.
  const lockedCatApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedCategoryId || !categories.length || lockedCatApplied.current) return;
    setValue('portfolioCategoryId', lockedCategoryId);
    lockedCatApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCategoryId, isEdit, categories]);

  // Derive the Group Service Item from the chosen Portfolio Category (fills blanks only).
  useEffect(() => {
    if (!selectedCat || !categories.length || !items.length || selectedItem) return;
    const c = categories.find((x: any) => String(x._id) === String(selectedCat));
    if (c?.groupServiceItemId) setValue('groupServiceItemId', String(c.groupServiceItemId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, categories, items, selectedItem]);

  // Portfolio Category options scoped to the chosen Group Service Item (keep current selection visible).
  const categoryOptions = categories.filter(
    (c: any) => !selectedItem || String(c.groupServiceItemId) === String(selectedItem) || String(c._id) === String(selectedCat)
  );

  const itemReg = register('groupServiceItemId', { required: lockedItemId ? false : 'Required' });

  const switchVideoTab = (tab: VideoTab) => {
    setVideoTab(tab);
    setValue('videoUrl', '');
    setValue('videoType', tab);
  };

  const onSubmit = async (formData: any) => {
    const payload = {
      groupServiceItemId: formData.groupServiceItemId || lockedItemId || '',
      portfolioCategoryId: formData.portfolioCategoryId || lockedCategoryId || '',
      image: formData.image,
      videoUrl: formData.videoUrl || '',
      videoType: formData.videoUrl ? videoTab : '',
      displayOrder: Number(formData.displayOrder) || 0,
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
            onChange={(e) => { itemReg.onChange(e); setValue('portfolioCategoryId', ''); }}
            className="form-select disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            disabled={Boolean(lockedItemId)}
            title={lockedItemId ? 'Locked to the current group service item' : undefined}
          >
            <option value="">Select service item</option>
            {items.map((it: any) => <option key={it._id} value={it._id}>{it.title}</option>)}
          </select>
          {errors.groupServiceItemId && <p className="form-error">{String(errors.groupServiceItemId.message)}</p>}
        </div>
        <div>
          <label className="form-label">Portfolio Category <span className="text-red-500">*</span></label>
          <select
            {...register('portfolioCategoryId', { required: lockedCategoryId ? false : 'Required' })}
            className="form-select disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            disabled={Boolean(lockedCategoryId)}
            title={lockedCategoryId ? 'Locked to the current portfolio category' : undefined}
          >
            <option value="">Select category</option>
            {categoryOptions.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {errors.portfolioCategoryId && <p className="form-error">{String(errors.portfolioCategoryId.message)}</p>}
        </div>
      </div>

      <ImageUpload name="image" label="Item Image" recommended={{ width: 960, height: 640, ratio: '3:2', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }} uploadType="image" folder="group-service" value={watch('image')} onChange={(url) => setValue('image', url)} />

      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional - Choose one method)</span></label>
        <div className="flex gap-2 border-b border-gray-200">
          <button type="button" className={tabClass(videoTab === 'upload')} onClick={() => switchVideoTab('upload')}>Upload Video</button>
          <button type="button" className={tabClass(videoTab === 'url')} onClick={() => switchVideoTab('url')}>Video URL</button>
        </div>
        <div className="border border-t-0 border-gray-200 rounded-b-lg p-4">
          {videoTab === 'upload' ? (
            <ImageUpload
              name="videoUrl"
              label="Choose Video File (MP4, WEBM, OGG - Max 50MB)"
              uploadType="video"
              folder="group-service"
              value={watch('videoUrl')}
              onChange={(url) => { setValue('videoUrl', url); setValue('videoType', 'upload'); }}
            />
          ) : (
            <div>
              <label className="form-label">Video URL</label>
              <input
                className="form-input"
                placeholder="https://youtube.com/... or video URL"
                value={watch('videoUrl') || ''}
                onChange={(e) => { setValue('videoUrl', e.target.value); setValue('videoType', 'url'); }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
