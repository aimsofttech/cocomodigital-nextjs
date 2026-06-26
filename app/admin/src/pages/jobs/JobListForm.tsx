import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { jobListApi, jobCategoryApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import ImageUpload from '@/components/ui/ImageUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import MultiSelect from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

const JOB_TYPE_OPTIONS = ['Full Time', 'Part Time', 'Freelance', 'Contract', 'Internship'].map((v) => ({ value: v, label: v }));
const WORKPLACE_OPTIONS = ['On-site', 'Remote', 'Hybrid'].map((v) => ({ value: v, label: v }));
const EXPERIENCE_OPTIONS = ['0 - 1 Year', '1 - 2 Year', '3 - 5 Year', '6 - 8 Year', '9 - 12 Years', '0 - 12 Years', '12+ Years'].map((v) => ({ value: v, label: v }));

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
    // A disabled <select> is excluded from RHF's submission payload, so
    // re-apply the locked category explicitly rather than relying on it.
    if (lockedCategoryId && !isEdit) data.job_category_id = lockedCategoryId;
    try {
      if (isEdit && id) await jobListApi.update(id, data);
      else await jobListApi.create(data);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/jobs/list');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Job Category</label>
        <select
          {...register('job_category_id')}
          className="form-select"
          disabled={Boolean(lockedCategoryId) && !isEdit}
        >
          <option value="">Select category</option>
          {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Job Title <span className="text-red-500">*</span></label>
          <input {...register('job_title', { required: 'Required' })} className="form-input" placeholder="e.g. Senior Video Editor" />
          {errors.job_title && <p className="form-error">{String(errors.job_title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} name="job_slug" />
      </div>
      <div>
        <label className="form-label">Job Type</label>
        <MultiSelect options={JOB_TYPE_OPTIONS} value={watch('job_type')} onChange={(vals) => setValue('job_type', vals, { shouldDirty: true })} placeholder="Select job type(s)" />
      </div>
      <div>
        <label className="form-label">Workplace Type</label>
        <MultiSelect options={WORKPLACE_OPTIONS} value={watch('workplace_type')} onChange={(vals) => setValue('workplace_type', vals, { shouldDirty: true })} placeholder="Select workplace type(s)" />
      </div>
      <div>
        <label className="form-label">Experience</label>
        <MultiSelect options={EXPERIENCE_OPTIONS} value={watch('experience')} onChange={(vals) => setValue('experience', vals, { shouldDirty: true })} placeholder="Select experience" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Location</label><input {...register('job_location')} className="form-input" placeholder="e.g. Mumbai, India" /></div>
        <div><label className="form-label">Salary</label><input {...register('job_salary')} className="form-input" placeholder="e.g. $50,000 - $70,000" /></div>
      </div>
      <div>
        <label className="form-label">Job Description</label>
        <RichTextEditor value={watch('job_description')} onChange={(html) => setValue('job_description', html)} placeholder="Type Job Description here…" minHeight={260} uploadFolder="jobs" />
      </div>
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
