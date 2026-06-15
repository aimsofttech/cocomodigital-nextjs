import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { groupServiceCategoryApi } from '@/services/adminApi';
import ServiceCategoryForm from './ServiceCategoryForm';

export default function ServiceCategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupServiceCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'group_service_category_name', label: 'Category Name', sortable: true },
    { key: 'department_name', label: 'Department Name', render: (row: any) => row.department_name || '-' },
    { key: 'category_name', label: 'Categories Name', render: (row: any) => row.category_name || '-' },
    { key: 'display_direction', label: 'Direction', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage
      title="Group Service Categories"
      breadcrumbs={[{ label: 'Group Service' },
      { label: 'Categories' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceCategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Service Category' : 'Add Group Service Category'}
      modalSize="xl"
      onRefresh={fetchAll}
    />
  );
}
