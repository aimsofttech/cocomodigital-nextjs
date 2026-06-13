import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  creativeHouseItemApi, creativeHouseCategoryApi,
  authorTemplateApi, bookCallApi, galleryImageApi,
} from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

// Best-effort display label for the template dropdowns (records use different
// name fields: author → template_name/author_name, book-call → book_name).
const tName = (t: any) =>
  t.template_name || t.book_name || t.author_name || t.name || t.title || t._id;

export default function ItemForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [bookCalls, setBookCalls] = useState<any[]>([]);
  const [clientLogos, setClientLogos] = useState<any[]>([]);
  // Video can be supplied by URL OR uploaded file — never both.
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  // Switch the video method and clear the other field so only one is submitted.
  const selectVideoTab = (tab: 'url' | 'upload') => {
    setVideoTab(tab);
    if (tab === 'url') setValue('creative_house_upload_video_url', '');
    else setValue('creative_house_video_url', '');
  };

  useEffect(() => {
    // Load all dropdown sources in parallel. Failures degrade to empty lists.
    creativeHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || [])).catch(() => {});
    authorTemplateApi.getAll({ limit: 200 }).then(({ data }) => setAuthors(data.data || [])).catch(() => {});
    bookCallApi.getAll({ limit: 200 }).then(({ data }) => setBookCalls(data.data || [])).catch(() => {});
    // Client logos = gallery images tagged with image_type 'requirement_title'.
    galleryImageApi.getAll({ limit: 500 }).then(({ data }) =>
      setClientLogos((data.data || []).filter((g: any) => g.image_type === 'requirement_title'))
    ).catch(() => {});

    if (isEdit && id) {
      setLoading(true);
      creativeHouseItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? 1),
          creative_house_title: item.creative_house_title ?? item.creative_house_video_title ?? '',
          creative_house_category_id: item.creative_house_category_id?._id || item.creative_house_category_id,
          author_template_id: item.author_template_id?._id || item.author_template_id || '',
          book_call_template_id: item.book_call_template_id?._id || item.book_call_template_id || '',
          requirement_title: item.requirement_title?._id || item.requirement_title || '',
        });
        // Default to the upload tab when the item has an uploaded video.
        setVideoTab(item.creative_house_upload_video_url ? 'upload' : 'url');
      }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await creativeHouseItemApi.update(id, fd);
      else await creativeHouseItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Category + Author + Book Call ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Category Name <span className="text-red-500">*</span></label>
          <select {...register('creative_house_category_id', { required: 'Required' })} className="form-select">
            <option value="">Select Category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.creative_house_category_name}</option>)}
          </select>
          {errors.creative_house_category_id && <p className="form-error">{String(errors.creative_house_category_id.message)}</p>}
        </div>
        <div>
          <label className="form-label">Author</label>
          <select {...register('author_template_id')} className="form-select">
            <option value="">Select Author</option>
            {authors.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Book Call</label>
          <select {...register('book_call_template_id')} className="form-select">
            <option value="">Select Category</option>
            {bookCalls.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
      </div>

      {/* ── Title + Slug ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Video Title <span className="text-red-500">*</span></label>
          <input {...register('creative_house_title', { required: 'Required' })} className="form-input" placeholder="Enter video title, e.g., 'How we edited Puspa Trailer'" />
          {errors.creative_house_title && <p className="form-error">{String(errors.creative_house_title.message)}</p>}
        </div>
        <SlugField name="creative_house_slug" label="Slug Name" register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>

      {/* ── Thumbnail ────────────────────────────────────────────── */}
      <ImageUpload name="creative_house_thumbnail" label="Video Thumbnail (Upload only JPG, PNG, JPEG, GIF — 987x554)"
        uploadType="image" folder="creative-house" value={watch('creative_house_thumbnail')}
        onChange={(url) => setValue('creative_house_thumbnail', url)} />

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
          <input {...register('creative_house_video_url')} className="form-input" placeholder="Enter a video URL if you're not uploading a video file" />
        ) : (
          <ImageUpload name="creative_house_upload_video_url" label="Choose Video File (MP4, WEBM, OGG)"
            uploadType="video" folder="creative-house" value={watch('creative_house_upload_video_url')}
            onChange={(url) => setValue('creative_house_upload_video_url', url)} />
        )}
      </div>

      {/* ── Client Logo ──────────────────────────────────────────── */}
      <div>
        <label className="form-label">
          Client Logo
          <span className="ml-1 text-xs font-normal text-gray-400">(Add new logos from Gallery → Images → Client Requirement Title)</span>
        </label>
        <select {...register('requirement_title')} className="form-select">
          <option value="">Select Logo</option>
          {clientLogos.map((g: any) => <option key={g._id} value={g._id}>{g.image_title || g.slug || g._id}</option>)}
        </select>
      </div>

      {/* ── Requirement Description ──────────────────────────────── */}
      <div>
        <label className="form-label">Requirement Description</label>
        <textarea {...register('requirement_description')} className="form-textarea" placeholder="Briefly describe the project requirements, target audience, and style preferences..." />
      </div>

      {/* ── Order + Status ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="Order number. e.g 1, 2, 3" defaultValue={0} /></div>
        <div>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-select"><option value="">Select status</option><option value="1">Active</option><option value="0">Inactive</option></select>
        </div>
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
      <PageHeader title={isEdit ? 'Edit Creative Item' : 'Add Creative Item'} breadcrumbs={[{ label: 'Creative Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-4xl">{form}</div>
    </div>
  );
}
