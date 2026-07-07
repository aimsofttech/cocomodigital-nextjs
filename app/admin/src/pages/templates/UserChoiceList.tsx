import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { userChoiceApi } from '@/services/adminApi';
import UserChoiceForm from './UserChoiceForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function UserChoiceList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(userChoiceApi);

  // Drag-and-drop rows to renumber display_order (shared hook).
  const handleReorder = useRowReorder({ api: userChoiceApi, data, setData, pagination, fetchAll, orderField: 'display_order' });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await userChoiceApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'user_choice_image', label: 'Image', render: (row: any) => <ImageCell src={row.user_choice_image} /> },
    { key: 'user_choice_title', label: 'Title', sortable: true },
    { key: 'user_choice_button_text', label: 'Button Text', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="User Choices (Hire Us)" breadcrumbs={[{ label: 'Templates' }, { label: 'User Choice' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <UserChoiceForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit User Choice' : 'Add User Choice'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
