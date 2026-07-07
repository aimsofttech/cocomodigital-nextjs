import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { userChoiceApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function UserChoiceForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      userChoiceApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await userChoiceApi.update(id, formData);
      else await userChoiceApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Title <span className="text-red-500">*</span></label>
        <input {...register('user_choice_title', { required: 'Required' })} className="form-input" placeholder="Enter title" />
        {errors.user_choice_title && <p className="form-error">{String(errors.user_choice_title.message)}</p>}
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <div><label className="form-label">Description</label><textarea {...register('user_choice_description')} className="form-textarea" placeholder="Write a short description…" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Button Text</label><input {...register('user_choice_button_text')} className="form-input" placeholder="e.g. Learn More" /></div>
        <div><label className="form-label">Button URL</label><input {...register('user_choice_button_url')} className="form-input" placeholder="https://example.com" /></div>
      </div>
      <ImageUpload name="user_choice_image" label="Choice Image" recommended={{ width: 1200, height: 800, ratio: '3:2', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }} uploadType="image" folder="templates" value={watch('user_choice_image')} onChange={(url) => setValue('user_choice_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
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
      <PageHeader title={isEdit ? 'Edit User Choice' : 'Add User Choice'} breadcrumbs={[{ label: 'User Choice', path: '/templates/user-choice' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
