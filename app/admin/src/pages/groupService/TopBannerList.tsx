import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/components/ui/ViewDetailsModal';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupTopBannerApi } from '@/services/adminApi';
import TopBannerForm from './TopBannerForm';

export default function TopBannerList() {
  // When navigated from a Group Service Category, the Service Category id scopes the list.
  const [searchParams] = useSearchParams();
  const serviceItemId = searchParams.get('serviceItemId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(groupTopBannerApi, true, serviceItemId ? { exploreOurServiceItemId: serviceItemId } : {});

  // Re-apply the scope when the URL id changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(serviceItemId ? { exploreOurServiceItemId: serviceItemId } : {});
  }, [serviceItemId, setFilterParams]);

  // Keep the scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(serviceItemId ? { exploreOurServiceItemId: serviceItemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupTopBannerApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} size="w-36 h-24" /> },
    { key: 'video', label: 'Video', render: (row: any) => <VideoCell src={row.video} thumbnail={row.image} size="w-36 h-24" /> },
    { key: 'departmentName', label: 'Department', render: (row: any) => row.departmentName || 'N/A' },
    { key: 'serviceCategoryName', label: 'Service Category', render: (row: any) => row.serviceCategoryName || 'N/A' },
    { key: 'heading', label: 'Heading', sortable: true },
    { key: 'subHeading', label: 'Sub Heading', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Group Top Banners" breadcrumbs={[{ label: 'Group Service' }, { label: 'Top Banners' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      viewDetails={(row: any) => ({
        title: 'Group Top Banner Details',
        media: row.image
          ? <img src={row.image} alt="Banner" className="max-h-56 rounded-xl object-contain" />
          : undefined,
        fields: [
          { label: 'Heading', value: row.heading, full: true },
          { label: 'Sub Heading', value: row.subHeading, full: true },
          { label: 'Department', value: row.departmentName },
          { label: 'Service Category', value: row.serviceCategoryName },
          {
            label: 'Video',
            full: true,
            value: row.video ? (
              <a href={row.video} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                {row.video}
              </a>
            ) : undefined,
          },
          { label: 'Video Type', value: row.videoType },
          { label: 'Button Text', value: row.buttonText },
          { label: 'Button URL', value: row.buttonUrl },
          { label: 'Display Order', value: row.displayOrder },
          { label: 'Status', value: <StatusBadge status={row.status} /> },
          { label: 'Slug', value: row.slug },
          { label: 'Created At', value: formatDateTime(row.createdAt) },
          { label: 'Updated At', value: formatDateTime(row.updatedAt) },
        ],
      })}
      renderModal={({ id, onSuccess, onCancel }) => <TopBannerForm editId={id} lockedServiceItemId={serviceItemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Top Banner' : 'Add Group Top Banner'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
