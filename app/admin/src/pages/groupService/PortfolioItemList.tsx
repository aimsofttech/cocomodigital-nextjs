import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupPortfolioItemApi } from '@/services/adminApi';
import PortfolioItemForm from './PortfolioItemForm';

export default function PortfolioItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupPortfolioItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupPortfolioItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'portfolio_video_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.portfolio_video_thumbnail} /> },
    { key: 'portfolio_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.portfolio_video_url} thumbnail={row.portfolio_video_thumbnail} /> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Portfolio Items" breadcrumbs={[{ label: 'Group Service' }, { label: 'Portfolio Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <PortfolioItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
