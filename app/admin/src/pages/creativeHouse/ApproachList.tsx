import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseApproachApi, creativeHouseItemApi } from '@/services/adminApi';
import ApproachForm from './ApproachForm';

export default function ApproachList() {
  // When navigated from a Creative Item, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('creativeHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(creativeHouseApproachApi, true, itemId ? { creativeHouseItemId: itemId } : {});

  // Re-apply the filter when the URL id changes (navigating between items).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { creativeHouseItemId: itemId } : {});
  }, [itemId, setFilterParams]);

  // Fetch the item title for the heading / breadcrumb context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    creativeHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.videoTitle || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  // Keep the item scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { creativeHouseItemId: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseApproachApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.thumbnail} /> },
    { key: 'videoUrl', label: 'Video', render: (row: any) => <VideoCell src={row.videoUrl || row.uploadVideoUrl} thumbnail={row.thumbnail} /> },
    { key: 'itemName', label: 'Creative Item', sortable: true, render: (row: any) => <span className="block w-40 whitespace-normal break-words">{row.itemName || 'N/A'}</span> },
    { key: 'heading', label: 'Heading', sortable: true, render: (row: any) => <span className="block w-48 whitespace-normal break-words">{row.heading || 'N/A'}</span> },
    { key: 'description', label: 'Description', render: (row: any) => <span className="block w-64 whitespace-normal break-words" title={row.description}>{row.description || 'N/A'}</span> },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  const breadcrumbs = itemId
    ? [{ label: 'Creative House' }, { label: 'Items', path: '/creative/item' }, { label: itemName || 'Item' }, { label: 'Creative Approach' }]
    : [{ label: 'Creative House' }, { label: 'Item Sections' }, { label: 'Creative Approach' }];
  return (
    <CrudListPage title={itemName ? `Creative Approach — ${itemName}` : 'Creative Approach'} breadcrumbs={breadcrumbs}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <ApproachForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Creative Approach' : 'Add Creative Approach'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
