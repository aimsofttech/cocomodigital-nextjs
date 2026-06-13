import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseItemApi } from '@/services/adminApi';
import ItemForm from './ItemForm';

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creativeHouseItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }, { key: 'year', label: 'Year', type: 'year' as const }];
  const columns = [
    { key: 'creative_house_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.creative_house_thumbnail} /> },
    { key: 'creative_house_video_url', label: 'Video', render: (row: any) => {
      // A creative item's video may live in any of: a direct/YouTube URL, an
      // uploaded video file, or just a stored YouTube id (legacy rows). Resolve
      // in that order so the cell shows a preview for every row that has a video.
      const videoSrc = row.creative_house_video_url
        || row.creative_house_upload_video_url
        || (row.creative_house_youtube_id ? `https://www.youtube.com/watch?v=${row.creative_house_youtube_id}` : '');
      return <VideoCell src={videoSrc} thumbnail={row.creative_house_thumbnail} />;
    } },
    { key: 'creative_house_video_title', label: 'Video Title', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Creative Items" breadcrumbs={[{ label: 'Creative House' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creative Item' : 'Add Creative Item'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
