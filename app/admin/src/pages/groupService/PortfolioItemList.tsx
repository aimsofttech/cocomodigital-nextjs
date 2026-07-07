import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupPortfolioItemApi, groupServiceItemApi, groupPortfolioCategoryApi } from '@/services/adminApi';
import PortfolioItemForm from './PortfolioItemForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function PortfolioItemList() {
  // Scoped by Group Service Item (from the items table) or by Portfolio Category
  // (from the category table) depending on which query param is present.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('groupServiceItemId') || '';
  const categoryId = searchParams.get('portfolioCategoryId') || '';
  const scope = itemId
    ? { groupServiceItemId: itemId }
    : categoryId ? { portfolioCategoryId: categoryId } : {};
  const scopeKey = JSON.stringify(scope);

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(groupPortfolioItemApi, true, scope);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: groupPortfolioItemApi, data, setData, pagination, fetchAll });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(scope);
  }, [scopeKey, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...scope, ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupPortfolioItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // All group service items for the server-side Item filter dropdown.
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 })
      .then(({ data }) => setItemOptions(data.data || []))
      .catch(() => {});
  }, []);

  // Portfolio categories for the server-side Category filter dropdown.
  const [pcatOptions, setPcatOptions] = useState<any[]>([]);
  useEffect(() => {
    groupPortfolioCategoryApi.getAll({ limit: 200 })
      .then(({ data }) => setPcatOptions(data.data || []))
      .catch(() => {});
  }, []);

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'groupServiceItemId', label: 'Item', type: 'select' as const,
      options: [{ value: '', label: 'All Items' }, ...itemOptions.map((it: any) => ({ value: String(it._id), label: it.title || it.slug || it._id }))],
    },
    {
      key: 'portfolioCategoryId', label: 'Portfolio Category', type: 'select' as const,
      options: [{ value: '', label: 'All Categories' }, ...pcatOptions.map((c: any) => ({ value: String(c._id), label: c.name }))],
    },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const, serverSide: true },
  ];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image || row.videoThumbnail} /> },
    { key: 'videoUrl', label: 'Video', render: (row: any) => <VideoCell src={row.videoUrl || row.videoUrl} thumbnail={row.image || row.videoThumbnail} /> },
    { key: 'title', label: 'Title', sortable: true, render: (row: any) => row.title || 'N/A' },
    { key: 'name', label: 'Portfolio Category', render: (row: any) => row.categoryName || 'N/A' },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Portfolio Items" breadcrumbs={[{ label: 'Group Service' }, { label: 'Portfolio Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <PortfolioItemForm editId={id} lockedItemId={itemId || undefined} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
