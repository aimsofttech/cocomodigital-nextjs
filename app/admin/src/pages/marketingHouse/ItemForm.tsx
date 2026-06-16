import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  marketingHouseItemApi, marketingHouseCategoryApi,
  authorTemplateApi, bookCallApi, ourAdvantageApi,
} from '@/services/adminApi';
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

// Best-effort display label for the template dropdowns (records use different
// name fields: author/our-advantage → template_name, book-call → book_name).
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
  const [advantages, setAdvantages] = useState<any[]>([]);
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    // Load all dropdown sources in parallel. Failures degrade to empty lists.
    marketingHouseCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || [])).catch(() => {});
    authorTemplateApi.getAll({ limit: 200 }).then(({ data }) => setAuthors(data.data || [])).catch(() => {});
    bookCallApi.getAll({ limit: 200 }).then(({ data }) => setBookCalls(data.data || [])).catch(() => {});
    ourAdvantageApi.getAll({ limit: 200 }).then(({ data }) => setAdvantages(data.data || [])).catch(() => {});

    if (isEdit && id) {
      setLoading(true);
      marketingHouseItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? 1),
          // Prefer the bare names the list/data use, falling back to the schema names.
          title: item.title ?? item.marketing_house_title ?? '',
          poster_image: item.poster_image ?? item.marketing_house_thumbnail ?? '',
          marketing_video: item.marketing_video ?? item.marketing_house_video_url ?? '',
          description: item.description ?? item.marketing_house_description ?? '',
          marketing_house_category_id: item.marketing_house_category_id?._id || item.marketing_house_category_id,
        });
      }).catch(() => toast.error('Failed to load item')).finally(() => setLoading(false));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await marketingHouseItemApi.update(id, fd); else await marketingHouseItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/marketing/item');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Category + templates ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="form-label">Category <span className="text-red-500">*</span></label>
          <select {...register('marketing_house_category_id', { required: 'Required' })} className="form-select">
            <option value="">Select Category Name</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.category_name}</option>)}
          </select>
          {errors.marketing_house_category_id && <p className="form-error">{String(errors.marketing_house_category_id.message)}</p>}
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
            <option value="">Select Template</option>
            {bookCalls.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Our Advantage</label>
          <select {...register('our_advantage_template_id')} className="form-select">
            <option value="">Select Template</option>
            {advantages.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
      </div>

      {/* ── Highlights ───────────────────────────────────────────── */}
      <div>
        <label className="form-label">Highlights Title</label>
        <input {...register('stats_title')} className="form-input" placeholder="e.g. Teri baton mein uljh jiya! YouTube Marketing Case Studies" />
      </div>
      <div>
        <label className="form-label">Highlights Description</label>
        <textarea {...register('stats_description')} className="form-textarea" placeholder="Enter a short description" />
      </div>

      {/* ── Title + slug ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('title', { required: 'Required' })} className="form-input" placeholder="Enter Campaign title" />
          {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} label="Slug Name" name="marketing_house_slug" />
      </div>

      {/* ── Poster image ─────────────────────────────────────────── */}
      <ImageUpload name="poster_image" label="Poster Image (JPG, PNG, JPEG, GIF — 248px x 368px)" uploadType="image" folder="marketing-house"
        value={watch('poster_image')} onChange={(url) => setValue('poster_image', url)} />

      {/* ── Video (URL or upload) ────────────────────────────────── */}
      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional — choose one method)</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => setVideoTab('url')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Video URL</button>
          <button type="button" onClick={() => setVideoTab('upload')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${videoTab === 'upload' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Upload Video</button>
        </div>
        {videoTab === 'url' ? (
          <input {...register('marketing_video')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="marketing_video" label="Choose Video File (MP4, WEBM, OGG — Max 50MB)" uploadType="video" folder="marketing-house"
            value={watch('marketing_video')} onChange={(url) => setValue('marketing_video', url)} />
        )}
      </div>

      {/* ── Meta: client / release / cast ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="form-label">Client</label><input {...register('client')} className="form-input" placeholder="e.g. Netflix, Excel Entertainment" /></div>
        <div><label className="form-label">Release Date</label><input {...register('release_date')} className="form-input" placeholder="e.g. 29 Jan, 2025" /></div>
        <div><label className="form-label">Cast</label><input {...register('cast')} className="form-input" placeholder="e.g. Pankaj Tripathi, Ali Fazal" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="form-label">Director</label><input {...register('directors')} className="form-input" placeholder="e.g. Sanjay Leela Bhansali" /></div>
        <div><label className="form-label">Language</label><input {...register('language')} className="form-input" placeholder="e.g. Hindi, English, Tamil" /></div>
        <div><label className="form-label">Year</label><input {...register('year')} type="number" className="form-input" placeholder="e.g. 2025" /></div>
      </div>

      {/* ── Description ──────────────────────────────────────────── */}
      <div><label className="form-label">Description</label><textarea {...register('description')} className="form-textarea" placeholder="Short description or summary of the movie/web series" /></div>

      {/* ── Client requirements ──────────────────────────────────── */}
      <div><label className="form-label">Client Requirement Text</label><input {...register('client_requirement_text')} className="form-input" placeholder="Enter a description of the client" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n}>
            <label className="form-label">Client Requirement {n}</label>
            <input {...register(`client_requirement_${n}`)} className="form-input" placeholder={`Specific requirement ${n}`} />
          </div>
        ))}
      </div>

      {/* ── Performance ──────────────────────────────────────────── */}
      <div><label className="form-label">Performance Description</label><textarea {...register('performance_description')} className="form-textarea" placeholder="Enter performance details (engagement, reach, viewership, key highlights)" /></div>

      {/* ── Order + status ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/marketing/item')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Marketing Item' : 'Add Marketing Item'}
        breadcrumbs={[{ label: 'Marketing House' }, { label: 'Items', path: '/marketing/item' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-4xl">{form}</div>
    </div>
  );
}
