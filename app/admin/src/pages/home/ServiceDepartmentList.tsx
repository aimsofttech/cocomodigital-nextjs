import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { serviceCategoryApi } from '@/services/adminApi';
import ServiceDepartmentForm from './ServiceDepartmentForm';

export default function ServiceDepartmentList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(serviceCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await serviceCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'icon', label: 'Icon', render: (row: any) => <ImageCell src={row.icon} bg="bg-cocoma-dark" /> },
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage
      title="Service Departments"
      breadcrumbs={[{ label: 'Home' }, { label: 'Service Departments' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) =>
        <ServiceDepartmentForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Service Department' : 'Add Service Department'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
