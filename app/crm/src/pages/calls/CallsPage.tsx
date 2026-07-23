import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get, post, put, patch, errMsg } from '@/services/api';
import { Spinner, Badge, statusColor, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';

const CallsPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'scheduled', page: 1 });
  const [logModal, setLogModal] = useState<any>(null);   // call being logged
  const [reschedModal, setReschedModal] = useState<any>(null);
  const [mForm, setMForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/calls', { ...filters, limit: 20 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const dial = async (call: any) => {
    try {
      const res: any = await post(`/crm/api/calls/${call._id}/dial`);
      if (res.mode === 'manual' && res.telLink) {
        window.location.href = res.telLink;
        setTimeout(() => setLogModal(call), 1500);
      } else {
        toast.success('Call initiated via Twilio — your phone will ring first');
      }
    } catch (err) { toast.error(errMsg(err)); }
  };

  const submitLog = async () => {
    setBusy(true);
    try {
      await put(`/crm/api/calls/${logModal._id}`, {
        status: mForm.status || 'completed',
        outcome: mForm.outcome || undefined,
        durationSec: Number(mForm.durationMin || 0) * 60,
        notes: mForm.notes,
      });
      toast.success('Call logged');
      setLogModal(null); setMForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const submitReschedule = async () => {
    if (!mForm.scheduledAt) return toast.error('Pick a new time');
    setBusy(true);
    try {
      await patch(`/crm/api/calls/${reschedModal._id}/reschedule`, { scheduledAt: mForm.scheduledAt });
      toast.success('Rescheduled');
      setReschedModal(null); setMForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const cancel = async (call: any) => {
    if (!window.confirm('Cancel this call?')) return;
    try { await patch(`/crm/api/calls/${call._id}/cancel`); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const personOf = (c: any) =>
    c.leadId?.name || `${c.contactId?.firstName || ''} ${c.contactId?.lastName || ''}`.trim() || '—';
  const phoneOf = (c: any) => c.leadId?.phone || c.contactId?.phone || '';

  return (
    <div>
      <PageHeader title="Calls" subtitle="Scheduled + logged calls (schedule new calls from a lead's page)" />

      <div className="card mb-4 flex gap-2 p-3">
        {['scheduled', 'completed', 'no_answer', 'missed', 'cancelled', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilters({ status: s, page: 1 })}
            className={filters.status === s ? 'btn-primary' : 'btn-secondary'}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No calls here." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">With</th><th className="th">When</th><th className="th">Purpose</th>
                <th className="th">Status</th><th className="th">Outcome</th><th className="th">Owner</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="td font-medium">
                    {c.leadId ? <Link to={`/leads/${c.leadId._id}`} className="hover:text-primary-600">{personOf(c)}</Link> : personOf(c)}
                    <p className="text-xs font-normal text-gray-400">{phoneOf(c)}</p>
                  </td>
                  <td className="td text-xs">{c.scheduledAt ? fmtDate(c.scheduledAt) : fmtDate(c.createdAt)}</td>
                  <td className="td text-xs">{c.purpose}</td>
                  <td className="td"><Badge color={statusColor(c.status)}>{c.status.replace('_', ' ')}</Badge></td>
                  <td className="td text-xs">{c.outcome?.replace('_', ' ') || '—'}</td>
                  <td className="td text-xs">{c.ownerId?.name || '—'}</td>
                  <td className="td space-x-2 text-right text-xs">
                    {c.status === 'scheduled' && (
                      <>
                        <button className="text-green-600 hover:underline" onClick={() => dial(c)}>Call</button>
                        <button className="text-primary-600 hover:underline" onClick={() => { setLogModal(c); setMForm({}); }}>Log</button>
                        <button className="text-gray-500 hover:underline" onClick={() => { setReschedModal(c); setMForm({}); }}>Reschedule</button>
                        <button className="text-red-500 hover:underline" onClick={() => cancel(c)}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      <Modal open={!!logModal} onClose={() => setLogModal(null)} title={`Log call — ${logModal ? personOf(logModal) : ''}`}>
        <div className="space-y-3">
          <div><label className="label">Result</label>
            <select className="input" onChange={(e) => setMForm({ ...mForm, status: e.target.value })}>
              <option value="completed">completed</option><option value="no_answer">no answer</option><option value="busy">busy</option>
            </select></div>
          <div><label className="label">Outcome</label>
            <select className="input" onChange={(e) => setMForm({ ...mForm, outcome: e.target.value })}>
              <option value="">—</option>
              {['interested', 'not_interested', 'callback_requested', 'converted', 'wrong_number', 'voicemail'].map((o) => <option key={o}>{o}</option>)}
            </select></div>
          <div><label className="label">Duration (minutes)</label>
            <input type="number" className="input" onChange={(e) => setMForm({ ...mForm, durationMin: e.target.value })} /></div>
          <div><label className="label">Notes</label>
            <textarea className="input" rows={2} onChange={(e) => setMForm({ ...mForm, notes: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setLogModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={submitLog} disabled={busy}>{busy ? 'Saving…' : 'Save log'}</button>
        </div>
      </Modal>

      <Modal open={!!reschedModal} onClose={() => setReschedModal(null)} title="Reschedule call">
        <label className="label">New time *</label>
        <input type="datetime-local" className="input" onChange={(e) => setMForm({ ...mForm, scheduledAt: e.target.value })} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setReschedModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={submitReschedule} disabled={busy}>{busy ? 'Saving…' : 'Reschedule'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default CallsPage;
