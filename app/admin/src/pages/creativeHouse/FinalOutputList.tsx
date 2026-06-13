import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseFinalOutputApi } from '@/services/adminApi';
import FinalOutputForm from './FinalOutputForm';

export default function FinalOutputList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creativeHouseFinalOutputApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseFinalOutputApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'final_output_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.final_output_thumbnail} /> },
    { key: 'final_output_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.final_output_video_url || row.final_output_upload_video_url} thumbnail={row.final_output_thumbnail} /> },
    { key: 'creative_house_item_name', label: 'Creative Item', sortable: true, render: (row: any) => <span className="block w-40 whitespace-normal break-words">{row.creative_house_item_name || '—'}</span> },
    { key: 'final_output_title', label: 'Title', sortable: true, render: (row: any) => <span className="block w-48 whitespace-normal break-words">{row.final_output_title || '—'}</span> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Project Media" breadcrumbs={[{ label: 'Creative House' }, { label: 'Item Sections' }, { label: 'Project Media' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <FinalOutputForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Project Media' : 'Add Project Media'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
