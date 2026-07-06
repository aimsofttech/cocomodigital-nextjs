import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { creativeHouseItemApi } from '@/services/adminApi';

// Item-sections reachable from a creative item; clicking opens that page scoped
// to the item via the `creativeHouseItemId` query param.
type NavTarget = { label: string; segment: string; count?: number | null };
const SEGMENT_ROUTE: Record<string, string> = {
  'approach': '/creative/approach',
  'final-output': '/creative/final-output',
};
const NAV_FALLBACK: NavTarget[] = [
  { label: 'Creative Approach', segment: 'approach' },
  { label: 'Creative Project Media', segment: 'final-output' },
];
const targetHref = (segment: string, itemId: string) =>
  `${SEGMENT_ROUTE[segment] || '/creative/item'}?creativeHouseItemId=${itemId}`;

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(creativeHouseItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await creativeHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }, { key: 'year', label: 'Year', type: 'year' as const }];
  const columns = [
    { key: 'thumbnail', label: 'Thumbnail', render: (row: any) => <ImageCell src={row.thumbnail} /> },
    { key: 'videoUrl', label: 'Video', render: (row: any) => {
      // A creative item's video may live in any of: a direct/YouTube URL, an
      // uploaded video file, or just a stored YouTube id (legacy rows). Resolve
      // in that order so the cell shows a preview for every row that has a video.
      const videoSrc = row.videoUrl
        || row.uploadVideoUrl
        || (row.youtubeId ? `https://www.youtube.com/watch?v=${row.youtubeId}` : '');
      return <VideoCell src={videoSrc} thumbnail={row.thumbnail} />;
    } },
    { key: 'videoTitle', label: 'Video Title', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
    {
      key: 'navigate', label: 'Navigate To', render: (row: any) => {
        const targets: NavTarget[] = Array.isArray(row.navigation) && row.navigation.length ? row.navigation : NAV_FALLBACK;
        return (
          <div className="flex flex-col gap-1.5">
            {targets.map((t) => (
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
    <CrudListPage title="Creative Items" breadcrumbs={[{ label: 'Creative House' }, { label: 'Items' }]}
      addPath="/creative/wizard" editPath={(row: any) => `/creative/wizard?itemId=${row._id}&step=0`}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      onRefresh={fetchAll} />
  );
}
