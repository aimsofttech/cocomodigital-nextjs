import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseContentItemApi, marketingHouseItemApi } from '@/services/adminApi';
import ContentItemModuleForm from './ContentItemModuleForm';

export default function ContentItemModuleList() {
  // When navigated from a Marketing Item, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  // Seed the filter on first render so the initial fetch is already scoped to the item.
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(marketingHouseContentItemApi, true, itemId ? { marketing_house_item_id: itemId } : {});

  // Re-apply the filter only when the URL id actually changes. Skipped on mount since seeded.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { marketing_house_item_id: itemId } : {});
  }, [itemId, setFilterParams]);

  // Best-effort fetch of the item title for title context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.marketing_house_title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  // Merge the locked item filter with any status filter the user toggles.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { marketing_house_item_id: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseContentItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image || row.item_image} alt="content" /> },
    { key: 'video', label: 'Video', render: (row: any) => <VideoCell src={row.url || row.upload_video_url || row.item_video_url} thumbnail={row.image || row.item_image} /> },
    { key: 'content_created_category_name', label: 'Content Category', render: (row: any) => row.content_created_category_name || '—' },
    { key: 'marketing_house_category_name', label: 'Marketing Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Marketing Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title={itemName ? `Content Items — ${itemName}` : 'Content Items'} breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Content Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <ContentItemModuleForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Content Item' : 'Add Content Item'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
