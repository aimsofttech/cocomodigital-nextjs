import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { jobListApi, jobCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
  /** When set (navigated from a Category), that category is preselected. */
  lockedCategoryId?: string;
}

export default function JobListForm({ onSuccess, onCancel, editId, lockedCategoryId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    jobCategoryApi.getAll({ limit: 100 }).then(({ data }) => setCategories(data.data || []));
    if (isEdit && id) {
      jobListApi.getOne(id).then(({ data }) => {
        reset({ ...data.data, status: String(data.data.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // When navigated from the Categories page (create flow), pre-select that
  // category once the category options have loaded.
  useEffect(() => {
    if (lockedCategoryId && !isEdit && categories.length) {
      setValue('job_category_id', lockedCategoryId);
    }
  }, [lockedCategoryId, isEdit, categories, setValue]);

  const onSubmit = async (data: any) => {
    try {
      if (isEdit && id) await jobListApi.update(id, data);
      else await jobListApi.create(data);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/jobs/list');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Job Category</label>
          <select {...register('job_category_id')} className="form-select">
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Job Title <span className="text-red-500">*</span></label>
          <input {...register('job_title', { required: 'Required' })} className="form-input" placeholder="e.g. Senior Video Editor" />
          {errors.job_title && <p className="form-error">{String(errors.job_title.message)}</p>}
        </div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div>
        <label className="form-label">Job Slug</label>
        <input {...register('job_slug')} className="form-input" placeholder="auto-generated — you can edit" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Job Type</label>
          <select {...register('job_type')} className="form-select">
            <option value="">Select type</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>
        <div>
          <label className="form-label">Workplace Type</label>
          <select {...register('workplace_type')} className="form-select">
            <option value="">Select</option>
            <option value="Remote">Remote</option>
            <option value="On-site">On-site</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
        <div><label className="form-label">Experience</label><input {...register('job_experience')} className="form-input" placeholder="e.g. 2-3 years" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Location</label><input {...register('job_location')} className="form-input" placeholder="e.g. Mumbai, India" /></div>
        <div><label className="form-label">Salary</label><input {...register('job_salary')} className="form-input" placeholder="e.g. $50,000 - $70,000" /></div>
      </div>
      <div><label className="form-label">Job Description</label><textarea {...register('job_description')} className="form-textarea min-h-48" placeholder="Write a short description of the role…" /></div>
      <ImageUpload name="job_image" label="Image" uploadType="image" folder="jobs" value={watch('job_image')} onChange={(url) => setValue('job_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/jobs/list')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Job Listing' : 'Add Job Listing'}
        breadcrumbs={[{ label: 'Job Listings', path: '/jobs/list' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
