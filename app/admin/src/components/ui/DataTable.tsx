import { Fragment, useState, useMemo, useRef } from 'react';
import {
  MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import Tooltip from './Tooltip';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: { total: number; page: number; limit: number; totalPages: number };
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  headerActions?: React.ReactNode;
  /** Current page size (controlled from parent) */
  pageSize?: number;
  /** Called when user selects a new page size */
  onPageSizeChange?: (size: number) => void;
  /** When provided, each row gets an expand toggle that reveals this content
   *  in a full-width panel beneath the row. */
  renderExpanded?: (row: T) => React.ReactNode;
  /** When provided, rows become drag-and-drop reorderable (a grip handle
   *  column appears). Called with the moved row's old and new index within
   *  the CURRENT `data` array. Disabled while a column sort is active,
   *  since the visual order wouldn't match the stored order. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type SortDir = 'asc' | 'desc' | null;

/** Render a cell's raw value, falling back to a muted "N/A" when the
 *  data is missing (null / undefined / empty string). */
export const cellValue = (val: any): React.ReactNode =>
  val === null || val === undefined || (typeof val === 'string' && val.trim() === '')
    ? <span className="text-gray-400">N/A</span>
    : val;

function sortValue(val: any): string | number {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? val.toLowerCase() : n;
  }
  return String(val).toLowerCase();
}

/** Build an array of page-number items (numbers or '…' ellipsis strings) */
function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [];
  const delta = 2; // pages on each side of current

  pages.push(1);
  const leftBound = Math.max(2, current - delta);
  const rightBound = Math.min(total - 1, current + delta);

  if (leftBound > 2) pages.push('…');
  for (let i = leftBound; i <= rightBound; i++) pages.push(i);
  if (rightBound < total - 1) pages.push('…');
  pages.push(total);

  return pages;
}

export default function DataTable<T extends { _id?: string }>({
  columns, data, loading, pagination, onPageChange, onSearch,
  searchPlaceholder = 'Search...', actions, emptyMessage = 'No records found',
  headerActions, pageSize = 20, onPageSizeChange, renderExpanded, onReorder,
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Drag-and-drop reorder state (indexes into `data`).
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  // Reordering only makes sense in the server's stored order — a client-side
  // column sort would make the drop position meaningless.
  const reorderEnabled = Boolean(onReorder) && !sortKey && !loading;

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearch?.(val);
    }, 300);
  };

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = sortValue((a as any)[sortKey]);
      const bv = sortValue((b as any)[sortKey]);
      if (av === '' && bv !== '') return 1;
      if (bv === '' && av !== '') return -1;
      const result = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? result : -result;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-gray-400 ml-1 inline" />;
    if (sortDir === 'asc') return <ChevronUpIcon className="w-3.5 h-3.5 text-primary-500 ml-1 inline" />;
    return <ChevronDownIcon className="w-3.5 h-3.5 text-primary-500 ml-1 inline" />;
  };

  const colSpan = columns.length + (actions ? 1 : 0) + (renderExpanded ? 1 : 0) + (onReorder ? 1 : 0);

  const handleDrop = (targetIdx: number) => {
    if (dragIdx !== null && dragIdx !== targetIdx) onReorder?.(dragIdx, targetIdx);
    setDragIdx(null);
    setOverIdx(null);
  };

  // Effective pagination values for display
  const pag = pagination;
  const currentPage = pag?.page ?? 1;
  const totalPages = pag?.totalPages ?? 1;
  const totalRecords = pag?.total ?? 0;
  const limitDisplay = pag?.limit ?? pageSize;
  const showFrom = totalRecords === 0 ? 0 : (currentPage - 1) * limitDisplay + 1;
  const showTo = Math.min(currentPage * limitDisplay, totalRecords);

  return (
    <div className="space-y-4">
      {/* Header bar: search + extra actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {onSearch && (
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="form-input pl-9 py-2"
            />
          </div>
        )}
        {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {onReorder && <th className="w-8" />}
              {renderExpanded && <th className="w-10" />}
              {actions && <th>Actions</th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="py-12">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const rowId = (row as any)._id || String(idx);
                const isExpanded = expanded.has(rowId);
                return (
                  <Fragment key={rowId}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-primary-50/40' : ''} ${
                        dragIdx === idx ? 'opacity-40' : ''
                      } ${overIdx === idx && dragIdx !== null && dragIdx !== idx ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : ''}`}
                      draggable={reorderEnabled}
                      onDragStart={reorderEnabled ? (e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; } : undefined}
                      onDragOver={reorderEnabled ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== idx) setOverIdx(idx); } : undefined}
                      onDrop={reorderEnabled ? (e) => { e.preventDefault(); handleDrop(idx); } : undefined}
                      onDragEnd={reorderEnabled ? () => { setDragIdx(null); setOverIdx(null); } : undefined}
                    >
                      {onReorder && (
                        <td className="align-middle">
                          <Tooltip content={sortKey ? 'Clear column sorting to reorder' : 'Drag to reorder'}>
                            <span
                              className={`inline-flex items-center justify-center p-1 text-gray-400 ${
                                reorderEnabled ? 'cursor-grab active:cursor-grabbing hover:text-gray-600' : 'opacity-40'
                              }`}
                              aria-label="Drag to reorder"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
                                <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
                                <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
                              </svg>
                            </span>
                          </Tooltip>
                        </td>
                      )}
                      {renderExpanded && (
                        <td className="align-middle">
                          <Tooltip content={isExpanded ? 'Collapse' : 'Expand'}>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(rowId)}
                              className="p-1 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
                              aria-expanded={isExpanded}
                            >
                              <ChevronRightIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </Tooltip>
                        </td>
                      )}
                      {actions && <td>{actions(row)}</td>}
                      {columns.map((col) => (
                        <td key={col.key} className={col.className}>
                          {col.render ? col.render(row, idx) : cellValue((row as any)[col.key])}
                        </td>
                      ))}
                    </tr>
                    {renderExpanded && isExpanded && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={colSpan} className="!whitespace-normal !max-w-none px-4 py-4 border-t border-gray-100">
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination bar — always visible when pagination data is provided ── */}
      {pag && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1">

          {/* Left: record count + page size selector */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {totalRecords > 0 ? (
              <span>
                Showing <span className="font-medium text-gray-700">{showFrom}–{showTo}</span> of{' '}
                <span className="font-medium text-gray-700">{totalRecords}</span> records
              </span>
            ) : (
              <span>No records found</span>
            )}

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-xs">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: page navigation */}
          {totalPages > 0 && (
            <div className="flex items-center gap-1">
              {/* First page */}
              <Tooltip content="First page">
                <button
                  onClick={() => onPageChange?.(1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDoubleLeftIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

              {/* Prev page */}
              <Tooltip content="Previous page">
                <button
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* Page number buttons with ellipsis */}
              {buildPageRange(currentPage, totalPages).map((item, idx) =>
                item === '…' ? (
                  <span key={`ell-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange?.(item)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      item === currentPage
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              {/* Next page */}
              <Tooltip content="Next page">
                <button
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* Last page */}
              <Tooltip content="Last page">
                <button
                  onClick={() => onPageChange?.(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDoubleRightIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
