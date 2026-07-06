import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { creatorPlatformApi } from '@/services/adminApi';
import CreatorPlatformForm from './CreatorPlatformForm';

export default function CreatorPlatformList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creatorPlatformApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creatorPlatformApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'creator_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.creator_thumbnail} /> },
    { key: 'creator_title', label: 'Title', sortable: true },
    { key: 'creator_thumbnail_url', label: 'URL', sortable: true, render: (row: any) => row.creator_thumbnail_url ? <a href={row.creator_thumbnail_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{row.creator_thumbnail_url}</a> : 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Creator Platform" breadcrumbs={[{ label: 'Group Service' }, { label: 'Creator Platform' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CreatorPlatformForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creator Platform' : 'Add Creator Platform'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
