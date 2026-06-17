import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { marketingHouseOtherActivityCategoryApi, marketingHouseItemApi } from '@/services/adminApi';
import OtherActivityCategoryModuleForm from './OtherActivityCategoryModuleForm';

export default function OtherActivityCategoryModuleList() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('marketingHouseItemId') || '';
  const [itemName, setItemName] = useState('');

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(marketingHouseOtherActivityCategoryApi, true, itemId ? { marketing_house_item_id: itemId } : {});

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

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseOtherActivityCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { marketing_house_item_id: itemId } : {}), ...params });

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'category_name', label: 'Category Name', sortable: true, render: (row: any) => row.category_name || '—' },
    { key: 'marketing_house_category_name', label: 'Marketing Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Marketing Item', render: (row: any) => row.marketing_house_item_name || '—' },
    {
      key: 'items_count', label: 'Add-on Activities Items', render: (row: any) => {
        const count = typeof row.items_count === 'number' ? row.items_count : 0;
        const params = new URLSearchParams();
        if (row.marketing_house_item_id) params.set('marketingHouseItemId', String(row.marketing_house_item_id));
        params.set('otherActivityCategoryId', String(row._id));
        return (
          <Link
            to={`/marketing/add-on-activities-item?${params.toString()}`}
            title="View / add items in this category"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary-200 bg-primary-50/60 hover:bg-primary-100 transition-colors"
          >
            <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-semibold">{count}</span>
            <span className="text-xs font-medium text-primary-700">Items</span>
          </Link>
        );
      },
    },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title={itemName ? `Add-on Activities Categories — ${itemName}` : 'Add-on Activities Categories'} breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Add-on Activities Categories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <OtherActivityCategoryModuleForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Add-on Activities Category' : 'Add Add-on Activities Category'}
      csv={{
        api: marketingHouseOtherActivityCategoryApi,
        exportParams: itemId ? { marketing_house_item_id: itemId } : undefined,
        importFields: itemId ? { marketing_house_item_id: itemId } : undefined,
        filename: 'other-activity-categories',
      }}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
