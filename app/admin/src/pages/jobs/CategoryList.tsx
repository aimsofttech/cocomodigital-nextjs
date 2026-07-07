import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { jobCategoryApi } from '@/services/adminApi';
import CategoryForm from './CategoryForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function CategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(jobCategoryApi);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: jobCategoryApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await jobCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'slug', label: 'Slug', sortable: true },
    {
      key: 'navigate', label: 'Navigate To', render: (row: any) => {
        const count = typeof row.job_list_count === 'number' ? row.job_list_count : 0;
        return (
          <Link
            to={`/jobs/list?jobCategoryId=${row._id}`}
            title={`Job List: ${count} record(s)`}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <span>Job List ( {count} )</span>
          </Link>
        );
      },
    },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <div className="category-table-theme">
      <CrudListPage title="Job Categories" breadcrumbs={[{ label: 'Jobs' }, { label: 'Categories' }]}
        columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
        onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
        filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
        renderModal={({ id, onSuccess, onCancel }) => <CategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
        modalTitle={(mode) => mode === 'edit' ? 'Edit Job Category' : 'Add Job Category'}
        modalSize="lg" onRefresh={fetchAll} />
    </div>
  );
}
