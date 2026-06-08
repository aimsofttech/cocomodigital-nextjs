import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseOtherActivityCategoryApi } from '@/services/adminApi';
import OtherActivityCategoryModuleForm from './OtherActivityCategoryModuleForm';

export default function OtherActivityCategoryModuleList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseOtherActivityCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseOtherActivityCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'category_name', label: 'Category Name', sortable: true, render: (row: any) => row.category_name || '—' },
    { key: 'marketing_house_category_name', label: 'Marketing Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Marketing Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Other Activities Categories" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Other Activities Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <OtherActivityCategoryModuleForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Other Activity Category' : 'Add Other Activity Category'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
