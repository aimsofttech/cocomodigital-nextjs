import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseIdeaStrategyApi } from '@/services/adminApi';
import IdeaStrategyForm from './IdeaStrategyForm';

export default function IdeaStrategyList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseIdeaStrategyApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseIdeaStrategyApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'description', label: 'Description', render: (row: any) => <span className="text-xs text-gray-600 line-clamp-2 max-w-xs">{row.description || '—'}</span> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Idea & Strategy" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Idea Strategy' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <IdeaStrategyForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Idea Strategy' : 'Add Idea Strategy'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
