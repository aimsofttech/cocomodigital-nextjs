import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseStaticsApi, marketingHouseItemApi } from '@/services/adminApi';
import HighlightsForm from './HighlightsForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function HighlightsList() {
  // When navigated from a Marketing Campaign, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  // Seed the filter on first render so the initial (and only) fetch is already
  // scoped to the item — no wasted unfiltered request.
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(marketingHouseStaticsApi, true, itemId ? { marketingHouseItemId: itemId } : {});

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: marketingHouseStaticsApi, data, setData, pagination, fetchAll });

  // Re-apply the filter only when the URL id actually changes (e.g. navigating
  // between items without a remount). Skipped on mount since it's already seeded.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { marketingHouseItemId: itemId } : {});
  }, [itemId, setFilterParams]);

  // Best-effort fetch of the item title for breadcrumb / title context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseStaticsApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Merge the locked item filter with any status filter the user toggles, so the
  // item scope is never lost when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { marketingHouseItemId: itemId } : {}), ...params });

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
    { key: 'name', label: 'Name', sortable: true },
    { key: 'value', label: 'Value', sortable: true },
    { key: 'categoryName', label: 'Category', render: (row: any) => row.categoryName || 'N/A' },
    { key: 'itemName', label: 'Campaign', render: (row: any) => row.itemName || 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];

  const breadcrumbs = itemId
    ? [{ label: 'Marketing Campaigns' }, { label: 'Items', path: '/marketing/item' }, { label: itemName || 'Item' }, { label: 'Highlights' }]
    : [{ label: 'Marketing Campaigns' }, { label: 'Highlights' }];

  return (
    <CrudListPage title={itemName ? `Highlights — ${itemName}` : 'Highlights'} breadcrumbs={breadcrumbs}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <HighlightsForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Highlight' : 'Add Highlight'}
      csv={{
        api: marketingHouseStaticsApi,
        exportParams: itemId ? { marketingHouseItemId: itemId } : undefined,
        importFields: itemId ? { marketingHouseItemId: itemId } : undefined,
        filename: 'highlights',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
