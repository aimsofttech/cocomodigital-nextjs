import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { clientApi, authorTemplateApi, bookCallApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  editId?: string;
}

export default function ClientForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [authors, setAuthors] = useState<any[]>([]);
  const [bookCalls, setBookCalls] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    authorTemplateApi.getAll({ limit: 100 }).then(({ data }) => setAuthors(data.data || []));
    bookCallApi.getAll({ limit: 100 }).then(({ data }) => setBookCalls(data.data || []));
    if (isEdit && id) {
      clientApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    try {
      if (isEdit && id) await clientApi.update(id, formData);
      else await clientApi.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate('/home/client');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Success Stories Title <span className="text-red-500">*</span></label>
          <input {...register('client_title', { required: 'Required' })} className="form-input" placeholder="Enter success story title" />
          {errors.client_title && <p className="form-error">{String(errors.client_title.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} name="client_slug" label="Slug" />
      </div>
      <div>
        <label className="form-label">Description</label>
        <input type="hidden" {...register('client_description')} />
        <RichTextEditor value={watch('client_description')} onChange={(html) => setValue('client_description', html, { shouldDirty: true })} placeholder="Write the success story description…" minHeight={320} />
      </div>
      <ImageUpload name="client_img" label="Success Stories Image" uploadType="image" folder="home" value={watch('client_img')} onChange={(url) => setValue('client_img', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Author Template</label>
          <select {...register('author_template_id')} className="form-select">
            <option value="">Select author template</option>
            {authors.map((a: any) => <option key={a._id} value={a._id}>{a.template_name || a.author_name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Book Call Template</label>
          <select {...register('book_call_template_id')} className="form-select">
            <option value="">Select book call template</option>
            {bookCalls.map((b: any) => <option key={b._id} value={b._id}>{b.book_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Service Order</label><input {...register('service_display_order')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate('/home/client')} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Success Stories' : 'Add Success Stories'}
        breadcrumbs={[{ label: 'Success Stories', path: '/home/client' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
