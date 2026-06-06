import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupTopBannerApi } from '@/services/adminApi';
import TopBannerForm from './TopBannerForm';

export default function TopBannerList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupTopBannerApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupTopBannerApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'group_banner_img', label: 'Image', render: (row: any) => <ImageCell src={row.group_banner_img} /> },
    { key: 'group_banner_video', label: 'Video', render: (row: any) => <VideoCell src={row.group_banner_video} thumbnail={row.group_banner_img} /> },
    { key: 'group_banner_heading', label: 'Heading', sortable: true },
    { key: 'group_banner_subheading', label: 'Sub Heading', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Group Top Banners" breadcrumbs={[{ label: 'Group Service' }, { label: 'Top Banners' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <TopBannerForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Top Banner' : 'Add Group Top Banner'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
