import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCrud } from '@/hooks/useCrud';
import { useRowReorder } from '@/hooks/useReorder';
import CrudListPage, { type ModalRenderProps } from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import type { Column } from '@/components/ui/DataTable';
import type { FilterField } from '@/components/ui/TableFilter';
import { useGrowthServiceOptions } from './constants';

/* Every child collection in this module is listed the same way: scoped to one
 * growth service (via ?growthServiceId), filterable by service and status,
 * drag-to-reorder, and edited in a modal. This component holds that wiring so
 * the seven list pages only declare their columns and their form.
 *
 * The scoping query param is what the "Sections / Features / FAQs …" buttons on
 * the services list navigate to, so a list opened from a service stays pinned
 * to it and new rows are created against it.
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
  /** Filters shown in addition to Service + Status (e.g. Section Key). */
  extraFilters?: FilterField[];
  renderForm: (props: ModalRenderProps & { lockedServiceId?: string }) => ReactNode;
  modalTitle: (mode: 'add' | 'edit') => string;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function ChildListPage({
  title, breadcrumbLabel, api, columns, extraFilters = [],
  renderForm, modalTitle, modalSize = 'lg',
}: Props) {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('growthServiceId') || '';

  const {
    data, loading, submitting, pagination, remove,
    setSearch, setPage, setFilterParams, fetchAll, setData,
  } = useCrud(api, true, serviceId ? { growthServiceId: serviceId } : {});

  const handleReorder = useRowReorder({ api, data, setData, pagination, fetchAll });

  const { services } = useGrowthServiceOptions();

  // Re-scope when the URL param changes (navigating between two services'
  // lists). Skipped on the first run — useCrud already seeded that filter.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(serviceId ? { growthServiceId: serviceId } : {});
  }, [serviceId, setFilterParams]);

  // The URL scope always wins over the filter panel's Service dropdown, so a
  // list reached from a service can't silently show another service's rows.
  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...params, ...(serviceId ? { growthServiceId: serviceId } : {}) });

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
    ...(serviceId ? [] : [{
      key: 'growthServiceId',
      label: 'Service',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Services' },
        ...services.map((s) => ({ value: String(s._id), label: s.name })),
      ],
    }]),
    ...extraFilters,
    { key: 'status', label: 'Status', type: 'status' as const },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const, serverSide: true },
  ];

  const scopedName = serviceId
    ? services.find((s) => String(s._id) === serviceId)?.name
    : undefined;

  const allColumns: Column<any>[] = [
    // Only worth a column when rows can come from more than one page.
    ...(serviceId ? [] : [{
      key: 'growthServiceName',
      label: 'Service',
      className: 'min-w-[180px]',
      render: (row: any) => (
        <span className="block truncate" title={row.growthServiceName || ''}>
          {row.growthServiceName || '—'}
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
        { label: 'Growth Services', path: '/growth-services/service' },
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
      renderModal={(props) => renderForm({ ...props, lockedServiceId: serviceId || undefined })}
      modalTitle={modalTitle}
      modalSize={modalSize}
      onRefresh={fetchAll}
    />
  );
}
