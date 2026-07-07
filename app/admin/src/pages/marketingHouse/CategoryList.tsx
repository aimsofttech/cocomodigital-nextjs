import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseCategoryApi } from '@/services/adminApi';
import CategoryForm from './CategoryForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function CategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(marketingHouseCategoryApi);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: marketingHouseCategoryApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'icon', label: 'Icon', render: (row: any) => <ImageCell src={row.icon} bg="bg-black" size="w-10 h-10" /> },
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Marketing Categories" breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Marketing Category' : 'Add Marketing Category'}
      csv={{ api: marketingHouseCategoryApi, filename: 'marketing-categories' }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
