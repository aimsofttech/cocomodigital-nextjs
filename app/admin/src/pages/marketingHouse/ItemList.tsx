import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseItemApi } from '@/services/adminApi';
import ItemForm from './ItemForm';

// Navigation target shape returned by the API per item (label + live record count).
type NavTarget = { label: string; segment: string; count?: number | null };

// Fallback list used only when the API does not return a `navigation` array
// (e.g. older payload or counts unavailable). The canonical source is the
// backend, which derives targets + counts from the sub-module collections.
const NAV_LINKS: NavTarget[] = [
  { label: 'Highlights', segment: 'statics' },
  { label: 'Poster Media', segment: 'images' },
  { label: 'Ideas Strategy', segment: 'idea-strategy' },
  { label: 'Prelaunch', segment: 'pre-launch' },
  { label: 'Performance', segment: 'performance' },
  { label: 'Other Act. Cat.', segment: 'other-activity-category' },
  { label: 'Other Act. Items', segment: 'other-activity-item' },
  { label: 'Content Category', segment: 'content-category' },
  { label: 'Content Items', segment: 'content-item' },
  { label: 'Content Carousel', segment: 'content-carousel' },
  { label: 'Continuity Cat.', segment: 'community-program' },
  { label: 'Continuity Items', segment: 'community-program-item' },
];

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }, { key: 'year', label: 'Year', type: 'year' as const }];
  const columns = [
    { key: 'poster_image', label: 'Poster', render: (row: any) => <ImageCell src={row.poster_image} alt={row.title} size="w-20 h-20" /> },
    { key: 'marketing_video', label: 'Video', render: (row: any) => <VideoCell src={row.marketing_video} thumbnail={row.poster_image} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
    {
      key: 'navigate', label: 'Navigate To', render: (row: any) => {
        // Prefer the live targets + counts from the API; fall back to the static
        // list (no counts) when the payload doesn't include them.
        const targets: NavTarget[] = Array.isArray(row.navigation) && row.navigation.length
          ? row.navigation
          : NAV_LINKS;
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {targets.map((t) => (
              <Link
                key={t.segment}
                // Highlights routes to its dedicated listing page, scoping by the
                // item via a query param; other targets use the item-nested route.
                to={t.segment === 'statics'
                  ? `/marketing/highlights?marketingHouseItemId=${row._id}`
                  : `/marketing/item/${row._id}/${t.segment}`}
                title={typeof t.count === 'number' ? `${t.label}: ${t.count} record(s)` : t.label}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium whitespace-nowrap transition-colors"
              >
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.125rem] h-4 px-1 rounded-full text-[10px] font-semibold ${t.count > 0 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        );
      },
    },
  ];
  return (
    <CrudListPage title="Marketing Items" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Marketing Item' : 'Add Marketing Item'}
      modalSize="2xl" onRefresh={fetchAll} />
  );
}
