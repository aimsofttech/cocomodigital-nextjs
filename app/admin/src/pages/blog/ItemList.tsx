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
  if (categoryId) scopeFilter.blog_category_id = categoryId;
  if (subCategoryId) scopeFilter.blog_sub_category_id = subCategoryId;

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
    { key: 'main_image', label: 'Image', render: (row: any) => <ImageCell src={row.main_image} alt={row.blog_title} /> },
    { key: 'blog_title', label: 'Title', sortable: true },
    { key: 'blog_category_name', label: 'Category', sortable: true },
    { key: 'blog_sub_category_name', label: 'Sub Category', render: (row: any) => row.blog_sub_category_name || '—' },
    { key: 'blog_item_slug', label: 'Slug', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
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
