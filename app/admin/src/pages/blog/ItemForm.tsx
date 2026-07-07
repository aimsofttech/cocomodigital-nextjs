import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { blogItemApi, blogCategoryApi, blogSubCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import RichTextEditor from '@/components/ui/RichTextEditor';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Sub Category), preselect this parent category. */
  lockedCategoryId?: string;
  /** When set (navigated from a Sub Category), preselect this sub category. */
  lockedSubCategoryId?: string;
}

export default function ItemForm({ onSuccess, onCancel, editId, lockedCategoryId, lockedSubCategoryId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('blogCategoryId');

  useEffect(() => {
    blogCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      setLoading(true);
      blogItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (selectedCategory) {
      blogSubCategoryApi.getAll({ blogCategoryId: selectedCategory, limit: 100 }).then(({ data }) => setSubCategories(data.data || []));
    }
  }, [selectedCategory]);

  // When navigated from the Sub Categories page (create flow), pre-select the
  // parent category once the category options have loaded...
  useEffect(() => {
    if (lockedCategoryId && !isEdit && categories.length) {
      setValue('blogCategoryId', lockedCategoryId);
    }
  }, [lockedCategoryId, isEdit, categories, setValue]);

  // ...then pre-select the sub category once its options have loaded.
  useEffect(() => {
    if (lockedSubCategoryId && !isEdit && subCategories.length) {
      setValue('blogSubCategoryId', lockedSubCategoryId);
    }
  }, [lockedSubCategoryId, isEdit, subCategories, setValue]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await blogItemApi.update(id, fd);
      else await blogItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/blog/item');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Category <span className="text-red-500">*</span></label>
          <select {...register('blogCategoryId', { required: 'Required' })} className="form-select">
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {errors.blogCategoryId && <p className="form-error">{String(errors.blogCategoryId.message)}</p>}
        </div>
        <div>
          <label className="form-label">Sub Category</label>
          <select {...register('blogSubCategoryId')} className="form-select">
            <option value="">None</option>
            {subCategories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('title', { required: 'Required' })} className="form-input" placeholder="Enter blog title" />
          {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div>
        <label className="form-label">Description</label>
        <RichTextEditor value={watch('description')} onChange={(html) => setValue('description', html)} placeholder="Type your Description here…" minHeight={260} uploadFolder="blog" />
      </div>
      <ImageUpload name="thumbnail" label="Main Image" uploadType="image" folder="blog" value={watch('thumbnail')} onChange={(url) => setValue('thumbnail', url)} />
      <div><label className="form-label">Meta Title</label><input {...register('metaTitle')} className="form-input" placeholder="Title for search engines" /></div>
      <div><label className="form-label">Meta Description</label><textarea {...register('metaDescription')} className="form-textarea" placeholder="Short description for search engines" /></div>
      <div><label className="form-label">Meta Keywords</label><input {...register('metaKeyword')} className="form-input" placeholder="comma, separated, keywords" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/blog/item')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Blog Post' : 'Add Blog Post'}
        breadcrumbs={[{ label: 'Blog' }, { label: 'Posts', path: '/blog/item' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
