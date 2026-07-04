import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { groupTopBannerApi, serviceCategoryApi, serviceItemApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface Props { onSuccess?: () => void; onCancel?: () => void; editId?: string; lockedServiceItemId?: string; }

type VideoTab = 'upload' | 'url';

export default function TopBannerForm({ onSuccess, onCancel, editId, lockedServiceItemId }: Props = {}) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const isModal = Boolean(onSuccess ?? onCancel);
  const id = isModal ? editId : paramId;
  const isEdit = Boolean(id);
  // departments = explore_our_service_category, serviceItems = explore_our_service_item
  const [departments, setDepartments] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [videoTab, setVideoTab] = useState<VideoTab>('upload');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>({ defaultValues: { status: '1' } });

  useEffect(() => {
    serviceCategoryApi.getAll({ limit: 200 }).then(({ data }) => setDepartments(data.data || []));
    serviceItemApi.getAll({ limit: 500 }).then(({ data }) => setServiceItems(data.data || []));
    if (isEdit && id) {
      groupTopBannerApi.getOne(id).then(({ data }) => {
        const item = data.data;
        reset({
          ...item,
          status: String(item.status ?? '1'),
          exploreOurServiceCategoryId: item.exploreOurServiceCategoryId ?? '',
          exploreOurServiceItemId: item.exploreOurServiceItemId ?? '',
        });
        if (item.videoType === 'url') setVideoTab('url');
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const selectedDept = watch('exploreOurServiceCategoryId');
  const selectedSvcItem = watch('exploreOurServiceItemId');

  // Preselect the Service Category when adding from a scoped link. Wait until the
  // options are loaded — setting a <select> value before its <option>s exist
  // leaves the native select on the placeholder. Apply once.
  const lockedApplied = useRef(false);
  useEffect(() => {
    if (isEdit || !lockedServiceItemId || !serviceItems.length || lockedApplied.current) return;
    setValue('exploreOurServiceItemId', lockedServiceItemId);
    lockedApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedServiceItemId, isEdit, serviceItems]);

  // Derive Department from the chosen Service Category (back-fills blanks only,
  // and only once the department options exist so the select can show it).
  useEffect(() => {
    if (!selectedSvcItem || !serviceItems.length || !departments.length || selectedDept) return;
    const it = serviceItems.find((s: any) => String(s._id) === String(selectedSvcItem));
    if (it?.service_category_id) setValue('exploreOurServiceCategoryId', String(it.service_category_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSvcItem, serviceItems, departments, selectedDept]);

  // Service Category options scoped to the chosen Department (keep current selection visible).
  const svcItemOptions = serviceItems.filter(
    (it: any) => !selectedDept || String(it.service_category_id) === String(selectedDept) || String(it._id) === String(selectedSvcItem)
  );

  const deptReg = register('exploreOurServiceCategoryId', { required: 'Required' });

  const switchVideoTab = (tab: VideoTab) => {
    setVideoTab(tab);
    setValue('video', '');
    setValue('videoType', tab);
  };

  const onSubmit = async (formData: any) => {
    try {
      // Explicit payload keeps the request to the real banner fields only.
      const payload = {
        exploreOurServiceCategoryId: formData.exploreOurServiceCategoryId,
        exploreOurServiceItemId: formData.exploreOurServiceItemId,
        heading: formData.heading,
        subHeading: formData.subHeading,
        image: formData.image,
        video: formData.video || '',
        videoType: formData.video ? videoTab : '',
        buttonText: formData.buttonText,
        displayOrder: Number(formData.displayOrder) || 0,
        status: Number(formData.status),
      };
      if (isEdit && id) await groupTopBannerApi.update(id, payload);
      else await groupTopBannerApi.create(payload);
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      if (onSuccess) onSuccess(); else navigate(-1);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Department Name <span className="text-red-500">*</span></label>
          <select
            {...deptReg}
            onChange={(e) => { deptReg.onChange(e); setValue('explore_our_service_item_id', ''); }}
            className="form-select"
          >
            <option value="">Select department</option>
            {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          {errors.exploreOurServiceCategoryId && <p className="form-error">{String(errors.exploreOurServiceCategoryId.message)}</p>}
        </div>
        <div>
          <label className="form-label">Service Category Name <span className="text-red-500">*</span></label>
          <select {...register('exploreOurServiceItemId', { required: 'Required' })} className="form-select">
            <option value="">Select category</option>
            {svcItemOptions.map((it: any) => <option key={it._id} value={it._id}>{it.service_title}</option>)}
          </select>
          {errors.exploreOurServiceItemId && <p className="form-error">{String(errors.exploreOurServiceItemId.message)}</p>}
        </div>
      </div>

      <div>
        <label className="form-label">Banner Heading <span className="text-red-500">*</span></label>
        <input {...register('heading', { required: 'Required' })} className="form-input" placeholder="Enter Banner Heading" />
        {errors.heading && <p className="form-error">{String(errors.heading.message)}</p>}
      </div>

      <div>
        <label className="form-label">Banner Sub Heading</label>
        <textarea {...register('subHeading')} className="form-textarea" rows={3} placeholder="Enter Banner Subheading" />
      </div>

      <ImageUpload
        name="image"
        label="Banner Image (Upload only JPG, PNG, JPEG, GIF — 706px × 665px)"
        uploadType="image"
        folder="group-service"
        accept="image/jpeg,image/png,image/gif"
        value={watch('image')}
        onChange={(url) => setValue('image', url)}
      />

      <div>
        <label className="form-label">Video <span className="text-gray-400 font-normal">(Optional - Choose one method)</span></label>
        <div className="flex gap-2 border-b border-gray-200">
          <button type="button" className={tabClass(videoTab === 'upload')} onClick={() => switchVideoTab('upload')}>Upload Video</button>
          <button type="button" className={tabClass(videoTab === 'url')} onClick={() => switchVideoTab('url')}>Video URL</button>
        </div>
        <div className="border border-t-0 border-gray-200 rounded-b-lg p-4">
          {videoTab === 'upload' ? (
            <ImageUpload
              name="video"
              label="Choose Video File (MP4, WEBM, OGG - Max 50MB)"
              uploadType="video"
              folder="group-service"
              value={watch('video')}
              onChange={(url) => { setValue('video', url); setValue('videoType', 'upload'); }}
            />
          ) : (
            <div>
              <label className="form-label">Video URL</label>
              <input
                className="form-input"
                placeholder="https://youtube.com/... or video URL"
                value={watch('video') || ''}
                onChange={(e) => { setValue('video', e.target.value); setValue('videoType', 'url'); }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Banner CTA Button</label>
          <input {...register('buttonText')} className="form-input" placeholder="Enter Banner CTA Button Text" />
        </div>
        <div>
          <label className="form-label">Banner Display Order</label>
          <input {...register('displayOrder')} type="number" className="form-input" placeholder="Order number. e.g. 1, 2, 3" defaultValue={0} />
        </div>
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

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => onCancel ? onCancel() : navigate(-1)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
      </div>
    </form>
  );

  if (isModal) return form;
  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Group Top Banner' : 'Add Group Top Banner'} breadcrumbs={[{ label: 'Group Top Banner', path: '../' }, { label: isEdit ? 'Edit' : 'Add' }]} />
      <div className="card max-w-3xl">{form}</div>
    </div>
  );
}
