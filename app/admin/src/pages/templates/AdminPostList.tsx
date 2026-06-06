import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { adminPostApi } from '@/services/adminApi';
import AdminPostForm from './AdminPostForm';

export default function AdminPostList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(adminPostApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await adminPostApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'post_image', label: 'Image', render: (row: any) => <ImageCell src={row.post_image} /> },
    { key: 'post_title', label: 'Title', sortable: true },
    { key: 'post_status', label: 'Post Status', sortable: true, render: (row: any) => <span className={`badge ${row.post_status === 'published' ? 'badge-success' : 'badge-warning'}`}>{row.post_status || 'draft'}</span> },
    { key: 'status', label: 'Active', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Admin Posts" breadcrumbs={[{ label: 'Templates' }, { label: 'Admin Posts' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <AdminPostForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Admin Post' : 'Add Admin Post'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
