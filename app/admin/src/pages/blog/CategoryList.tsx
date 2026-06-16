import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { blogCategoryApi } from '@/services/adminApi';
import CategoryForm from './CategoryForm';

export default function CategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(blogCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await blogCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'blog_category_name', label: 'Category Name', sortable: true },
    {
      key: 'sub_categories_count', label: 'Sub Categories', render: (row: any) => {
        const count = typeof row.sub_categories_count === 'number' ? row.sub_categories_count : 0;
        return (
          <Link
            to={`/blog/sub-category?blogCategoryId=${row._id}`}
            title="View / add sub categories for this category"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary-200 bg-primary-50/60 hover:bg-primary-100 transition-colors"
          >
            <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-semibold">{count}</span>
            <span className="text-xs font-medium text-primary-700">Sub Categories</span>
          </Link>
        );
      },
    },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Blog Categories" breadcrumbs={[{ label: 'Blog' }, { label: 'Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <CategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Blog Category' : 'Add Blog Category'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
