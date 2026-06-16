import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { homePageSectionItemApi, homePageSectionApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedSectionId?: string; }

export default function HomePageSectionItemForm({ onSuccess, onCancel, editId, lockedSectionId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [sections, setSections] = useState<any[]>([]);  // home page sections (categories)
  const editSectionId = useRef('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  useEffect(() => {
    homePageSectionApi.getAll({ limit: 500 }).then(({ data }) => setSections(data.data || []));
    if (isEdit && id) {
      homePageSectionItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        editSectionId.current = item.home_page_section_id ? String(item.home_page_section_id) : '';
        reset({ ...item, status: String(item.status), home_page_section_id: editSectionId.current });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Re-apply the selected category once options are loaded (a select value set
  // before its options render reverts to the placeholder otherwise).
  useEffect(() => {
    if (isEdit && sections.length && editSectionId.current) setValue('home_page_section_id', editSectionId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isEdit]);

  // Preselect the category when adding from a scoped Home Page Sections link.
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedSectionId || !sections.length || lockedApplied.current) return;
    setValue('home_page_section_id', lockedSectionId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedSectionId, isEdit, sections]);

  const onSubmit = async (formData: any) => {
    const payload = { ...formData, home_page_section_id: formData.home_page_section_id || lockedSectionId };
    try {
      if (isEdit && id) await homePageSectionItemApi.update(id, payload);
      else await homePageSectionItemApi.create(payload);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="form-label">Category <span className="text-red-500">*</span></label>
        <select {...register('home_page_section_id', { required: 'Required' })} className="form-select">
          <option value="">Select category</option>
          {sections.map((s: any) => <option key={s._id} value={s._id}>{s.category_name || s.section_name}</option>)}
        </select>
        {errors.home_page_section_id && <p className="form-error">{String(errors.home_page_section_id.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Name <span className="text-red-500">*</span></label>
          <input {...register('name', { required: 'Required' })} className="form-input" placeholder="Enter item name" />
          {errors.name && <p className="form-error">{String(errors.name.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div><label className="form-label">URL</label><input {...register('url')} className="form-input" placeholder="https://..." /></div>
      <ImageUpload name="image" label="Section Item Image" uploadType="image" folder="settings" value={watch('image')} onChange={(url) => setValue('image', url)} />
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
      <PageHeader title={isEdit ? 'Edit Section Item' : 'Add Section Item'} breadcrumbs={[{ label: 'Section Items', path: '/settings/home-section-items' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
