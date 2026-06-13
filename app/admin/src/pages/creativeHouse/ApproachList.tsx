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
    { key: 'approach_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.approach_video_url || row.approach_upload_video_url} thumbnail={row.approach_thumbnail} /> },
    { key: 'creative_house_item_name', label: 'Creative Item', sortable: true, render: (row: any) => <span className="block w-40 whitespace-normal break-words">{row.creative_house_item_name || '—'}</span> },
    { key: 'approach_heading', label: 'Heading', sortable: true, render: (row: any) => <span className="block w-48 whitespace-normal break-words">{row.approach_heading || '—'}</span> },
    { key: 'approach_description', label: 'Description', render: (row: any) => <span className="block w-64 whitespace-normal break-words" title={row.approach_description}>{row.approach_description || '—'}</span> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Creative Approach" breadcrumbs={[{ label: 'Creative House' }, { label: 'Item Sections' }, { label: 'Creative Approach' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ApproachForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creative Approach' : 'Add Creative Approach'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
