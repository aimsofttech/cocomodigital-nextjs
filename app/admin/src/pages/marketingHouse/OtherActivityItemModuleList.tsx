import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseOtherActivityItemApi, marketingHouseItemApi } from '@/services/adminApi';
import OtherActivityItemModuleForm from './OtherActivityItemModuleForm';

export default function OtherActivityItemModuleList() {
  // When navigated from a Marketing Item, the item id arrives as a query param
  // and scopes the whole page (list + create/edit) to that item.
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  // When navigated from the Categories page, the page is also scoped to a single
  // activity category (which the add/edit form then pre-selects).
  const categoryId = searchParams.get('otherActivityCategoryId') || '';
  const [itemName, setItemName] = useState('');

  // Combined scope from whatever params are present (item and/or category).
  const scopeFilter: Record<string, any> = {
    ...(itemId ? { marketing_house_item_id: itemId } : {}),
    ...(categoryId ? { marketing_house_other_activity_category_id: categoryId } : {}),
  };

  // Seed the filter on first render so the initial fetch is already scoped.
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(marketingHouseOtherActivityItemApi, true, scopeFilter);

  // Re-apply the filter only when the URL scope actually changes. Skipped on mount
  // since it's already seeded.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(scopeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, categoryId, setFilterParams]);

  // Best-effort fetch of the item title for title context.
  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.marketing_house_title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseOtherActivityItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Merge the locked item filter with any status filter the user toggles, so the
  // item scope is never lost when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...scopeFilter, ...params });

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image1', label: 'Image', render: (row: any) => <ImageCell src={row.image1 || row.image2 || row.image3 || row.image4 || row.item_image} alt="activity" /> },
    { key: 'video1', label: 'Video', render: (row: any) => <VideoCell src={row.video1 || row.video2 || row.video3 || row.video4 || row.item_video_url} thumbnail={row.image1 || row.image2 || row.item_image} /> },
    { key: 'item_title', label: 'Title', sortable: true, render: (row: any) => row.item_title || row.title || '—' },
    { key: 'item_description', label: 'Description', render: (row: any) => {
      const text = String(row.item_description || row.description || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      return <span className="text-xs text-gray-600 line-clamp-2 max-w-md min-w-[20rem] block" title={text}>{text || '—'}</span>;
    } },
    { key: 'other_activity_category_name', label: 'Activity Category', render: (row: any) => row.other_activity_category_name || '—' },
    { key: 'marketing_house_category_name', label: 'Marketing Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Marketing Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title={itemName ? `Add-on Activities Items — ${itemName}` : 'Add-on Activities Items'} breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Add-on Activities Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <OtherActivityItemModuleForm editId={id} lockedItemId={itemId || undefined} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Add-on Activities Item' : 'Add Add-on Activities Item'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
