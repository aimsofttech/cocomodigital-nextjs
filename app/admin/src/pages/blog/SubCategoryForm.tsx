import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { blogSubCategoryApi, blogCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Category), that parent category is preselected. */
  lockedCategoryId?: string;
}

export default function SubCategoryForm({ onSuccess, onCancel, editId, lockedCategoryId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    blogCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      blogSubCategoryApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // When navigated from the Categories page (create flow), pre-select that parent
  // category once the category options have loaded.
  useEffect(() => {
    if (lockedCategoryId && !isEdit && categories.length) {
      setValue('blogCategoryId', lockedCategoryId);
    }
  }, [lockedCategoryId, isEdit, categories, setValue]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && id) await blogSubCategoryApi.update(id, data);
      else await blogSubCategoryApi.create(data);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/blog/sub-category');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Category Name <span className="text-red-500">*</span></label>
        <select {...register('blogCategoryId', { required: 'Required' })} className="form-select">
          <option value="">Select category</option>
          {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {errors.blogCategoryId && <p className="form-error">{String(errors.blogCategoryId.message)}</p>}
      </div>
      <div>
        <label className="form-label">Sub Category Name <span className="text-red-500">*</span></label>
        <input {...register('name', { required: 'Required' })} className="form-input" placeholder="Enter sub category name" />
        {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} name="slug" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/blog/sub-category')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Blog Sub Category' : 'Add Blog Sub Category'}
        breadcrumbs={[{ label: 'Blog Sub Category', path: '/blog/sub-category' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
