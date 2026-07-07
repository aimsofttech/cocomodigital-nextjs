import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { successStoriesProjectApi } from '@/services/adminApi';
import SuccessStoriesProjectForm from './SuccessStoriesProjectForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function SuccessStoriesProjectList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(successStoriesProjectApi);

  // Drag-and-drop rows to renumber display_order (shared hook).
  const handleReorder = useRowReorder({ api: successStoriesProjectApi, data, setData, pagination, fetchAll, orderField: 'display_order' });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await successStoriesProjectApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'banner_title_template_id', label: 'Banner Template', sortable: true },
    { key: 'book_call_template_id', label: 'Book Call Template', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Success Stories Projects" breadcrumbs={[{ label: 'Templates' }, { label: 'Success Stories Projects' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <SuccessStoriesProjectForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Success Stories Project' : 'Add Success Stories Project'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
