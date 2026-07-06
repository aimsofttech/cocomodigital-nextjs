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
  // When navigated from a Marketing Campaign, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  // Seed the filter on first render so the initial fetch is already scoped to the item.
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(marketingHouseContentItemApi, true, itemId ? { marketingHouseItemId: itemId } : {});

  // Re-apply the filter only when the URL id actually changes. Skipped on mount since seeded.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { marketingHouseItemId: itemId } : {});
  }, [itemId, setFilterParams]);

  // Best-effort fetch of the item title for title context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  // Merge the locked item filter with any status filter the user toggles.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { marketingHouseItemId: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseContentItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // All-campaign dropdown options for the server-side Campaign filter.
  const [campaignOptions, setCampaignOptions] = useState<any[]>([]);
  useEffect(() => {
    marketingHouseItemApi.getAll({ limit: 500 })
      .then(({ data }) => setCampaignOptions(data.data || []))
      .catch(() => {});
  }, []);

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'marketingHouseItemId', label: 'Campaign', type: 'select' as const,
      options: [{ value: '', label: 'All Campaigns' }, ...campaignOptions.map((it: any) => ({ value: it._id, label: it.title || it.slug || it._id }))],
    },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image || row.image} alt="content" /> },
    { key: 'video', label: 'Video', render: (row: any) => <VideoCell src={row.url || row.upload_video_url || row.item_video_url} thumbnail={row.image || row.image} /> },
    { key: 'content_created_name', label: 'Content Category', render: (row: any) => row.content_created_name || 'N/A' },
    { key: 'categoryName', label: 'Marketing Category', render: (row: any) => row.categoryName || 'N/A' },
    { key: 'itemName', label: 'Marketing Campaign', render: (row: any) => row.itemName || 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title={itemName ? `Content Items — ${itemName}` : 'Content Items'} breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Campaigns Section' }, { label: 'Content Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <ContentItemModuleForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Content Item' : 'Add Content Item'}
      csv={{
        api: marketingHouseContentItemApi,
        exportParams: itemId ? { marketingHouseItemId: itemId } : undefined,
        importFields: itemId ? { marketingHouseItemId: itemId } : undefined,
        filename: 'content-items',
      }}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
