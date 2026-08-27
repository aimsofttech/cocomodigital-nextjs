import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { get, post, errMsg } from '@/services/api';
import { Spinner, Badge, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';

const ContactsList = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', lifecycle: '', page: 1 });
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/contacts', { ...filters, limit: 20 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.firstName) return toast.error('First name is required');
    setBusy(true);
    try {
      await post('/crm/api/contacts', form);
      toast.success('Contact created');
      setShow(false); setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={meta ? `${meta.total} contacts` : undefined}
        actions={
          <>
            <Link to="/companies" className="btn-secondary"><BuildingOfficeIcon className="h-4 w-4" />Companies</Link>
            <button className="btn-primary" onClick={() => setShow(true)}><PlusIcon className="h-4 w-4" />New Contact</button>
          </>
        }
      />

      <div className="card mb-4 flex gap-2 p-3">
        <input className="input max-w-56" placeholder="Search…" value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))} />
        <select className="input max-w-44" value={filters.lifecycle}
          onChange={(e) => setFilters((f) => ({ ...f, lifecycle: e.target.value, page: 1 }))}>
          <option value="">All lifecycles</option>
          <option value="customer">customer</option>
          <option value="past_customer">past customer</option>
          <option value="lead">lead</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No contacts yet — convert a lead to create one." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th><th className="th">Contact</th><th className="th">Company</th>
                <th className="th">Lifecycle</th><th className="th">Consent</th><th className="th">Owner</th><th className="th">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="td font-medium">
                    <Link to={`/contacts/${c._id}`} className="hover:text-primary-600">{c.firstName} {c.lastName}</Link>
                  </td>
                  <td className="td"><p className="text-xs">{c.email || '—'}</p><p className="text-xs text-gray-400">{c.phone || ''}</p></td>
                  <td className="td text-xs">{c.companyId?.name || '—'}</td>
                  <td className="td"><Badge color={c.lifecycle === 'customer' ? 'green' : 'gray'}>{c.lifecycle.replace('_', ' ')}</Badge></td>
                  <td className="td text-xs">
                    {c.dnd ? <Badge color="red">DND</Badge> : (
                      <span className="space-x-1">
                        {c.whatsappOptIn && <Badge color="green">WA</Badge>}
                        {c.smsOptIn && <Badge color="blue">SMS</Badge>}
                        {c.emailOptIn && <Badge color="purple">Email</Badge>}
                      </span>
                    )}
                  </td>
                  <td className="td text-xs">{c.ownerId?.name || '—'}</td>
                  <td className="td text-xs text-gray-400">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      <Modal open={show} onClose={() => setShow(false)} title="New Contact">
        <div className="grid grid-cols-2 gap-3">
          {[['firstName', 'First name *'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['designation', 'Designation']].map(([k, label]) => (
            <div key={k}><label className="label">{label}</label>
              <input className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShow(false)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={busy}>{busy ? 'Saving…' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default ContactsList;
