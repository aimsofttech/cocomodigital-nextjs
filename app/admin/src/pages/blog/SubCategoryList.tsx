import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { blogSubCategoryApi } from '@/services/adminApi';
import SubCategoryForm from './SubCategoryForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function SubCategoryList() {
  // When navigated from the Categories page, scope to a single parent category
  // (and pre-select it in the add/edit form).
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('blogCategoryId') || '';
  const scopeFilter = categoryId ? { blogCategoryId: categoryId } : {};

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(blogSubCategoryApi, true, scopeFilter);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: blogSubCategoryApi, data, setData, pagination, fetchAll });

  // Re-apply the scope only when the URL category actually changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(scopeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...scopeFilter, ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await blogSubCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'blogCategoryName', label: 'Category', sortable: true },
    { key: 'name', label: 'Sub Category Name', sortable: true },
    {
      key: 'blog_items_count', label: 'Blog Posts', render: (row: any) => {
        const count = typeof row.blog_items_count === 'number' ? row.blog_items_count : 0;
        return (
          <Link
            to={`/blog/item?blogCategoryId=${row.blogCategoryId}&blogSubCategoryId=${row._id}`}
            title="View / add blog posts for this sub category"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary-200 bg-primary-50/60 hover:bg-primary-100 transition-colors"
          >
            <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-semibold">{count}</span>
            <span className="text-xs font-medium text-primary-700">Blog Posts</span>
          </Link>
        );
      },
    },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Blog Sub Categories" breadcrumbs={[{ label: 'Blog' }, { label: 'Sub Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <SubCategoryForm editId={id} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Blog Sub Category' : 'Add Blog Sub Category'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
