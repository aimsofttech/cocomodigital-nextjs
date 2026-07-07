import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import type { FilterField } from '@/components/ui/TableFilter';
import { marketingHouseItemApi, marketingHouseCategoryApi } from '@/services/adminApi';
import { useRowReorder } from '@/hooks/useReorder';

// Navigation target shape returned by the API per item (label + live record count).
type NavTarget = { label: string; segment: string; count?: number | null };

// Each navigation segment maps to its dedicated sidebar page; clicking a target
// opens that page scoped to the item via the `marketingHouseItemId` query param
// (same pattern as Marketing Campaigns → Highlights).
const SEGMENT_ROUTE: Record<string, string> = {
  'statics': '/marketing/highlights',
  'images': '/marketing/poster-media',
  'idea-strategy': '/marketing/idea-strategy-planning',
  'performance': '/marketing/performance',
  'other-activity-category': '/marketing/add-on-activities-category',
  'other-activity-item': '/marketing/add-on-activities-item',
  'content-category': '/marketing/content-category',
  'content-item': '/marketing/content-item',
  'community-program': '/marketing/community-program',
  'community-program-item': '/marketing/community-program-item',
  'faq': '/marketing/faq',
};

const targetHref = (segment: string, itemId: string) => {
  const base = SEGMENT_ROUTE[segment];
  return base
    ? `${base}?marketingHouseItemId=${itemId}`
    : `/marketing/item/${itemId}/${segment}`; // fallback to the item-nested route
};

// Fallback list used only when the API does not return a `navigation` array
// (e.g. older payload or counts unavailable). The canonical source is the
// backend, which derives targets + counts from the sub-module collections.
const NAV_LINKS: NavTarget[] = [
  { label: 'Poster Media', segment: 'images' },
  { label: 'Highlights', segment: 'statics' },
  { label: 'Our Activities', segment: 'idea-strategy' },
  { label: 'Other Act. Cat.', segment: 'other-activity-category' },
  { label: 'Other Act. Items', segment: 'other-activity-item' },
  { label: 'Content Category', segment: 'content-category' },
  { label: 'Content Items', segment: 'content-item' },
  { label: 'Performance', segment: 'performance' },
  { label: 'Continuity Cat.', segment: 'community-program' },
  { label: 'Continuity Items', segment: 'community-program-item' },
  { label: 'FAQ', segment: 'faq' },
];

// Admin-only full-name display labels, keyed by segment. The backend sends
// shortened labels (e.g. 'Other Act. Cat.'); this overrides them for display
// only — the API (segments/routes and backend labels) stays unchanged.
const DISPLAY_LABEL: Record<string, string> = {
  'idea-strategy': 'Our Activities',
  'other-activity-category': 'Add-on Activities Categories',
  'other-activity-item': 'Add-on Activities Items',
  'content-category': 'Content Categories',
  'community-program': 'Continuity Category',
};
const labelFor = (t: NavTarget) => DISPLAY_LABEL[t.segment] ?? t.label;

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(marketingHouseItemApi);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: marketingHouseItemApi, data, setData, pagination, fetchAll });
  const [categories, setCategories] = useState<any[]>([]);

  // Categories for the server-side Category filter dropdown.
  useEffect(() => {
    marketingHouseCategoryApi.getAll({ limit: 100 })
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Category / Status / Year are applied by the API (server-side); the range
  // filters below them refine the currently loaded page client-side.
  const FILTER_FIELDS: FilterField[] = [
    { key: 'status', label: 'Status', type: 'status' },
    {
      key: 'marketingHouseCategoryId', label: 'Category', type: 'select',
      options: [{ value: '', label: 'All Categories' }, ...categories.map((c: any) => ({ value: c._id, label: c.name }))],
    },
    { key: 'year', label: 'Year', type: 'year', serverSide: true },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' },
  ];
  const columns = [
    { key: 'posterImage', label: 'Poster', render: (row: any) => <ImageCell src={row.posterImage} alt={row.title} size="w-36 h-24" /> },
    { key: 'video', label: 'Video', render: (row: any) => <VideoCell src={row.video} thumbnail={row.posterImage} /> },
    { key: 'title', label: 'Title', sortable: true, render: (row: any) => <span className="font-medium text-gray-900">{row.title || 'N/A'}</span> },
    {
      key: 'marketingHouseCategoryId', label: 'Category', render: (row: any) => {
        // The list API returns the raw id; resolve the name from the categories
        // already loaded for the filter dropdown (handles populated objects too).
        const raw = row.marketingHouseCategoryId;
        const id = raw && typeof raw === 'object' ? raw._id : raw;
        const name = (raw && typeof raw === 'object' && raw.name) || categories.find((c: any) => String(c._id) === String(id))?.name;
        return name ? <span className="text-gray-700">{name}</span> : <span className="text-gray-400">N/A</span>;
      },
    },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    {
      key: 'sections', label: 'Sections', render: (row: any) => {
        const targets: NavTarget[] = Array.isArray(row.navigation) && row.navigation.length ? row.navigation : NAV_LINKS;
        const filled = targets.filter((t) => typeof t.count === 'number' && (t.count as number) > 0).length;
        const total = targets.reduce((s, t) => s + (typeof t.count === 'number' ? t.count : 0), 0);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500" title="Expand the row to manage sections">
            <span className="inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full bg-primary-100 text-primary-700 font-semibold">{total}</span>
            <span>{filled}/{targets.length} filled</span>
          </span>
        );
      },
    },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];

  // Expanded panel: the full set of item-sections shown as a neat responsive
  // grid of cards, each linking to its page scoped to this item.
  const renderExpanded = (row: any) => {
    const targets: NavTarget[] = Array.isArray(row.navigation) && row.navigation.length ? row.navigation : NAV_LINKS;
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
          Campaigns Section — {row.title}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {targets.map((t) => {
            const count = typeof t.count === 'number' ? t.count : null;
            const has = !!count && count > 0;
            return (
              <Link
                key={t.segment}
                to={targetHref(t.segment, row._id)}
                title={`${labelFor(t)}: ${count ?? 0} record(s)`}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  has
                    ? 'border-primary-200 bg-primary-50/60 hover:bg-primary-100'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="text-xs font-medium text-gray-700 leading-tight group-hover:text-primary-700">{labelFor(t)}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                    has ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {count ?? 'N/A'}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <CrudListPage title="Marketing Campaigns" breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Campaigns' }]}
      addPath="/marketing/wizard" editPath={(row: any) => `/marketing/wizard?itemId=${row._id}&step=0`}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderExpanded={renderExpanded}
      csv={{ api: marketingHouseItemApi, filename: 'marketing-items' }}
      onRefresh={fetchAll} />
  );
}
