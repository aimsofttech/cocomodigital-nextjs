import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { VideoCell } from '@/components/ui/MediaCell';
import { galleryVideoApi } from '@/services/adminApi';
import VideoForm from './VideoForm';

export default function VideoList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(galleryVideoApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await galleryVideoApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'video_file', label: 'Video', render: (row: any) => <VideoCell src={row.video_file} /> },
    { key: 'video_title', label: 'Title', sortable: true },
    { key: 'video_type', label: 'Type', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Gallery Videos" breadcrumbs={[{ label: 'Gallery' }, { label: 'Videos' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <VideoForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Gallery Video' : 'Add Gallery Video'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
