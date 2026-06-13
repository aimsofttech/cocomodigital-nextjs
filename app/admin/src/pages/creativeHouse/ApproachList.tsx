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
    useCrud(creativeHouseApproachApi, true, itemId ? { creative_house_item_id: itemId } : {});

  // Re-apply the filter when the URL id changes (navigating between items).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { creative_house_item_id: itemId } : {});
  }, [itemId, setFilterParams]);

  // Fetch the item title for the heading / breadcrumb context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    creativeHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.creative_house_title || data.data?.creative_house_video_title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  // Keep the item scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { creative_house_item_id: itemId } : {}), ...params });

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
    { key: 'approach_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.approach_thumbnail} /> },
    { key: 'approach_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.approach_video_url || row.approach_upload_video_url} thumbnail={row.approach_thumbnail} /> },
    { key: 'creative_house_item_name', label: 'Creative Item', sortable: true, render: (row: any) => <span className="block w-40 whitespace-normal break-words">{row.creative_house_item_name || '—'}</span> },
    { key: 'approach_heading', label: 'Heading', sortable: true, render: (row: any) => <span className="block w-48 whitespace-normal break-words">{row.approach_heading || '—'}</span> },
    { key: 'approach_description', label: 'Description', render: (row: any) => <span className="block w-64 whitespace-normal break-words" title={row.approach_description}>{row.approach_description || '—'}</span> },
    { key: 'display_order', label: 'Order', sortable: true },
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
