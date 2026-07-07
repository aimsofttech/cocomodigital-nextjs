import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { topBannerApi, bookCallApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

/* YouTube links copied while a playlist is open carry `&list=…&index=…`
   params, which break single-video playback on the website (the player
   treats them as a playlist and fails with "Invalid video id"). Reduce
   to the canonical watch?v=<id> form; non-YouTube URLs pass through. */
const YOUTUBE_ID_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const cleanVideoUrl = (url?: string): string => {
  if (!url) return '';
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : url;
};

export default function TopBannerForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [bookCalls, setBookCalls] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    bookCallApi.getAll({ limit: 100, status: 1 })
      .then(({ data }) => setBookCalls(data.data || []))
      .catch(() => setBookCalls([]));
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      topBannerApi.getOne(id)
        .then(({ data }) => {
          const item = data.data;
          reset({ ...item, status: String(item.status) });
        })
        .catch(() => toast.error('Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      formData.videoUrl = cleanVideoUrl(formData.videoUrl);
      if (isEdit && id) await topBannerApi.update(id, formData); else await topBannerApi.create(formData);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate('/home/top-banner');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Heading <span className="text-red-500">*</span></label>
          <input {...register('heading', { required: 'Required' })} className="form-input" placeholder="Enter heading" />
          {errors.heading && <p className="form-error">{String(errors.heading.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div>
        <label className="form-label">Sub Heading</label>
        <input {...register('subHeading')} className="form-input" placeholder="Enter sub heading" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Button Text</label>
          <input {...register('buttonText')} className="form-input" placeholder="Enter button text" />
        </div>
        <div>
          <label className="form-label">Select Book Call Template</label>
          <select {...register('bookCallTemplateId')} className="form-select">
            <option value="">— None —</option>
            {bookCalls.map((bc) => (
              <option key={bc._id} value={bc._id}>
                {bc.name || bc.heading || 'Untitled'}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Banner Video URL</label>
          <input {...register('videoUrl')} className="form-input" placeholder="YouTube or video URL" />
        </div>
        <div>
          <label className="form-label">Country</label>
          <input {...register('country')} className="form-input" defaultValue="en-us" placeholder="e.g. en-us" />
        </div>
      </div>
      <ImageUpload name="videoThumbnail" label="Thumbnail" uploadType="image" folder="home" value={watch('videoThumbnail')} onChange={(url) => setValue('videoThumbnail', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select" defaultValue="1"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/home/top-banner')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Top Banner' : 'Add Top Banner'}
        breadcrumbs={[{ label: 'Home' }, { label: 'Top Banners', path: '/home/top-banner' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
