import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  marketingHouseBulkUploadApi,
  marketingHouseCategoryApi,
  authorTemplateApi,
  bookCallApi,
} from '@/services/adminApi';

interface RowResult {
  row: number;
  title?: string;
  valid?: boolean;
  status?: 'created' | 'failed';
  errors?: string[];
  itemId?: string;
  sectionsCreated?: number;
}

interface ReportData {
  total: number;
  valid?: number;
  invalid?: number;
  created?: number;
  failed?: number;
  rows?: RowResult[];
  results?: RowResult[];
}

export default function BulkUpload() {
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [bookCalls, setBookCalls] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [bookCallId, setBookCallId] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<'validate' | 'import' | 'template' | null>(null);
  const [report, setReport] = useState<{ kind: 'validate' | 'import'; message: string; data: ReportData } | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Normalise the various list-response shapes into a plain array. The admin API
  // returns { status, data: [...] }; this also tolerates a bare array or a
  // { data: { data: [...] } } envelope so a shape change can't blank the dropdown.
  const toArray = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  useEffect(() => {
    let alive = true;
    setLoadingOptions(true);
    Promise.allSettled([
      marketingHouseCategoryApi.getAll({ limit: 200 }),
      authorTemplateApi.getAll({ limit: 200 }),
      bookCallApi.getAll({ limit: 200 }),
    ])
      .then(([cat, auth, book]) => {
        if (!alive) return;
        if (cat.status === 'fulfilled') {
          setCategories(toArray(cat.value?.data));
        } else {
          console.error('Failed to load marketing house categories:', cat.reason);
          toast.error(cat.reason?.response?.data?.message || 'Failed to load categories');
        }
        if (auth.status === 'fulfilled') setAuthors(toArray(auth.value?.data));
        else console.error('Failed to load authors:', auth.reason);
        if (book.status === 'fulfilled') setBookCalls(toArray(book.value?.data));
        else console.error('Failed to load book calls:', book.reason);
      })
      .finally(() => { if (alive) setLoadingOptions(false); });
    return () => { alive = false; };
  }, []);

  // Shared form fields → FormData (category/author/book-call/thumbnail + file).
  const buildFormData = () => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    if (categoryId) fd.append('marketing_house_category_id', categoryId);
    if (authorId) fd.append('author_template_id', authorId);
    if (bookCallId) fd.append('book_call_template_id', bookCallId);
    if (thumbnail) fd.append('default_thumbnail', thumbnail);
    return fd;
  };

  const requireReady = () => {
    if (!categoryId) { toast.error('Please select a Marketing House category'); return false; }
    if (!file) { toast.error('Please choose a CSV/XLSX file'); return false; }
    return true;
  };

  const handleDownloadTemplate = async () => {
    setBusy('template');
    try {
      const res = await marketingHouseBulkUploadApi.downloadTemplate();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marketing-house-bulk-upload-template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download template');
    } finally {
      setBusy(null);
    }
  };

  const handleValidate = async () => {
    if (!requireReady()) return;
    setBusy('validate');
    setReport(null);
    try {
      const res = await marketingHouseBulkUploadApi.validate(buildFormData());
      setReport({ kind: 'validate', message: res.data.message, data: res.data.data });
      if (res.data.data.invalid) toast.error(`${res.data.data.invalid} row(s) have errors`);
      else toast.success('All rows are valid');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Validation failed');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (!requireReady()) return;
    setBusy('import');
    setReport(null);
    try {
      const res = await marketingHouseBulkUploadApi.importBulk(buildFormData());
      setReport({ kind: 'import', message: res.data.message, data: res.data.data });
      if (res.data.data.created) toast.success(res.data.message);
      if (res.data.data.failed) toast.error(`${res.data.data.failed} row(s) failed`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const reportRows: RowResult[] = report
    ? (report.kind === 'validate' ? report.data.rows || [] : report.data.results || [])
    : [];
  const failedRows = reportRows.filter((r) => r.valid === false || r.status === 'failed');

  return (
    <div>
      <PageHeader
        title="Bulk Upload"
        breadcrumbs={[{ label: 'Marketing House' }, { label: 'Bulk Upload' }]}
        actions={
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={busy === 'template'}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {busy === 'template' ? 'Preparing…' : 'Sample CSV'}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <div className="card lg:col-span-2 space-y-4">
          <div>
            <label className="form-label">
              Marketing House Category <span className="text-red-500">*</span>
            </label>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">
                {loadingOptions
                  ? 'Loading categories…'
                  : categories.length
                    ? 'Select a category'
                    : 'No categories found'}
              </option>
              {categories.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.category_name || c.name || c.marketing_house_title || 'Untitled'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Applied to every uploaded record (a row may override it with a <code>category_name</code> column).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Author</label>
              <select className="form-select" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                <option value="">Select an author (optional)</option>
                {authors.map((a: any) => (
                  <option key={a._id} value={a._id}>
                    {a.template_name || a.author_name || a.name || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Book Call</label>
              <select className="form-select" value={bookCallId} onChange={(e) => setBookCallId(e.target.value)}>
                <option value="">Select a book call (optional)</option>
                {bookCalls.map((b: any) => (
                  <option key={b._id} value={b._id}>
                    {b.book_name || b.book_heading || b.book_call_title || b.title || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <ImageUpload
              name="default_thumbnail"
              label="Default Thumbnail"
              uploadType="image"
              folder="marketing_house"
              value={thumbnail}
              onChange={setThumbnail}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. Used for any row that doesn't provide its own <code>marketing_house_thumbnail</code>.
            </p>
          </div>

          <div>
            <label className="form-label">
              Upload CSV / Excel file <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setReport(null); }}
              className="form-input file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm hover:file:bg-primary-100"
            />
            {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleValidate}
              disabled={busy !== null}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {busy === 'validate' ? 'Validating…' : 'Validate'}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={busy !== null}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              {busy === 'import' ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>

        {/* ── Format help ──────────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-800">CSV format</h3>
          <p className="text-sm text-gray-600">
            One row = one complete Marketing House item. Core columns:
          </p>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
            <li><code>marketing_house_title</code> (required)</li>
            <li><code>marketing_house_description</code>, <code>marketing_house_description2</code></li>
            <li><code>marketing_house_video_url</code>, <code>marketing_house_thumbnail</code></li>
            <li><code>category_name</code>, <code>display_order</code>, <code>status</code></li>
          </ul>
          <p className="text-sm text-gray-600">Single-level section columns (JSON array of objects):</p>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
            <li><code>highlights</code>, <code>poster_media</code></li>
            <li><code>idea_strategy</code>, <code>pre_launch</code></li>
            <li><code>performance</code>, <code>faqs</code>, <code>projects</code></li>
          </ul>
          <p className="text-sm text-gray-600">
            Two-level columns (array of categories, each with nested <code>items</code>):
          </p>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
            <li><code>other_activities</code></li>
            <li><code>content_created</code> — items may nest <code>carousels</code></li>
            <li><code>community_program</code></li>
          </ul>
          <p className="text-xs text-gray-500">
            Download the sample CSV for a ready-to-edit example with every column and the
            exact nested shape.
          </p>
        </div>
      </div>

      {/* ── Report ──────────────────────────────────────────────────────────── */}
      {report && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {report.kind === 'validate' ? 'Validation result' : 'Upload result'}
            </h3>
            <div className="flex items-center gap-3 text-sm">
              {report.kind === 'import' && (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" /> {report.data.created || 0} created
                </span>
              )}
              {report.kind === 'validate' && (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" /> {report.data.valid || 0} valid
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-red-500">
                <XCircleIcon className="w-4 h-4" />
                {(report.kind === 'import' ? report.data.failed : report.data.invalid) || 0}
                {report.kind === 'import' ? ' failed' : ' invalid'}
              </span>
              <span className="text-gray-400">/ {report.data.total} total</span>
            </div>
          </div>

          {failedRows.length === 0 ? (
            <p className="text-sm text-green-600">{report.message}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">Row</th>
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {failedRows.map((r) => (
                    <tr key={r.row} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4 text-gray-700">{r.row}</td>
                      <td className="py-2 pr-4 text-gray-700">{r.title || 'N/A'}</td>
                      <td className="py-2 text-red-600">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {(r.errors || []).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
