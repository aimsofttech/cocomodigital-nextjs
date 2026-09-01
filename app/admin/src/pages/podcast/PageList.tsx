import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCrud } from '@/hooks/useCrud';
import { useRowReorder } from '@/hooks/useReorder';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import { podcastPageApi } from '@/services/adminApi';

/* The podcast page record itself. Each row links out to the section lists,
 * pre-scoped to that page — and, where a list carries more than one band, to
 * that band — via ?podcastPageId and ?sectionKey. Those params are also what
 * pin newly-created rows to the right page and band. */

// Child list routes, keyed by the segment the API's navigation payload returns.
const SEGMENT_PATHS: Record<string, string> = {
  stat: '/podcast/stat',
  card: '/podcast/card',
  stage: '/podcast/stage',
  shot: '/podcast/shot',
  faq: '/podcast/faq',
  cta: '/podcast/cta',
};

export default function PageList() {
  const {
    data, loading, submitting, pagination, remove,
    setSearch, setPage, setFilterParams, fetchAll, setData,
  } = useCrud(podcastPageApi);

  const handleReorder = useRowReorder({ api: podcastPageApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await podcastPageApi.update(id, { status });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const columns = [
    {
      key: 'name', label: 'Page', sortable: true, className: 'min-w-[240px]',
      render: (row: any) => (
        <div>
          <span className="block truncate font-medium" title={row.name}>{row.name}</span>
          <span className="block truncate text-gray-500" title={row.pagePath || row.slug}>
            {row.pagePath || `/${row.slug}`}
          </span>
        </div>
      ),
    },
    {
      key: 'heroTitle', label: 'Hero Headline', className: 'min-w-[220px] max-w-[320px]',
      render: (row: any) => (
        <span className="block truncate" title={row.heroTitle}>{row.heroTitle || '—'}</span>
      ),
    },
    { key: 'displayOrder', label: 'Order', sortable: true },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row: any) => (
        <StatusToggle status={row.status} onConfirm={(s) => handleStatusChange(row._id, s)} />
      ),
    },
    {
      key: 'navigate', label: 'Manage Sections', className: 'min-w-[320px]',
      render: (row: any) => {
        const targets = Array.isArray(row.navigation) ? row.navigation : [];
        if (!targets.length) return '—';
        return (
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t: any) => {
              const query = `podcastPageId=${row._id}${t.sectionKey ? `&sectionKey=${t.sectionKey}` : ''}`;
              return (
                <Link
                  key={`${t.segment}-${t.sectionKey || 'all'}`}
                  to={`${SEGMENT_PATHS[t.segment]}?${query}`}
                  title={`${t.label}: ${t.count} record(s)`}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <span>{t.label} ({t.count})</span>
                </Link>
              );
            })}
          </div>
        );
      },
    },
  ];

  return (
    <CrudListPage
      title="Podcast Pages"
      breadcrumbs={[{ label: 'Podcast' }, { label: 'Pages' }]}
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
      addPath="/podcast/page/add"
      editPath={(row: any) => `/podcast/page/edit/${row._id}`}
      viewDetails={(row: any) => ({
        title: row.name,
        size: 'lg' as const,
        fields: [
          { label: 'Slug', value: row.slug },
          { label: 'Page Path', value: row.pagePath },
          { label: 'Page URL', value: row.pageUrl },
          { label: 'Hero Eyebrow', value: row.heroEyebrow },
          { label: 'Hero Headline', value: row.heroTitle },
          { label: 'Hero Sub-headline', value: row.heroSub },
          { label: 'Price Badge', value: row.heroPriceBadge },
          { label: 'Hours Badge', value: row.heroHoursBadge },
          { label: 'Signature Line', value: row.signatureLine },
          { label: 'Problem Heading', value: row.problemTitle },
          { label: 'Method Heading', value: row.methodTitle },
          { label: 'Services Heading', value: row.servicesTitle },
          { label: 'Audience Heading', value: row.audienceTitle },
          { label: 'Pricing Heading', value: row.pricingHeading },
          { label: 'Price Floor', value: `${row.pricingPrefix || ''} ${row.pricingFloor || ''}${row.pricingUnit || ''}` },
          { label: 'Month Table Heading', value: row.monthTitle },
          { label: 'Wrong-Call Heading', value: row.notForHeading },
          { label: 'Founder', value: row.founderName },
          { label: 'Time Zones Heading', value: row.opsTitle },
          { label: 'Studio Heading', value: row.studioHeading },
          { label: 'Process Heading', value: row.processTitle },
          { label: 'Proof Heading', value: row.proofTitle },
          { label: 'FAQ Heading', value: row.faqTitle },
          { label: 'Final CTA Heading', value: row.finalTitle },
          { label: 'Meta Title', value: row.metaTitle },
          { label: 'Meta Description', value: row.metaDescription },
          { label: 'Meta Keywords', value: row.metaKeywords },
          { label: 'Canonical URL', value: row.canonicalUrl },
          { label: 'OG Title', value: row.ogTitle },
          { label: 'OG Image', value: row.ogImage },
          { label: 'Twitter Title', value: row.twitterTitle },
        ],
      })}
    />
  );
}
