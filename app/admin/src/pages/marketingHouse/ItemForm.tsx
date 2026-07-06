import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
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
  /** Called after save; receives the saved record (e.g. to read the new _id). */
  onSuccess?: (saved?: any) => void;
  onCancel?: () => void;
  editId?: string;
}

// Best-effort display label for the template dropdowns (records use different
// name fields: author/our-advantage → template_name, book-call → book_name).
const tName = (t: any) =>
  t.template_name || t.book_name || t.author_name || t.name || t.title || t._id;

// Small "open the module's listing page" link shown next to a field label.
// Opens in a new tab so the form being filled is not lost.
const moduleLink = (path: string, name: string) => (
  <Link
    to={path}
    target="_blank"
    rel="noopener noreferrer"
    title={`Open the ${name} module`}
    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
  >
    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> {name}
  </Link>
);

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
          title: item.title ?? item.title ?? '',
          posterImage: item.posterImage ?? item.thumbnail ?? '',
          video: item.video ?? item.videoUrl ?? '',
          description: item.description ?? item.description ?? '',
          marketingHouseCategoryId: item.marketingHouseCategoryId?._id || item.marketingHouseCategoryId,
        });
      }).catch(() => toast.error('Failed to load item')).finally(() => setLoading(false));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    // Numeric / required / managed fields: never send these as an empty string
    // (would cast-error or fail validation). They always carry a value anyway.
    const keepOnlyIfFilled = new Set(['displayOrder', 'status', 'marketingHouseCategoryId']);
    Object.entries(formData).forEach(([k, v]) => {
      // Never stringify objects/arrays into "[object Object]" — skip them.
      if (v !== null && typeof v === 'object') return;
      const isEmpty = v === undefined || v === null || v === '';
      if (isEmpty) {
        // On EDIT, forward empty strings so cleared fields (e.g. a removed Client
        // Requirement) are actually unset through the API. On CREATE, skip empties
        // so schema defaults apply. Always skip numeric/required fields.
        if (isEdit && !keepOnlyIfFilled.has(k)) fd.append(k, '');
        return;
      }
      fd.append(k, String(v));
    });
    try {
      const res = isEdit && id ? await marketingHouseItemApi.update(id, fd) : await marketingHouseItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(res?.data?.data); else navigate('/marketing/item');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Category + templates ─────────────────────────────────── */}
      {/* Each label carries a link to its module's listing page (opens in a
          new tab so the half-filled form is not lost). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="form-label flex items-center justify-between gap-2">
            <span>Category <span className="text-red-500">*</span></span>
            {moduleLink('/marketing/category', 'Categories')}
          </label>
          <select {...register('marketingHouseCategoryId', { required: 'Required' })} className="form-select">
            <option value="">Select Category Name</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {errors.marketingHouseCategoryId && <p className="form-error">{String(errors.marketingHouseCategoryId.message)}</p>}
        </div>
        <div>
          <label className="form-label flex items-center justify-between gap-2">
            <span>Author</span>
            {moduleLink('/templates/author', 'Author')}
          </label>
          <select {...register('authorTemplateId')} className="form-select">
            <option value="">Select Author</option>
            {authors.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label flex items-center justify-between gap-2">
            <span>Book Call</span>
            {moduleLink('/templates/book-call', 'Book Call')}
          </label>
          <select {...register('bookCallTemplateId')} className="form-select">
            <option value="">Select Template</option>
            {bookCalls.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label flex items-center justify-between gap-2">
            <span>Our Advantage</span>
            {moduleLink('/templates/our-advantage', 'Our Advantage')}
          </label>
          <select {...register('ourAdvantageTemplateId')} className="form-select">
            <option value="">Select Template</option>
            {advantages.map((t: any) => <option key={t._id} value={t._id}>{tName(t)}</option>)}
          </select>
        </div>
      </div>

      {/* ── Highlights ───────────────────────────────────────────── */}
      <div>
        <label className="form-label">Highlights Title</label>
        <input {...register('statsTitle')} className="form-input" placeholder="e.g. Teri baton mein uljh jiya! YouTube Marketing Case Studies" />
      </div>
      <div>
        <label className="form-label">Highlights Description</label>
        <textarea {...register('statsDescription')} className="form-textarea" placeholder="Enter a short description" />
      </div>

      {/* ── Title + slug ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('title', { required: 'Required' })} className="form-input" placeholder="Enter Campaign title" />
          {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} label="Slug Name" name="slug" />
      </div>

      {/* ── Poster image ─────────────────────────────────────────── */}
      <ImageUpload name="posterImage" label="Poster Image (JPG, PNG, JPEG, GIF — 248px x 368px)" uploadType="image" folder="marketing-house"
        value={watch('posterImage')} onChange={(url) => setValue('posterImage', url)} />

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
          <input {...register('video')} className="form-input" placeholder="https://youtube.com/..." />
        ) : (
          <ImageUpload name="video" label="Choose Video File (MP4, WEBM, OGG — Max 50MB)" uploadType="video" folder="marketing-house"
            value={watch('video')} onChange={(url) => setValue('video', url)} />
        )}
      </div>

      {/* ── Meta: client / release / cast ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="form-label">Client</label><input {...register('client')} className="form-input" placeholder="e.g. Netflix, Excel Entertainment" /></div>
        <div><label className="form-label">Release Date</label><input {...register('releaseDate')} className="form-input" placeholder="e.g. 29 Jan, 2025" /></div>
        <div><label className="form-label">Cast</label><input {...register('cast')} className="form-input" placeholder="e.g. Pankaj Tripathi, Ali Fazal" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="form-label">Director</label><input {...register('directors')} className="form-input" placeholder="e.g. Sanjay Leela Bhansali" /></div>
        <div><label className="form-label">Language</label><input {...register('language')} className="form-input" placeholder="e.g. Hindi, English, Tamil" /></div>
        <div><label className="form-label">Year</label><input {...register('year')} type="number" className="form-input" placeholder="e.g. 2025" /></div>
      </div>

      {/* ── Description ──────────────────────────────────────────── */}
      <div><label className="form-label">Description</label><textarea {...register('description')} className="form-textarea" placeholder="Short description or summary of the movie/web series" /></div>

      {/* ── Client goals (stored in the clientRequirement* fields) ── */}
      <div><label className="form-label">Client Goals Text</label><input {...register('clientRequirementText')} className="form-input" placeholder="Enter a description of the client" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n}>
            <label className="form-label">Client Goals {n}</label>
            <input {...register(`clientRequirement${n}`)} className="form-input" placeholder={`Specific goal ${n}`} />
          </div>
        ))}
      </div>

      {/* ── Performance ──────────────────────────────────────────── */}
      <div><label className="form-label">Performance Description</label><textarea {...register('performanceDescription')} className="form-textarea" placeholder="Enter performance details (engagement, reach, viewership, key highlights)" /></div>

      {/* ── Order + status ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
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
      <PageHeader title={isEdit ? 'Edit Marketing Campaign' : 'Add Marketing Campaign'}
        breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Campaigns', path: '/marketing/item' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-4xl">{form}</div>
    </div>
  );
}
