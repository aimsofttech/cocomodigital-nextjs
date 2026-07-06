import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { marketingHouseImageApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ImageForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<any>();

  useEffect(() => {
    if (isEdit && id) {
      marketingHouseImageApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    if (itemId) fd.append('marketingHouseItemId', itemId);
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await marketingHouseImageApi.update(id, fd);
      else await marketingHouseImageApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Image Title</label><input {...register('image_title')} className="form-input" placeholder="Enter image title" /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <ImageUpload name="image" label="Image" recommended={{ width: 1280, height: 720, ratio: '16:9', formats: 'JPG, PNG, WebP', maxSizeMB: 2, note: 'shown in the campaign hero slider' }} uploadType="image" folder="marketing-house" value={watch('image')} onChange={(url) => setValue('image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" defaultValue={0} placeholder="0" /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Save')}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Update Marketing Image' : 'Add Marketing Image'} breadcrumbs={[{ label: 'Marketing Image', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
