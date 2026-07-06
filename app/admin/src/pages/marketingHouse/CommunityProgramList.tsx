import { useParams } from 'react-router-dom';
import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseCommunityProgramApi } from '@/services/adminApi';
import CommunityProgramForm from './CommunityProgramForm';

export default function CommunityProgramList() {
  const { itemId } = useParams();
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseCommunityProgramApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseCommunityProgramApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'name', label: 'Program Name', sortable: true },
    { key: 'description', label: 'Description', render: (row: any) => <span className="text-xs text-gray-600 line-clamp-2 max-w-xs">{row.description || 'N/A'}</span> },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Community Programs" breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Community Programs' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CommunityProgramForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Community Program' : 'Add Community Program'}
      csv={{
        api: marketingHouseCommunityProgramApi,
        exportParams: itemId ? { marketingHouseItemId: itemId } : undefined,
        importFields: itemId ? { marketingHouseItemId: itemId } : undefined,
        filename: 'community-programs',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
