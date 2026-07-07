import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupServiceItemApi, groupServiceCategoryApi, serviceCategoryApi, serviceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import SlugField from '@/components/ui/SlugField';
import RichTextEditor from '@/components/ui/RichTextEditor';
import toast from 'react-hot-toast';

interface Props {
  /** Called after save; receives the saved record (e.g. to read the new _id). */
  onSuccess?: (saved?: any) => void;
  onCancel?: () => void;
  editId?: string;
  lockedCategoryId?: string;
}

export default function ServiceItemForm({ onSuccess, onCancel, editId, lockedCategoryId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState<any[]>([]);  // group service categories
  const [departments, setDepartments] = useState<any[]>([]); // explore_our_service_category
  const [serviceItems, setServiceItems] = useState<any[]>([]); // explore_our_service_item
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>();

  const selectedDept = watch('exploreOurServiceCategoryId');
  const selectedSvcItem = watch('exploreOurServiceItemId');
  const selectedGroupCat = watch('groupServiceCategoryId');

  useEffect(() => {
    groupServiceCategoryApi.getAll({ limit: 500 }).then(({ data }) => setCategories(data.data || []));
    serviceCategoryApi.getAll({ limit: 200 }).then(({ data }) => setDepartments(data.data || []));
    serviceItemApi.getAll({ limit: 500 }).then(({ data }) => setServiceItems(data.data || []));
    if (isEdit && id) {
      groupServiceItemApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({ ...item, status: String(item.status), groupServiceCategoryId: item.groupServiceCategoryId?._id || item.groupServiceCategoryId });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  // Preselect the Group Category when adding from a scoped link. Wait until the
  // options are loaded — setting a <select> value before its <option>s exist
  // leaves the native select on the placeholder. Apply once.
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedCategoryId || !categories.length || lockedApplied.current) return;
    setValue('groupServiceCategoryId', lockedCategoryId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCategoryId, isEdit, categories]);

  // Derive Department + Service Category from the chosen Group Category (prefills on
  // edit and back-fills when a Group Category is picked directly). Only fills blanks,
  // and only once the dependent option lists exist so the selects can show them.
  useEffect(() => {
    if (!selectedGroupCat || !categories.length || !departments.length || !serviceItems.length) return;
    const gc = categories.find((c: any) => String(c._id) === String(selectedGroupCat));
    if (!gc) return;
    if (gc.exploreOurServiceCategoryId && !selectedDept) setValue('exploreOurServiceCategoryId', String(gc.exploreOurServiceCategoryId));
    if (gc.exploreOurServiceItemId && !selectedSvcItem) setValue('exploreOurServiceItemId', String(gc.exploreOurServiceItemId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupCat, categories, departments, serviceItems]);

  // Service Category options scoped to the chosen Department (keep current selection visible).
  const svcItemOptions = serviceItems.filter(
    (it: any) => !selectedDept || String(it.serviceCategoryId) === String(selectedDept) || String(it._id) === String(selectedSvcItem)
  );
  // Group Category options scoped to the chosen Department + Service Category.
  const groupCatOptions = categories.filter(
    (c: any) =>
      String(c._id) === String(selectedGroupCat) ||
      ((!selectedDept || String(c.exploreOurServiceCategoryId) === String(selectedDept)) &&
        (!selectedSvcItem || String(c.exploreOurServiceItemId) === String(selectedSvcItem)))
  );

  const deptReg = register('exploreOurServiceCategoryId');
  const svcItemReg = register('exploreOurServiceItemId');

  const onSubmit = async (formData: any) => {
    try {
      // Explicit payload: keeps join-only fields surfaced on edit
      // (departmentName, serviceCategoryName, groupCategoryName) out of writes.
      const payload = {
        groupServiceCategoryId: formData.groupServiceCategoryId,
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        thumbnail: formData.thumbnail,
        displayOrder: Number(formData.displayOrder) || 0,
        status: Number(formData.status),
      };
      const res = isEdit && id ? await groupServiceItemApi.update(id, payload) : await groupServiceItemApi.create(payload);
      toast.success(isEdit ? 'Updated' : 'Created');
      if (onSuccess) onSuccess(res?.data?.data); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Service Department</label>
          <select
            {...deptReg}
            onChange={(e) => { deptReg.onChange(e); setValue('exploreOurServiceItemId', ''); setValue('groupServiceCategoryId', ''); }}
            className="form-select"
          >
            <option value="">All departments</option>
            {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Service Category</label>
          <select
            {...svcItemReg}
            onChange={(e) => { svcItemReg.onChange(e); setValue('groupServiceCategoryId', ''); }}
            className="form-select"
          >
            <option value="">All service categories</option>
            {svcItemOptions.map((it: any) => <option key={it._id} value={it._id}>{it.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Group Category <span className="text-red-500">*</span></label>
        <select {...register('groupServiceCategoryId', { required: 'Required' })} className="form-select">
          <option value="">Select group category</option>
          {groupCatOptions.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {errors.groupServiceCategoryId && <p className="form-error">{String(errors.groupServiceCategoryId.message)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input {...register('title', { required: 'Required' })} className="form-input" placeholder="Enter service item title" />
          {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
        </div>
        <SlugField name="slug" register={register} watch={watch} setValue={setValue} isEdit={isEdit} />
      </div>
      <div>
        <label className="form-label">Description</label>
        <RichTextEditor value={watch('description')} onChange={(html) => setValue('description', html)} placeholder="Describe the service item…" minHeight={220} />
      </div>
      <ImageUpload name="thumbnail" label="Thumbnail" recommended={{ width: 900, height: 600, ratio: '3:2', formats: 'JPG, PNG, WebP', maxSizeMB: 2 }} uploadType="image" folder="group-service" value={watch('thumbnail')} onChange={(url) => setValue('thumbnail', url)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="form-label">Display Order</label><input {...register('displayOrder')} type="number" className="form-input" placeholder="0" defaultValue={0} /></div>
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
      <PageHeader title={isEdit ? 'Edit Group Service Item' : 'Add Group Service Item'} breadcrumbs={[{ label: 'Group Service Item', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-2xl">{form}</div>
    </div>
  );
}
