import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { devHouseCategoryApi } from '@/services/adminApi';
import CategoryForm from './CategoryForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function CategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(devHouseCategoryApi);

  // Drag-and-drop rows to renumber display_order (shared hook).
  const handleReorder = useRowReorder({ api: devHouseCategoryApi, data, setData, pagination, fetchAll, orderField: 'display_order' });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await devHouseCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'development_house_category_name', label: 'Category Name', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Development Categories" breadcrumbs={[{ label: 'Development House' }, { label: 'Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Dev House Category' : 'Add Dev House Category'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
