import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creativeHouseFinalOutputApi, creativeHouseItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

const itemName = (i: any) => i.title || i.videoTitle || i.slug || i._id;

export default function FinalOutputForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId, itemId: routeItemId } = useParams();
  const itemId = routeItemId || lockedItemId;
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [lockedName, setLockedName] = useState('');
  // Video can be supplied by URL OR uploaded file — never both.
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  // Resolve the locked item's display name (the wizard / scoped pages pass it).
  useEffect(() => {
    if (!itemId) { setLockedName(''); return; }
    setValue('creativeHouseItemId', itemId);
    creativeHouseItemApi.getOne(itemId)
      .then(({ data }) => setLockedName(data.data?.title || data.data?.videoTitle || itemId))
      .catch(() => setLockedName(itemId));
  }, [itemId, setValue]);

  const selectVideoTab = (tab: 'url' | 'upload') => {
    setVideoTab(tab);
    if (tab === 'url') setValue('uploadVideoUrl', '');
    else setValue('videoUrl', '');
  };

  useEffect(() => {
    creativeHouseItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || [])).catch(() => {});
    if (isEdit && id) {
      setLoading(true);
      creativeHouseFinalOutputApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? 1),
          creativeHouseItemId: item.creativeHouseItemId?._id || item.creativeHouseItemId || itemId || '',
        });
        setVideoTab(item.uploadVideoUrl ? 'upload' : 'url');
      }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    } else if (itemId) {
      setValue('creativeHouseItemId', itemId);
    }
  }, [id]);

  // Re-apply the selected item once the dropdown options have loaded — on edit
  // the record often resolves before the items list, so the <option> isn't in
  // the DOM yet when reset() runs and the select would otherwise show blank.
  useEffect(() => {
    const cur = watch('creativeHouseItemId');
    if (items.length && cur) setValue('creativeHouseItemId', String(cur));
  }, [items]);

  const onSubmit = async (formData: any) => {
    // Always carry the relationship; force the locked id when present.
    if (itemId) formData.creativeHouseItemId = itemId;
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await creativeHouseFinalOutputApi.update(id, fd);
      else await creativeHouseFinalOutputApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Creative Item <span className="text-red-500">*</span></label>
        {itemId ? (
          <>
            <input className="form-input bg-gray-100 cursor-not-allowed" value={lockedName || itemId} disabled readOnly />
            {/* Keep the value in submitted form state even though the select is hidden. */}
            <input type="hidden" {...register('creativeHouseItemId')} />
            <p className="mt-1 text-xs text-gray-500">Locked to the selected Creative Item.</p>
          </>
        ) : (
          <>
            <select {...register('creativeHouseItemId', { required: 'Required' })} className="form-select">
              <option value="">Select Creative Item</option>
              {items.map((i: any) => <option key={i._id} value={i._id}>{itemName(i)}</option>)}
            </select>
            {errors.creativeHouseItemId && <p className="form-error">{String(errors.creativeHouseItemId.message)}</p>}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title</label>
          <input {...register('title')} className="form-input" placeholder="e.g. Final Cut, Behind the Scenes" />
        </div>
        <SlugField name="slug" register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>

      <ImageUpload name="thumbnail" label="Thumbnail (JPG, PNG, JPEG, GIF)" uploadType="image" folder="creative-house"
        value={watch('thumbnail')} onChange={(url) => setValue('thumbnail', url)} />

      {/* ── Video (URL or upload — only one) ─────────────────────── */}
      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Add only one — Video URL or Upload Video)</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => selectVideoTab('url')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Video URL</button>
          <button type="button" onClick={() => selectVideoTab('upload')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'upload' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Upload Video</button>
        </div>
        {videoTab === 'url' ? (
          <input {...register('videoUrl')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="uploadVideoUrl" label="Choose Video File (MP4, WEBM, OGG)" uploadType="video" folder="creative-house"
            value={watch('uploadVideoUrl')} onChange={(url) => setValue('uploadVideoUrl', url)} />
        )}
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
      <PageHeader title={isEdit ? 'Edit Project Media' : 'Add Project Media'} breadcrumbs={[{ label: 'Project Media', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
