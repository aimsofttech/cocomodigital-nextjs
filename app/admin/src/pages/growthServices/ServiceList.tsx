import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCrud } from '@/hooks/useCrud';
import { useRowReorder } from '@/hooks/useReorder';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import { growthServiceApi } from '@/services/adminApi';

/* The growth landing pages themselves. Each row links out to the seven child
 * lists, pre-scoped to that page via ?growthServiceId — which is also what
 * pins newly-created child records to the right service. */

// Child list routes, keyed by the segment the API's navigation payload returns.
const SEGMENT_PATHS: Record<string, string> = {
  sections: '/growth-services/section',
  features: '/growth-services/feature',
  stats: '/growth-services/stat',
  showcases: '/growth-services/showcase',
  'case-metrics': '/growth-services/case-metric',
  faqs: '/growth-services/faq',
  ctas: '/growth-services/cta',
};

export default function ServiceList() {
  const {
    data, loading, submitting, pagination, remove,
    setSearch, setPage, setFilterParams, fetchAll, setData,
  } = useCrud(growthServiceApi);

  const handleReorder = useRowReorder({ api: growthServiceApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await growthServiceApi.update(id, { status });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const columns = [
    {
      key: 'name', label: 'Service', sortable: true, className: 'min-w-[240px]',
      render: (row: any) => (
        <div>
          <span className="block truncate font-medium" title={row.name}>{row.name}</span>
          <span className="block truncate text-gray-500" title={row.slug}>{row.slug}</span>
        </div>
      ),
    },
    {
      key: 'heroBadgeLabel', label: 'Hero Badge', className: 'min-w-[200px] max-w-[280px]',
      render: (row: any) => (
        <span className="block truncate" title={row.heroBadgeLabel}>{row.heroBadgeLabel || '—'}</span>
      ),
    },
    { key: 'dashboardKey', label: 'Dashboard' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row: any) => (
        <StatusToggle status={row.status} onConfirm={(s) => handleStatusChange(row._id, s)} />
      ),
    },
    {
      key: 'navigate', label: 'Manage Content', className: 'min-w-[220px]',
      render: (row: any) => {
        const targets = Array.isArray(row.navigation) ? row.navigation : [];
        if (!targets.length) return '—';
        return (
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t: any) => (
              <Link
                key={t.segment}
                to={`${SEGMENT_PATHS[t.segment]}?growthServiceId=${row._id}`}
                title={`${t.label}: ${t.count} record(s)`}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs font-medium whitespace-nowrap transition-colors"
              >
                <span>{t.label} ({t.count})</span>
              </Link>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <CrudListPage
      title="Growth Services"
      breadcrumbs={[{ label: 'Growth Services' }, { label: 'Services' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      onReorder={handleReorder}
      filterFields={[{ key: 'status', label: 'Status', type: 'status' as const }]}
      onServerFilterChange={setFilterParams}
      addPath="/growth-services/service/add"
      editPath={(row: any) => `/growth-services/service/edit/${row._id}`}
      viewDetails={(row: any) => ({
        title: row.name,
        size: 'lg' as const,
        fields: [
          { label: 'Slug', value: row.slug },
          { label: 'Page URL', value: row.pageUrl },
          { label: 'Hero Badge', value: row.heroBadgeLabel },
          { label: 'Headline', value: row.heroHeadline },
          { label: 'Hero Paragraphs', value: row.heroParagraphs },
          { label: 'Trust Initials', value: row.heroTrustInitials },
          { label: 'Trust Label', value: row.heroTrustLabel },
          { label: 'Dashboard', value: row.dashboardKey },
          { label: 'Stats Band Label', value: row.statsLabel },
          { label: 'Case Study Title', value: row.caseStudyTitle },
          { label: 'Case Study Copy', value: row.caseStudyParagraphs },
          { label: 'Closing Title', value: row.closingTitle },
          { label: 'Closing Description', value: row.closingDescription },
          { label: 'Meta Title', value: row.metaTitle },
          { label: 'Meta Description', value: row.metaDescription },
          { label: 'Meta Keywords', value: row.metaKeywords },
        ],
      })}
    />
  );
}
