import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { groupServiceItemApi, groupServiceCategoryApi, serviceCategoryApi, serviceItemApi } from '@/services/adminApi';
import { useRowReorder } from '@/hooks/useReorder';

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

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(groupServiceItemApi, true, categoryId ? { groupServiceCategoryId: categoryId } : {});

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: groupServiceItemApi, data, setData, pagination, fetchAll });

  // Re-apply the scope when the URL id changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(categoryId ? { groupServiceCategoryId: categoryId } : {});
  }, [categoryId, setFilterParams]);

  // Keep the category scope when other filters change.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(categoryId ? { groupServiceCategoryId: categoryId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Dropdown options for the server-side filters: group categories,
  // departments (ServiceCategory) and service categories (ServiceItem).
  const [groupCats, setGroupCats] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [serviceCats, setServiceCats] = useState<any[]>([]);
  useEffect(() => {
    groupServiceCategoryApi.getAll({ limit: 200 })
      .then(({ data }) => setGroupCats(data.data || []))
      .catch(() => { });
    serviceCategoryApi.getAll({ limit: 200 })
      .then(({ data }) => setDepartments(data.data || []))
      .catch(() => { });
    serviceItemApi.getAll({ limit: 500 })
      .then(({ data }) => setServiceCats(data.data || []))
      .catch(() => { });
  }, []);

  // Every filter is applied by the API (see groupServiceItemController:
  // department/service-category resolve to matching group categories, the
  // date range maps to createdAtFrom/createdAtTo in crudFactory).
  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'exploreOurServiceCategoryId', label: 'Department', type: 'select' as const,
      options: [{ value: '', label: 'All Departments' }, ...departments.map((d: any) => ({ value: String(d._id), label: d.name }))],
    },
    {
      key: 'exploreOurServiceItemId', label: 'Service Category', type: 'select' as const,
      options: [{ value: '', label: 'All Service Categories' }, ...serviceCats.map((s: any) => ({ value: String(s._id), label: s.title }))],
    },
    {
      key: 'groupServiceCategoryId', label: 'Group Category', type: 'select' as const,
      options: [{ value: '', label: 'All Group Categories' }, ...groupCats.map((c: any) => ({ value: String(c._id), label: c.name }))],
    },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const, serverSide: true },
  ];
  const columns = [
    {
      key: 'thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.thumbnail}
        size="w-40 h-22 min-w-[10rem] max-w-none flex-shrink-0" />
    },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'departmentName', label: 'Department', render: (row: any) => row.departmentName || 'N/A' },
    { key: 'serviceCategoryName', label: 'Service Categories', render: (row: any) => row.serviceCategoryName || 'N/A' },
    { key: 'groupCategoryName', label: 'Group Categories', render: (row: any) => row.groupCategoryName || 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
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
      addPath="/group-service/wizard" editPath={(row: any) => `/group-service/wizard?itemId=${row._id}&step=0`}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      onRefresh={fetchAll} />
  );
}
