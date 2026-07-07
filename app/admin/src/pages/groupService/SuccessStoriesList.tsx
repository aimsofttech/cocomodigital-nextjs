import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { successStoriesApi } from '@/services/adminApi';
import SuccessStoriesForm from './SuccessStoriesForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function SuccessStoriesList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(successStoriesApi);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: successStoriesApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await successStoriesApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'success_stories_img', label: 'Image', render: (row: any) => <ImageCell src={row.success_stories_img} /> },
    { key: 'success_stories_title', label: 'Title', sortable: true },
    { key: 'success_stories_url', label: 'URL', sortable: true, render: (row: any) => row.success_stories_url ? <a href={row.success_stories_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{row.success_stories_url}</a> : 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Success Stories" breadcrumbs={[{ label: 'Group Service' }, { label: 'Success Stories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <SuccessStoriesForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Success Stories' : 'Add Success Stories'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
