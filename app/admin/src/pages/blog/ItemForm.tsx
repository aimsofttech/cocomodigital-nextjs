import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { blogItemApi, blogCategoryApi, blogSubCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

export default function ItemForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedCategory = watch('blog_category_id');

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
      blogSubCategoryApi.getAll({ blog_category_id: selectedCategory, limit: 100 }).then(({ data }) => setSubCategories(data.data || []));
    }
  }, [selectedCategory]);

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
          <select {...register('blog_category_id', { required: 'Required' })} className="form-select">
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.blog_category_name}</option>)}
          </select>
          {errors.blog_category_id && <p className="form-error">{String(errors.blog_category_id.message)}</p>}
        </div>
        <div>
          <label className="form-label">Sub Category</label>
          <select {...register('blog_sub_category_id')} className="form-select">
            <option value="">None</option>
            {subCategories.map((c: any) => <option key={c._id} value={c._id}>{c.blog_sub_category_name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Title <span className="text-red-500">*</span></label>
        <input {...register('blog_title', { required: 'Required' })} className="form-input" placeholder="Enter blog title" />
        {errors.blog_title && <p className="form-error">{String(errors.blog_title.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Item Slug</label><input {...register('blog_item_slug')} className="form-input" placeholder="auto-generated — you can edit" /></div>
        <div><label className="form-label">Blog Slug</label><input {...register('blog_slug')} className="form-input" placeholder="auto-generated — you can edit" /></div>
      </div>
      <div><label className="form-label">Description</label><textarea {...register('blog_description')} className="form-textarea min-h-48" placeholder="Write a short description…" /></div>
      <ImageUpload name="main_image" label="Main Image" uploadType="image" folder="blog" value={watch('main_image')} onChange={(url) => setValue('main_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Meta Keywords</label><input {...register('blog_meta_keyword')} className="form-input" placeholder="comma, separated, keywords" /></div>
        <div><label className="form-label">Meta Description</label><textarea {...register('blog_meta_description')} className="form-textarea" placeholder="Short description for search engines" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="0">Draft</option><option value="1">Published</option></select></div>
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
