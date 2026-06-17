import { useParams } from 'react-router-dom';
import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseContentCategoryApi } from '@/services/adminApi';
import ContentCategoryForm from './ContentCategoryForm';

export default function ContentCategoryList() {
  const { itemId } = useParams();
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseContentCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseContentCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'category_name', label: 'Category Name', sortable: true },
    { key: 'navigate_to', label: 'Navigate To', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Content Categories" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Content Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ContentCategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Content Category' : 'Add Content Category'}
      csv={{
        api: marketingHouseContentCategoryApi,
        exportParams: itemId ? { marketing_house_item_id: itemId } : undefined,
        importFields: itemId ? { marketing_house_item_id: itemId } : undefined,
        filename: 'content-categories',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
