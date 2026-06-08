import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHousePreLaunchApi, marketingHouseItemApi } from '@/services/adminApi';
import PreLaunchActivityForm from './PreLaunchActivityForm';

export default function PreLaunchActivityList() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(marketingHousePreLaunchApi, true, itemId ? { marketing_house_item_id: itemId } : {});

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { marketing_house_item_id: itemId } : {});
  }, [itemId, setFilterParams]);

  useEffect(() => {
    if (!itemId) { setItemName(''); return; }
    marketingHouseItemApi.getOne(itemId)
      .then(({ data }) => setItemName(data.data?.title || data.data?.marketing_house_title || ''))
      .catch(() => setItemName(''));
  }, [itemId]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { marketing_house_item_id: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHousePreLaunchApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'activity_image', label: 'Image', render: (row: any) => <ImageCell src={row.activity_image || row.image} alt={row.activity_title} /> },
    { key: 'activity_title', label: 'Title', sortable: true, render: (row: any) => row.activity_title || row.title || '—' },
    { key: 'marketing_house_category_name', label: 'Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title={itemName ? `PreLaunched Activity — ${itemName}` : 'PreLaunched Activity'} breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'PreLaunched Activity' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <PreLaunchActivityForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit PreLaunched Activity' : 'Add PreLaunched Activity'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
