import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupServiceCategoryApi, serviceCategoryApi, serviceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import SlugField from '@/components/ui/SlugField';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; }

export default function ServiceCategoryForm({ onSuccess, onCancel, editId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  // departments = explore_our_service_category, serviceItems = explore_our_service_item
  const [departments, setDepartments] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>({ defaultValues: { status: '1' } });

  useEffect(() => {
    serviceCategoryApi.getAll({ limit: 200 }).then(({ data }) => setDepartments(data.data || []));
    serviceItemApi.getAll({ limit: 500 }).then(({ data }) => setServiceItems(data.data || []));
    if (isEdit && id) {
      groupServiceCategoryApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? ''),
          explore_our_service_category_id: item.explore_our_service_category_id ?? '',
          explore_our_service_item_id: item.explore_our_service_item_id ?? '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const selectedDept = watch('explore_our_service_category_id');
  const selectedItem = watch('explore_our_service_item_id');
  // Show only Service Categories belonging to the chosen Department; always keep
  // the currently-selected one visible so edits don't lose their value.
  const itemOptions = serviceItems.filter(
    (it: any) =>
      !selectedDept ||
      String(it.service_category_id) === String(selectedDept) ||
      String(it._id) === String(selectedItem)
  );

  const onSubmit = async (formData: any) => {
    try {
      // Build an explicit payload so join-only fields surfaced on edit
      // (department_name, category_name) are never written back to the document.
      const payload = {
        explore_our_service_category_id: formData.explore_our_service_category_id,
        explore_our_service_item_id: formData.explore_our_service_item_id,
        group_service_category_name: formData.group_service_category_name,
        slug: formData.slug,
        display_order: Number(formData.display_order) || 0,
        status: Number(formData.status),
      };
      if (isEdit && id) await groupServiceCategoryApi.update(id, payload);
      else await groupServiceCategoryApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Service Department Name <span className="text-red-500">*</span></label>
          <select {...register('explore_our_service_category_id', { required: 'Required' })} className="form-select">
            <option value="">Select department</option>
            {departments.map((d: any) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          {errors.explore_our_service_category_id && <p className="form-error">{String(errors.explore_our_service_category_id.message)}</p>}
        </div>
        <div>
          <label className="form-label">Service Category Name <span className="text-red-500">*</span></label>
          <select {...register('explore_our_service_item_id', { required: 'Required' })} className="form-select">
            <option value="">Select category</option>
            {itemOptions.map((it: any) => (
              <option key={it._id} value={it._id}>{it.service_title}</option>
            ))}
          </select>
          {errors.explore_our_service_item_id && <p className="form-error">{String(errors.explore_our_service_item_id.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Group Service Category Name <span className="text-red-500">*</span></label>
          <input {...register('group_service_category_name', { required: 'Required' })} className="form-input" placeholder="Enter Group Service Category Name" />
          {errors.group_service_category_name && <p className="form-error">{String(errors.group_service_category_name.message)}</p>}
        </div>
        <SlugField register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Display Section Order</label>
          <input {...register('display_order')} type="number" className="form-input" placeholder="Order number. e.g. 1, 2, 3" defaultValue={0} />
        </div>
        <div>
          <label className="form-label">Status <span className="text-red-500">*</span></label>
          <select {...register('status', { required: 'Required' })} className="form-select">
            <option value="">Select status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {errors.status && <p className="form-error">{String(errors.status.message)}</p>}
        </div>
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
      <PageHeader title={isEdit ? 'Edit Service Category Display Section' : 'Add Service Category Display Section'} breadcrumbs={[{ label: 'Group Service Category', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
