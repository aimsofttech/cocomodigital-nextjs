import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseIdeaStrategyApi } from '@/services/adminApi';
import IdeaStrategyPlanningForm from './IdeaStrategyPlanningForm';

export default function IdeaStrategyPlanningList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseIdeaStrategyApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseIdeaStrategyApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'idea_image', label: 'Image', render: (row: any) => <ImageCell src={row.idea_image || row.image} alt={row.idea_title} /> },
    { key: 'idea_title', label: 'Title', sortable: true, render: (row: any) => row.idea_title || row.title || '—' },
    { key: 'marketing_house_category_name', label: 'Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Idea Strategy Planning" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Idea Strategy Planning' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <IdeaStrategyPlanningForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Idea Strategy Planning' : 'Add Idea Strategy Planning'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
