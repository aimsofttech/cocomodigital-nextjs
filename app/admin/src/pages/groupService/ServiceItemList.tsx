import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { groupServiceItemApi } from '@/services/adminApi';
import ServiceItemForm from './ServiceItemForm';

export default function ServiceItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupServiceItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'group_service_item_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.group_service_item_thumbnail} /> },
    { key: 'group_service_item_title', label: 'Title', sortable: true },
    { key: 'department_name', label: 'Department', render: (row: any) => row.department_name || '-' },
    { key: 'service_category_name', label: 'Service Categories', render: (row: any) => row.service_category_name || '-' },
    { key: 'group_category_name', label: 'Group Categories', render: (row: any) => row.group_category_name || '-' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Group Service Items" breadcrumbs={[{ label: 'Group Service' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Service Item' : 'Add Group Service Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
