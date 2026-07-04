import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { topBannerApi } from '@/services/adminApi';
import toast from 'react-hot-toast';
import TopBannerForm from './TopBannerForm';

export default function TopBannerList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(topBannerApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await topBannerApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'videoThumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.videoThumbnail} /> },
    { key: 'videoUrl', label: 'Video', render: (row: any) => <VideoCell src={row.videoUrl} thumbnail={row.videoThumbnail} /> },
    { key: 'heading', label: 'Heading', sortable: true },
    { key: 'country', label: 'Country', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} label={row.heading} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Top Banners" breadcrumbs={[{ label: 'Home' }, { label: 'Top Banners' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <TopBannerForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Top Banner' : 'Add Top Banner'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
