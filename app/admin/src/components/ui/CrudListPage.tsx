import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import DataTable, { Column } from './DataTable';
import ConfirmDialog from './ConfirmDialog';
import PageHeader from './PageHeader';
import Modal from './Modal';
import TableFilter, {
  FilterField,
  FilterValues,
  applyClientFilters,
  extractServerParams,
  isEmptyValue,
} from './TableFilter';

interface Breadcrumb { label: string; path?: string; }

export interface ModalRenderProps {
  mode: 'add' | 'edit';
  id?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CrudListPageProps<T = any> {
  title: string;
  breadcrumbs?: Breadcrumb[];
  addPath?: string;
  editPath?: (row: T) => string;
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  submitting: boolean;
  pagination?: any;
  onPageChange?: (p: number) => void;
  onSearch?: (q: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  extraActions?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  disableAdd?: boolean;
  disableDelete?: boolean;
  disableEdit?: boolean;
  filterFields?: FilterField[];
  onServerFilterChange?: (params: Record<string, any>) => void;
  /** Modal-based form rendering — when provided, Add/Edit open a modal instead of navigating */
  renderModal?: (props: ModalRenderProps) => React.ReactNode;
  /** Title for the modal header; can be a function of mode */
  modalTitle?: string | ((mode: 'add' | 'edit') => string);
  /** Modal size variant */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Called after a successful modal form submission (use to refresh list data) */
  onRefresh?: () => void;
  /** When provided, each row gets an expand toggle revealing this content. */
  renderExpanded?: (row: T) => React.ReactNode;
}

const DEFAULT_PAGE_SIZE = 20;

function getSessionKey(pathname: string) {
  return `crud_filter_${pathname.replace(/\//g, '_')}`;
}

export default function CrudListPage<T extends { _id?: string }>({
  title, breadcrumbs = [], addPath, editPath, columns, data,
  loading, submitting, pagination, onPageChange, onSearch, onDelete,
  extraActions, rowActions, disableAdd, disableDelete, disableEdit,
  filterFields, onServerFilterChange,
  renderModal, modalTitle, modalSize = 'lg', onRefresh, renderExpanded,
}: CrudListPageProps<T>) {
  const { pathname } = useLocation();
  const sessionKey = getSessionKey(pathname);
  const pageSizeKey = `${sessionKey}_ps`;

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterValues, setFilterValues] = useState<FilterValues>(() => {
    if (!filterFields?.length) return {};
    try {
      const saved = sessionStorage.getItem(sessionKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // ── Page size state ───────────────────────────────────────────────────────
  const [pageSize, setPageSizeState] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(pageSizeKey);
      return saved ? parseInt(saved, 10) : DEFAULT_PAGE_SIZE;
    } catch { return DEFAULT_PAGE_SIZE; }
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalId, setModalId] = useState<string | undefined>(undefined);

  const openAddModal = () => { setModalMode('add'); setModalId(undefined); setModalOpen(true); };
  const openEditModal = (id: string) => { setModalMode('edit'); setModalId(id); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleModalSuccess = useCallback(() => {
    setModalOpen(false);
    onRefresh?.();
  }, [onRefresh]);

  // ── Helper: build full server param object ────────────────────────────────
  const buildServerParams = useCallback((fv: FilterValues, limit: number): Record<string, any> => {
    const base = filterFields ? extractServerParams(fv, filterFields) : {};
    return { ...base, limit };
  }, [filterFields]);

  // ── Restore persisted state on mount ─────────────────────────────────────
  useEffect(() => {
    if (!onServerFilterChange) return;
    const params = buildServerParams(filterValues, pageSize);
    if (Object.keys(params).length > 0 && (
      Object.keys(params).some((k) => k !== 'limit') || pageSize !== DEFAULT_PAGE_SIZE
    )) {
      onServerFilterChange(params);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter change ─────────────────────────────────────────────────────────
  const handleFilterChange = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    try { sessionStorage.setItem(sessionKey, JSON.stringify(next)); } catch { /* noop */ }
    if (onServerFilterChange) onServerFilterChange(buildServerParams(next, pageSize));
  };

  const handleFilterReset = () => {
    setFilterValues({});
    try { sessionStorage.removeItem(sessionKey); } catch { /* noop */ }
    if (onServerFilterChange) onServerFilterChange(buildServerParams({}, pageSize));
  };

  // ── Page size change ──────────────────────────────────────────────────────
  const handlePageSizeChange = (newSize: number) => {
    setPageSizeState(newSize);
    try { sessionStorage.setItem(pageSizeKey, String(newSize)); } catch { /* noop */ }
    if (onServerFilterChange) onServerFilterChange(buildServerParams(filterValues, newSize));
    onPageChange?.(1);
  };

  // ── Active filters + client-side filtering ────────────────────────────────
  const activeCount = filterFields
    ? filterFields.filter((f) => !isEmptyValue(filterValues[f.key])).length
    : 0;

  const hasClientFilters = filterFields?.some(
    (f) => f.serverSide === false || f.type === 'date-range' || f.type === 'number-range'
  );
  const filteredData = hasClientFilters && filterFields
    ? applyClientFilters(data, filterValues, filterFields)
    : data;

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await onDelete(deleteId);
    if (ok) setDeleteId(null);
  };

  // ── Resolved modal title ──────────────────────────────────────────────────
  const resolvedModalTitle = typeof modalTitle === 'function'
    ? modalTitle(modalMode)
    : modalTitle ?? (modalMode === 'edit' ? 'Edit' : 'Add New');

  // ── Row actions ───────────────────────────────────────────────────────────
  const defaultActions = (row: T) => (
    <div className="flex items-center justify-end gap-1">
      {rowActions?.(row)}
      {!disableEdit && (renderModal ? (
        <button
          type="button"
          onClick={() => openEditModal(row._id!)}
          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
          title="Edit"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      ) : editPath ? (
        <Link
          to={editPath(row)}
          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
          title="Edit"
        >
          <PencilIcon className="w-4 h-4" />
        </Link>
      ) : null)}
      {!disableDelete && (
        <button
          type="button"
          onClick={() => setDeleteId(row._id!)}
          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            {extraActions}
            {!disableAdd && (renderModal ? (
              <button
                type="button"
                onClick={openAddModal}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                Add New
              </button>
            ) : addPath ? (
              <Link to={addPath} className="btn-primary btn-sm flex items-center gap-1.5">
                <PlusIcon className="w-4 h-4" />
                Add New
              </Link>
            ) : null)}
          </div>
        }
      />

      {filterFields && filterFields.length > 0 && (
        <TableFilter
          fields={filterFields}
          values={filterValues}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          activeCount={activeCount}
          loading={loading}
        />
      )}

      <div className="card">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          onPageChange={onPageChange}
          onSearch={onSearch}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          renderExpanded={renderExpanded}
          actions={
            (!disableEdit && (editPath || renderModal)) || !disableDelete || rowActions
              ? defaultActions
              : undefined
          }
        />
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={submitting}
      />

      {renderModal && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={resolvedModalTitle}
          size={modalSize}
        >
          {renderModal({
            mode: modalMode,
            id: modalId,
            onSuccess: handleModalSuccess,
            onCancel: closeModal,
          })}
        </Modal>
      )}
    </div>
  );
}
