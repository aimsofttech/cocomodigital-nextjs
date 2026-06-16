import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupRecentWorkApi, groupServiceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedItemId?: string; }

type MediaTab = 'upload' | 'url';

export default function RecentWorkForm({ onSuccess, onCancel, editId, lockedItemId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const scopedItemId = lockedItemId || itemId || '';
  const [items, setItems] = useState<any[]>([]);
  const [videoTab, setVideoTab] = useState<MediaTab>('upload');
  const editItemId = useRef('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 }).then(({ data }) => setItems(data.data || []));
    if (isEdit && id) {
      groupRecentWorkApi.getOne(id).then(({ data }) => {
        const item = data.data;
        editItemId.current = item.group_service_item_id ? String(item.group_service_item_id) : '';
        reset({ ...item, status: String(item.status), group_service_item_id: editItemId.current });
        if (item.recent_work_video_type === 'url') setVideoTab('url');
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected item once options are loaded (avoids placeholder revert).
  useEffect(() => {
    if (isEdit && items.length && editItemId.current) setValue('group_service_item_id', editItemId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isEdit]);

  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !scopedItemId || !items.length || lockedApplied.current) return;
    setValue('group_service_item_id', scopedItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedItemId, isEdit, items]);

  const switchVideoTab = (tab: MediaTab) => {
    setVideoTab(tab);
    setValue('recent_work_video_url', '');
    setValue('recent_work_video_type', tab);
  };

  const onSubmit = async (formData: any) => {
    const payload = {
      ...formData,
      group_service_item_id: formData.group_service_item_id || scopedItemId,
      recent_work_video_type: formData.recent_work_video_url ? videoTab : '',
    };
    try {
      if (isEdit && id) await groupRecentWorkApi.update(id, payload);
      else await groupRecentWorkApi.create(payload);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Group Service Item <span className="text-red-500">*</span></label>
        <select {...register('group_service_item_id', { required: 'Required' })} className="form-select">
          <option value="">Select service item</option>
          {items.map((it: any) => <option key={it._id} value={it._id}>{it.group_service_item_title}</option>)}
        </select>
        {errors.group_service_item_id && <p className="form-error">{String(errors.group_service_item_id.message)}</p>}
      </div>

      {/* Image — upload only */}
      <ImageUpload
        name="recent_work_image"
        label="Work Image"
        uploadType="image"
        folder="group-service"
        value={watch('recent_work_image')}
        onChange={(url) => setValue('recent_work_image', url)}
      />

      {/* Video — upload or external URL */}
      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional - Choose one method)</span></label>
        <div className="flex gap-2 border-b border-gray-200">
          <button type="button" className={tabClass(videoTab === 'upload')} onClick={() => switchVideoTab('upload')}>Upload Video</button>
          <button type="button" className={tabClass(videoTab === 'url')} onClick={() => switchVideoTab('url')}>Video URL</button>
        </div>
        <div className="border border-t-0 border-gray-200 rounded-b-lg p-4">
          {videoTab === 'upload' ? (
            <ImageUpload
              name="recent_work_video_url"
              label="Choose Video File (MP4, WEBM, OGG - Max 50MB)"
              uploadType="video"
              folder="group-service"
              value={watch('recent_work_video_url')}
              onChange={(url) => { setValue('recent_work_video_url', url); setValue('recent_work_video_type', 'upload'); }}
            />
          ) : (
            <div>
              <label className="form-label">Video URL</label>
              <input
                className="form-input"
                placeholder="https://youtube.com/... or video URL"
                value={watch('recent_work_video_url') || ''}
                onChange={(e) => { setValue('recent_work_video_url', e.target.value); setValue('recent_work_video_type', 'url'); }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Recent Work' : 'Add Recent Work'} breadcrumbs={[{ label: 'Recent Work', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
