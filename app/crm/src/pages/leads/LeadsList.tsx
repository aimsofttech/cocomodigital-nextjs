import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import api, { get, post, errMsg } from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { can } from '@/features/auth/authSlice';
import { Spinner, Badge, statusColor, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];
const SOURCES = ['contact_form', 'marketing_form', 'consultation', 'meeting', 'whatsapp_inbound', 'manual', 'import', 'referral'];

const LeadsList = () => {
  const user = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', status: '', source: '', rating: '', page: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState<any>({ name: '', email: '', phone: '', company: '', serviceInterest: '', budget: '', message: '' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/leads', { ...filters, limit: 20 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const createLead = async () => {
    if (!form.name) return toast.error('Name is required');
    setBusy(true);
    try {
      await post('/crm/api/leads', form);
      toast.success('Lead created');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', company: '', serviceInterest: '', budget: '', message: '' });
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const runImport = async () => {
    if (!importFile) return toast.error('Choose a CSV/XLSX file');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post('/crm/api/leads/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${res.data.data.imported}, skipped ${res.data.data.skipped}`);
      setShowImport(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/crm/api/leads/export', { params: filters, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const setF = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={meta ? `${meta.total} total` : undefined}
        actions={
          <>
            {can(user, 'leads:export') && (
              <button className="btn-secondary" onClick={exportCsv}><ArrowDownTrayIcon className="h-4 w-4" />Export</button>
            )}
            {can(user, 'leads:import') && (
              <button className="btn-secondary" onClick={() => setShowImport(true)}><ArrowUpTrayIcon className="h-4 w-4" />Import</button>
            )}
            {can(user, 'leads:create') && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}><PlusIcon className="h-4 w-4" />New Lead</button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input className="input max-w-56" placeholder="Search name / email / phone…" value={filters.q}
          onChange={(e) => setF('q', e.target.value)} />
        <select className="input max-w-40" value={filters.status} onChange={(e) => setF('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input max-w-44" value={filters.source} onChange={(e) => setF('source', e.target.value)}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input max-w-32" value={filters.rating} onChange={(e) => setF('rating', e.target.value)}>
          <option value="">All ratings</option>
          <option value="hot">hot</option><option value="warm">warm</option><option value="cold">cold</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No leads match these filters." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th><th className="th">Contact</th><th className="th">Source</th>
                <th className="th">Service</th><th className="th">Status</th><th className="th">Rating</th>
                <th className="th">Owner</th><th className="th">Next follow-up</th><th className="th">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((l) => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="td font-medium">
                    <Link to={`/leads/${l._id}`} className="hover:text-primary-600">{l.name}</Link>
                    {l.company && <p className="text-xs font-normal text-gray-400">{l.company}</p>}
                  </td>
                  <td className="td">
                    <p className="text-xs">{l.email || '—'}</p>
                    <p className="text-xs text-gray-400">{l.phone || ''}</p>
                  </td>
                  <td className="td text-xs">{l.source?.channel?.replace('_', ' ') || '—'}</td>
                  <td className="td text-xs">{l.serviceInterest || '—'}</td>
                  <td className="td"><Badge color={statusColor(l.status)}>{l.status}</Badge></td>
                  <td className="td"><Badge color={statusColor(l.rating)}>{l.rating} · {l.score}</Badge></td>
                  <td className="td text-xs">{l.ownerId?.name || <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="td text-xs">{l.nextFollowUpAt ? fmtDate(l.nextFollowUpAt) : '—'}</td>
                  <td className="td text-xs text-gray-400">{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Lead">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['name', 'Name *'], ['email', 'Email'], ['phone', 'Phone'], ['company', 'Company'],
            ['serviceInterest', 'Service interest'], ['budget', 'Budget'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Message / notes</label>
            <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" onClick={createLead} disabled={busy}>{busy ? 'Saving…' : 'Create lead'}</button>
        </div>
      </Modal>

      {/* Import modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import leads (CSV / XLSX)">
        <p className="mb-3 text-xs text-gray-500">
          Columns: <code>name, email, phone, company, message, service, budget</code>. Duplicates (same email/phone) are logged as re-enquiries, not duplicated.
        </p>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
          <button className="btn-primary" onClick={runImport} disabled={busy}>{busy ? 'Importing…' : 'Import'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default LeadsList;
