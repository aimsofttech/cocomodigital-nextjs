import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { devHouseItemApi } from '@/services/adminApi';
import ItemForm from './ItemForm';

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(devHouseItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await devHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'development_house_img', label: 'Image', render: (row: any) => <ImageCell src={row.development_house_img} /> },
    { key: 'development_house_url', label: 'URL', sortable: true, render: (row: any) => row.development_house_url ? <a href={row.development_house_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs truncate max-w-xs block">{row.development_house_url}</a> : '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Development Items" breadcrumbs={[{ label: 'Development House' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Dev House Item' : 'Add Dev House Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
