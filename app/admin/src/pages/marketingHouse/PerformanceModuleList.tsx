import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHousePerformanceApi } from '@/services/adminApi';
import PerformanceModuleForm from './PerformanceModuleForm';

export default function PerformanceModuleList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHousePerformanceApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHousePerformanceApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'performance_image', label: 'Image', render: (row: any) => <ImageCell src={row.performance_image || row.image} alt={row.performance_title} /> },
    { key: 'performance_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.performance_video_url} thumbnail={row.performance_image || row.image} /> },
    { key: 'performance_title', label: 'Title', sortable: true, render: (row: any) => row.performance_title || row.title || '—' },
    { key: 'marketing_house_category_name', label: 'Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Performance" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Performance' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <PerformanceModuleForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Performance' : 'Add Performance'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
