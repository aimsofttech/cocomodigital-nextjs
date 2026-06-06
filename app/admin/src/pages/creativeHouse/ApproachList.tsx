import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseApproachApi } from '@/services/adminApi';
import ApproachForm from './ApproachForm';

export default function ApproachList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creativeHouseApproachApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseApproachApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'approach_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.approach_thumbnail} /> },
    { key: 'approach_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.approach_video_url} thumbnail={row.approach_thumbnail} /> },
    { key: 'approach_title', label: 'Title', sortable: true },
    { key: 'approach_heading', label: 'Heading', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Creative Approaches" breadcrumbs={[{ label: 'Creative House' }, { label: 'Approaches' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ApproachForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creative Approach' : 'Add Creative Approach'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
