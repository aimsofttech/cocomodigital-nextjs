import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseFinalOutputApi, creativeHouseItemApi } from '@/services/adminApi';
import FinalOutputForm from './FinalOutputForm';

export default function FinalOutputList() {
  // When navigated from a Creative Item, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('creativeHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(creativeHouseFinalOutputApi, true, itemId ? { creative_house_item_id: itemId } : {});

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { creative_house_item_id: itemId } : {});
  }, [itemId, setFilterParams]);

  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    creativeHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.creative_house_title || data.data?.creative_house_video_title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { creative_house_item_id: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseFinalOutputApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'final_output_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.final_output_thumbnail} /> },
    { key: 'final_output_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.final_output_video_url || row.final_output_upload_video_url} thumbnail={row.final_output_thumbnail} /> },
    { key: 'creative_house_item_name', label: 'Creative Item', sortable: true, render: (row: any) => <span className="block w-40 whitespace-normal break-words">{row.creative_house_item_name || '—'}</span> },
    { key: 'final_output_title', label: 'Title', sortable: true, render: (row: any) => <span className="block w-48 whitespace-normal break-words">{row.final_output_title || '—'}</span> },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  const breadcrumbs = itemId
    ? [{ label: 'Creative House' }, { label: 'Items', path: '/creative/item' }, { label: itemName || 'Item' }, { label: 'Project Media' }]
    : [{ label: 'Creative House' }, { label: 'Item Sections' }, { label: 'Project Media' }];
  return (
    <CrudListPage title={itemName ? `Project Media — ${itemName}` : 'Project Media'} breadcrumbs={breadcrumbs}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <FinalOutputForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Project Media' : 'Add Project Media'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
