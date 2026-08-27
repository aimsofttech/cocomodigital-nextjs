import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { get, post, put, del, errMsg } from '@/services/api';
import { Spinner, Pagination, PageHeader, Modal, Empty, confirmAction } from '@/components/ui';

const CompaniesList = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', page: 1 });
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/companies', { ...filters, limit: 20 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) return toast.error('Name is required');
    setBusy(true);
    try {
      if (editing && editing._id) await put(`/crm/api/companies/${editing._id}`, form);
      else await post('/crm/api/companies', form);
      toast.success('Saved');
      setEditing(null); setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirmAction('Delete this company?')) return;
    try { await del(`/crm/api/companies/${id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div>
      <PageHeader
        title="Companies"
        actions={
          <>
            <Link to="/contacts" className="btn-secondary">← Customers</Link>
            <button className="btn-primary" onClick={() => { setEditing({}); setForm({}); }}><PlusIcon className="h-4 w-4" />New Company</button>
          </>
        }
      />
      <div className="card mb-4 p-3">
        <input className="input max-w-56" placeholder="Search…" value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))} />
      </div>
      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="th">Name</th><th className="th">Website</th><th className="th">Industry</th><th className="th">Owner</th><th className="th"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-xs">{c.website || '—'}</td>
                  <td className="td text-xs">{c.industry || '—'}</td>
                  <td className="td text-xs">{c.ownerId?.name || '—'}</td>
                  <td className="td text-right">
                    <button className="text-xs text-primary-600 hover:underline" onClick={() => { setEditing(c); setForm(c); }}>Edit</button>
                    <button className="ml-3 text-xs text-red-500 hover:underline" onClick={() => remove(c._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Company' : 'New Company'}>
        <div className="grid grid-cols-2 gap-3">
          {[['name', 'Name *'], ['website', 'Website'], ['industry', 'Industry'], ['size', 'Size'], ['gstin', 'GSTIN']].map(([k, label]) => (
            <div key={k}><label className="label">{label}</label>
              <input className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default CompaniesList;
