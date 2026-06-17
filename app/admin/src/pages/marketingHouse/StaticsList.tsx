import { useParams } from 'react-router-dom';
import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseStaticsApi } from '@/services/adminApi';
import StaticsForm from './StaticsForm';

export default function StaticsList() {
  const { itemId } = useParams();
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseStaticsApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseStaticsApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'value', label: 'Value', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Marketing Statics" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Statics' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <StaticsForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Marketing Statics' : 'Add Marketing Statics'}
      csv={{
        api: marketingHouseStaticsApi,
        exportParams: itemId ? { marketing_house_item_id: itemId } : undefined,
        importFields: itemId ? { marketing_house_item_id: itemId } : undefined,
        filename: 'marketing-statics',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
