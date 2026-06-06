import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { marketingHouseCommunityProgramItemApi, marketingHouseCommunityProgramApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function CommunityProgramItemForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId, itemId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [programs, setPrograms] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<any>();

  useEffect(() => {
    marketingHouseCommunityProgramApi.getAll({ limit: 100 }).then(({ data }) => setPrograms(data.data || []));
    if (isEdit && id) {
      marketingHouseCommunityProgramItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status) });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const onSubmit = async (formData: any) => {
    const fd = new FormData();
    if (itemId) fd.append('marketing_house_item_id', itemId);
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    try {
      if (isEdit && id) await marketingHouseCommunityProgramItemApi.update(id, fd);
      else await marketingHouseCommunityProgramItemApi.create(fd);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Community Program</label>
        <select {...register('community_program_category_id')} className="form-select">
          <option value="">Select program</option>
          {programs.map((p: any) => <option key={p._id} value={p._id}>{p.category_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Item Title</label><input {...register('item_title')} className="form-input" /></div>
        <div><label className="form-label">Video URL</label><input {...register('item_video_url')} className="form-input" placeholder="https://youtube.com/..." /></div>
      </div>
      <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      <ImageUpload name="item_image" label="Item Image" uploadType="image" folder="marketing-house" value={watch('item_image')} onChange={(url) => setValue('item_image', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('display_order')} type="number" className="form-input" defaultValue={0} /></div>
        <div><label className="form-label">Status</label><select {...register('status')} className="form-select"><option value="1">Active</option><option value="0">Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Community Program Item' : 'Add Community Program Item'} breadcrumbs={[{ label: 'Community Program Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
