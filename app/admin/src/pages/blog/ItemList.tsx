import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { blogItemApi } from '@/services/adminApi';
import ItemForm from './ItemForm';

export default function ItemList() {
  // When navigated from the Sub Categories page, scope to a single category /
  // sub category (and pre-select them in the add/edit form).
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('blogCategoryId') || '';
  const subCategoryId = searchParams.get('blogSubCategoryId') || '';
  const scopeFilter: Record<string, any> = {};
  if (categoryId) scopeFilter.blogCategoryId = categoryId;
  if (subCategoryId) scopeFilter.blogSubCategoryId = subCategoryId;

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(blogItemApi, true, scopeFilter);

  // Re-apply the scope only when the URL category/sub category actually changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(scopeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, subCategoryId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...scopeFilter, ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await blogItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'thumbnail', label: 'Image', render: (row: any) => <ImageCell src={row.thumbnail} alt={row.title} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'blogCategoryName', label: 'Category', sortable: true },
    { key: 'blogSubCategoryName', label: 'Sub Category', render: (row: any) => row.blogSubCategoryName || 'N/A' },
    { key: 'slug', label: 'Slug', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Blog Posts" breadcrumbs={[{ label: 'Blog' }, { label: 'Posts' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <ItemForm editId={id} lockedCategoryId={categoryId || undefined} lockedSubCategoryId={subCategoryId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Blog Post' : 'Add Blog Post'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
