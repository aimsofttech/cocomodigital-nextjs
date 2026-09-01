import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCrud } from '@/hooks/useCrud';
import { useRowReorder } from '@/hooks/useReorder';
import CrudListPage, { type ModalRenderProps } from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import type { Column } from '@/components/ui/DataTable';
import type { FilterField } from '@/components/ui/TableFilter';
import { usePodcastPageOptions } from './constants';

/* Every child collection in this module is listed the same way: scoped to one
 * podcast page (via ?podcastPageId) and optionally to one band (via
 * ?sectionKey), filterable, drag-to-reorder, and edited in a modal. This
 * component holds that wiring so the list pages only declare their columns and
 * their form.
 *
 * The scoping query params are what the per-band buttons on the pages list
 * navigate to, so a list opened from a band stays pinned to it and new rows are
 * created into it.
 */

interface Props {
  title: string;
  breadcrumbLabel: string;
  api: {
    getAll: (params?: Record<string, any>) => Promise<any>;
    getOne?: (id: string) => Promise<any>;
    create?: (data: any) => Promise<any>;
    update?: (id: string, data: any) => Promise<any>;
    delete?: (id: string) => Promise<any>;
    exportCsv?: (params?: Record<string, any>) => Promise<any>;
    importCsv?: (data: FormData) => Promise<any>;
  };
  columns: Column<any>[];
  /** Filters shown in addition to Page + Status (e.g. Section). */
  extraFilters?: FilterField[];
  /** Human labels for the section keys, used in the page title. */
  sectionLabels?: Record<string, string>;
  renderForm: (
    props: ModalRenderProps & {
      editId?: string;
      lockedPageId?: string;
      lockedSectionKey?: string;
    },
  ) => ReactNode;
  modalTitle: (mode: 'add' | 'edit') => string;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function ChildListPage({
  title, breadcrumbLabel, api, columns, extraFilters = [], sectionLabels = {},
  renderForm, modalTitle, modalSize = 'lg',
}: Props) {
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get('podcastPageId') || '';
  const sectionKey = searchParams.get('sectionKey') || '';

  // Seed the filter so the very first fetch is already scoped.
  const urlScope: Record<string, any> = {
    ...(pageId ? { podcastPageId: pageId } : {}),
    ...(sectionKey ? { sectionKey } : {}),
  };

  const {
    data, loading, submitting, pagination, remove,
    setSearch, setPage, setFilterParams, fetchAll, setData,
  } = useCrud(api, true, urlScope);

  const handleReorder = useRowReorder({ api, data, setData, pagination, fetchAll });

  const { pages } = usePodcastPageOptions();

  // Re-scope when the URL params change (navigating between two bands' lists).
  // Skipped on the first run — useCrud already seeded that filter.
  const firstRun = useRef(true);
  const scopeKey = `${pageId}|${sectionKey}`;
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(urlScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setFilterParams]);

  // The URL scope always wins over the filter panel, so a list reached from a
  // band can't silently show another page's or another band's rows.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...params, ...urlScope });

  const handleStatusChange = async (id: string, status: number) => {
    if (!api.update) return;
    try {
      await api.update(id, { status });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filterFields: FilterField[] = [
    ...(pageId ? [] : [{
      key: 'podcastPageId',
      label: 'Page',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Pages' },
        ...pages.map((p) => ({ value: String(p._id), label: p.name })),
      ],
    }]),
    // A band-scoped list has nothing left to filter by section.
    ...(sectionKey ? [] : extraFilters),
    { key: 'status', label: 'Status', type: 'status' as const },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const, serverSide: true },
  ];

  const scopedName = sectionKey
    ? sectionLabels[sectionKey] || sectionKey
    : pageId
      ? pages.find((p) => String(p._id) === pageId)?.name
      : undefined;

  const allColumns: Column<any>[] = [
    // Only worth a column when rows can come from more than one page.
    ...(pageId ? [] : [{
      key: 'podcastPageName',
      label: 'Page',
      className: 'min-w-[180px]',
      render: (row: any) => (
        <span className="block truncate" title={row.podcastPageName || ''}>
          {row.podcastPageName || '—'}
        </span>
      ),
    }]),
    ...columns,
    {
      key: 'displayOrder',
      label: 'Order',
      sortable: true,
      render: (row: any) => row.displayOrder ?? 0,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <StatusToggle status={row.status} onConfirm={(s) => handleStatusChange(row._id, s)} />
      ),
    },
  ];

  return (
    <CrudListPage
      title={scopedName ? `${title} — ${scopedName}` : title}
      breadcrumbs={[
        { label: 'Podcast', path: '/podcast/page' },
        { label: breadcrumbLabel },
      ]}
      columns={allColumns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      onReorder={handleReorder}
      filterFields={filterFields}
      onServerFilterChange={handleFilterChange}
      renderModal={(props) => renderForm({
        ...props,
        /* CrudListPage hands the record being edited over as `id`; the section
           forms take it as `editId`. Without this the forms saw no id at all,
           so Edit opened blank and saving created a second record instead of
           updating the one you clicked. */
        editId: props.id,
        lockedPageId: pageId || undefined,
        lockedSectionKey: sectionKey || undefined,
      })}
      modalTitle={modalTitle}
      modalSize={modalSize}
      onRefresh={fetchAll}
    />
  );
}
