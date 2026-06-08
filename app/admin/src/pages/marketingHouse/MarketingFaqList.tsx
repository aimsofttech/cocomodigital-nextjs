import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseFaqApi } from '@/services/adminApi';
import MarketingFaqForm from './MarketingFaqForm';

export default function MarketingFaqList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseFaqApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseFaqApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'question', label: 'Question', sortable: true, render: (row: any) => <span className="font-medium">{row.question || '—'}</span> },
    { key: 'answer', label: 'Answer', render: (row: any) => <span className="text-xs text-gray-600 line-clamp-2 max-w-md">{row.answer || '—'}</span> },
    { key: 'marketing_house_category_name', label: 'Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="FAQ" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'FAQ' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <MarketingFaqForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit FAQ' : 'Add FAQ'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
