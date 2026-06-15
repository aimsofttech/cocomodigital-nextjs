import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupTopBannerApi } from '@/services/adminApi';
import TopBannerForm from './TopBannerForm';

export default function TopBannerList() {
  // When navigated from a Group Service Category, the Service Category id scopes the list.
  const [searchParams] = useSearchParams();
  const serviceItemId = searchParams.get('serviceItemId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(groupTopBannerApi, true, serviceItemId ? { explore_our_service_item_id: serviceItemId } : {});

  // Re-apply the scope when the URL id changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(serviceItemId ? { explore_our_service_item_id: serviceItemId } : {});
  }, [serviceItemId, setFilterParams]);

  // Keep the scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(serviceItemId ? { explore_our_service_item_id: serviceItemId } : {}), ...params });

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
    { key: 'group_banner_img', label: 'Image', render: (row: any) => <ImageCell src={row.group_banner_img} size="w-36 h-24" /> },
    { key: 'group_banner_video', label: 'Video', render: (row: any) => <VideoCell src={row.group_banner_video} thumbnail={row.group_banner_img} size="w-36 h-24" /> },
    { key: 'department_name', label: 'Department', render: (row: any) => row.department_name || '-' },
    { key: 'service_category_name', label: 'Service Category', render: (row: any) => row.service_category_name || '-' },
    { key: 'group_banner_heading', label: 'Heading', sortable: true },
    { key: 'group_banner_subheading', label: 'Sub Heading', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Group Top Banners" breadcrumbs={[{ label: 'Group Service' }, { label: 'Top Banners' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <TopBannerForm editId={id} lockedServiceItemId={serviceItemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Top Banner' : 'Add Group Top Banner'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
