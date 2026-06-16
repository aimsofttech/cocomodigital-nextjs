import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { creativeHouseApproachApi, creativeHouseItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

const itemName = (i: any) => i.creative_house_title || i.creative_house_video_title || i.creative_house_slug || i._id;

export default function ApproachForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId, itemId: routeItemId } = useParams();
  const itemId = routeItemId || lockedItemId;
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  // Video can be supplied by URL OR uploaded file — never both.
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectVideoTab = (tab: 'url' | 'upload') => {
    setVideoTab(tab);
    if (tab === 'url') setValue('approach_upload_video_url', '');
    else setValue('approach_video_url', '');
  };

  useEffect(() => {
    creativeHouseItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || [])).catch(() => {});
    if (isEdit && id) {
      setLoading(true);
      creativeHouseApproachApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? 1),
          approach_heading: item.approach_heading || '',
          creative_house_item_id: item.creative_house_item_id?._id || item.creative_house_item_id || itemId || '',
        });
        setVideoTab(item.approach_upload_video_url ? 'upload' : 'url');
      }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    } else if (itemId) {
      setValue('creative_house_item_id', itemId);
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    // approach_title is required by the schema; mirror the heading into it.
    if (formData.approach_heading) formData.approach_title = formData.approach_heading;
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await creativeHouseApproachApi.update(id, fd);
      else await creativeHouseApproachApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Creative Item <span className="text-red-500">*</span></label>
        <select {...register('creative_house_item_id', { required: 'Required' })} className="form-select" disabled={Boolean(itemId)}>
          <option value="">Select Creative Item</option>
          {items.map((i: any) => <option key={i._id} value={i._id}>{itemName(i)}</option>)}
        </select>
        {errors.creative_house_item_id && <p className="form-error">{String(errors.creative_house_item_id.message)}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Heading <span className="text-red-500">*</span></label>
          <input {...register('approach_heading', { required: 'Required' })} className="form-input" placeholder="e.g. Concept & Storyboard" />
          {errors.approach_heading && <p className="form-error">{String(errors.approach_heading.message)}</p>}
        </div>
        <SlugField name="slug" register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>

      <div><label className="form-label">Description</label><textarea {...register('approach_description')} className="form-textarea" placeholder="Describe this step of the creative approach..." /></div>

      <ImageUpload name="approach_thumbnail" label="Thumbnail (JPG, PNG, JPEG, GIF)" uploadType="image" folder="creative-house"
        value={watch('approach_thumbnail')} onChange={(url) => setValue('approach_thumbnail', url)} />

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
          <input {...register('approach_video_url')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="approach_upload_video_url" label="Choose Video File (MP4, WEBM, OGG)" uploadType="video" folder="creative-house"
            value={watch('approach_upload_video_url')} onChange={(url) => setValue('approach_upload_video_url', url)} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Creative Approach' : 'Add Creative Approach'} breadcrumbs={[{ label: 'Creative Approach', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
