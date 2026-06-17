import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export interface CsvConfig {
  /** Any service from createCrudService (exposes exportCsv / importCsv). */
  api: {
    exportCsv: (params?: Record<string, any>) => Promise<{ data: Blob }>;
    importCsv: (data: FormData) => Promise<any>;
  };
  /** Query params sent with the export (parent scope, status/search filters). */
  exportParams?: Record<string, any>;
  /** Fields injected into every imported row (e.g. the parent item/category id
      for an item-scoped list). Rows that already carry the column keep their value. */
  importFields?: Record<string, any>;
  /** Download filename (without extension). */
  filename?: string;
  /** Called after a successful import so the list can refresh. */
  onImported?: () => void;
}

/**
 * Export + Import buttons for a CRUD list. Export downloads all matching rows as
 * CSV; Import bulk-creates records from a chosen CSV/XLSX file (create-only).
 */
export default function CsvActions({
  api, exportParams, importFields, filename = 'export', onImported,
}: CsvConfig) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const handleExport = async () => {
    setBusy('export');
    try {
      const res = await api.exportCsv(exportParams);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setBusy('import');
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(importFields || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
    });
    try {
      const res = await api.importCsv(fd);
      const d = res.data?.data;
      toast.success(res.data?.message || 'Imported');
      if (d?.failed) {
        const first = d.errors?.[0];
        toast.error(`${d.failed} row(s) failed${first ? ` — row ${first.row}: ${first.message}` : ''}`);
      }
      onImported?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={busy !== null}
        className="btn-secondary btn-sm flex items-center gap-1.5 disabled:opacity-60"
        title="Export all rows to CSV"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        {busy === 'export' ? 'Exporting…' : 'Export'}
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
        className="btn-secondary btn-sm flex items-center gap-1.5 disabled:opacity-60"
        title="Bulk add records from a CSV / Excel file"
      >
        <ArrowUpTrayIcon className="w-4 h-4" />
        {busy === 'import' ? 'Importing…' : 'Import'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
