import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { pageApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function PageForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      pageApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && id) await pageApi.update(id, data);
      else await pageApi.create(data);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Page Title <span className="text-red-500">*</span></label>
          <input {...register('page_title', { required: 'Required' })} className="form-input" placeholder="Enter page title" />
          {errors.page_title && <p className="form-error">{String(errors.page_title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
        <div>
          <label className="form-label">Page Slug <span className="text-red-500">*</span></label>
          <input {...register('page_slug', { required: 'Required' })} className="form-input" placeholder="e.g. about-us" />
          {errors.page_slug && <p className="form-error">{String(errors.page_slug.message)}</p>}
        </div>
      </div>
      <div><label className="form-label">Page Content</label><textarea {...register('page_content')} className="form-textarea min-h-48" placeholder="Write the page content…" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Meta Title</label><input {...register('meta_title')} className="form-input" placeholder="Meta title for SEO" /></div>
        <div><label className="form-label">Meta Description</label><input {...register('meta_description')} className="form-input" placeholder="Short description for search engines" /></div>
      </div>
      <div>
        <label className="form-label">Status</label>
        <select {...register('status')} className="form-select">
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
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
      <PageHeader title={isEdit ? 'Edit CMS Page' : 'Add CMS Page'} breadcrumbs={[{ label: 'Pages', path: '/templates/page' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
