import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupRecentWorkApi } from '@/services/adminApi';
import RecentWorkForm from './RecentWorkForm';

export default function RecentWorkList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupRecentWorkApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupRecentWorkApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'recent_work_video_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.recent_work_video_thumbnail} /> },
    { key: 'recent_work_video', label: 'Video', render: (row: any) => <VideoCell src={row.recent_work_video} thumbnail={row.recent_work_video_thumbnail} /> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Recent Work" breadcrumbs={[{ label: 'Group Service' }, { label: 'Recent Work' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <RecentWorkForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Recent Work' : 'Add Recent Work'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
