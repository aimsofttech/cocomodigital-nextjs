import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { groupServiceItemApi } from '@/services/adminApi';
import ServiceItemForm from './ServiceItemForm';

// Item-sections reachable from a Group Service Item, scoped via ?groupServiceItemId.
const SEGMENT_ROUTE: Record<string, string> = {
  'media': '/group-service/single-service-image',
  'recent-work': '/group-service/recent-work',
  'portfolio-category': '/group-service/portfolio-category',
  'portfolio-item': '/group-service/portfolio-item',
  'faq': '/group-service/faq',
};
const targetHref = (segment: string, itemId: string) =>
  `${SEGMENT_ROUTE[segment] || '/group-service/item'}?groupServiceItemId=${itemId}`;

export default function ServiceItemList() {
  // When navigated from a Group Service Category, the category id scopes the list.
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('groupServiceCategoryId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(groupServiceItemApi, true, categoryId ? { group_service_category_id: categoryId } : {});

  // Re-apply the scope when the URL id changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(categoryId ? { group_service_category_id: categoryId } : {});
  }, [categoryId, setFilterParams]);

  // Keep the category scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(categoryId ? { group_service_category_id: categoryId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'group_service_item_thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.group_service_item_thumbnail} /> },
    { key: 'group_service_item_title', label: 'Title', sortable: true },
    { key: 'department_name', label: 'Department', render: (row: any) => row.department_name || '-' },
    { key: 'service_category_name', label: 'Service Categories', render: (row: any) => row.service_category_name || '-' },
    { key: 'group_category_name', label: 'Group Categories', render: (row: any) => row.group_category_name || '-' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
    {
      key: 'navigate', label: 'Navigate To', render: (row: any) => {
        const targets = Array.isArray(row.navigation) ? row.navigation : [];
        if (!targets.length) return '-';
        return (
          <div className="flex flex-col gap-1.5">
            {targets.map((t: any) => (
              <Link
                key={t.segment}
                to={targetHref(t.segment, row._id)}
                title={typeof t.count === 'number' ? `${t.label}: ${t.count} record(s)` : t.label}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs font-medium whitespace-nowrap transition-colors"
              >
                <span>{t.label}{typeof t.count === 'number' ? ` ( ${t.count} )` : ''}</span>
              </Link>
            ))}
          </div>
        );
      },
    },
  ];
  return (
    <CrudListPage title="Group Service Items" breadcrumbs={[{ label: 'Group Service' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceItemForm editId={id} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Service Item' : 'Add Group Service Item'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
