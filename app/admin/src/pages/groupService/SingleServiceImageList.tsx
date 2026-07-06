import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { groupSingleServiceImageApi, groupServiceItemApi } from '@/services/adminApi';
import SingleServiceImageForm from './SingleServiceImageForm';

export default function SingleServiceImageList() {
  // Scoped to a Group Service Item when navigated from the items table.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('groupServiceItemId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(groupSingleServiceImageApi, true, itemId ? { groupServiceItemId: itemId } : {});

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { groupServiceItemId: itemId } : {});
  }, [itemId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { groupServiceItemId: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupSingleServiceImageApi.update(id, { status: newStatus });
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

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'groupServiceItemId', label: 'Item', type: 'select' as const,
      options: [{ value: '', label: 'All Items' }, ...itemOptions.map((it: any) => ({ value: String(it._id), label: it.title || it.slug || it._id }))],
    },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} /> },
    { key: 'videoUrl', label: 'Video', render: (row: any) => <VideoCell src={row.videoUrl} thumbnail={row.image} /> },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Single Service Images" breadcrumbs={[{ label: 'Group Service' }, { label: 'Service Images' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <SingleServiceImageForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Single Service Image' : 'Add Single Service Image'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
