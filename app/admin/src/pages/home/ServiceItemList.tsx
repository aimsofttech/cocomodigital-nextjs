import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { serviceItemApi } from '@/services/adminApi';
import ServiceItemForm from './ServiceItemForm';

export default function ServiceItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(serviceItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await serviceItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'service_image', label: 'Image', render: (row: any) => <ImageCell src={row.service_image} size="w-[500px] h-20" /> },
    { key: 'service_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.service_video_url} thumbnail={row.service_image} /> },
    { key: 'department_name', label: 'Department', render: (row: any) => row.department_name || '-' },
    { key: 'service_title', label: 'Category Name', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Service Category" breadcrumbs={[{ label: 'Home' }, { label: 'Service Category' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Service Category' : 'Add Service Category'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
