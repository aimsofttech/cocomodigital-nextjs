import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { creativeHouseCategoryApi } from '@/services/adminApi';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creativeHouseCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ];
  const columns = [
    { key: 'icon', label: 'Icon', render: (row: any) => <ImageCell src={row.icon} bg="bg-gray-800" size='w-12 h-12' /> },
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'slug', label: 'Slug', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Creative Categories" breadcrumbs={[{ label: 'Creative House' }, { label: 'Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creative Category' : 'Add Creative Category'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
