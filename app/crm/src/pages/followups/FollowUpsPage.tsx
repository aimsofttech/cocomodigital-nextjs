import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get, patch, errMsg } from '@/services/api';
import { Spinner, Badge, statusColor, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';

const FollowUpsPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ due: 'today', page: 1 });
  const [snoozing, setSnoozing] = useState<any>(null);
  const [until, setUntil] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/followups', { ...filters, limit: 25 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const act = async (fu: any, action: 'done' | 'cancel') => {
    try { await patch(`/crm/api/followups/${fu._id}/${action}`); toast.success(action === 'done' ? 'Marked done ✅' : 'Cancelled'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const quickSnooze = async (fu: any, hours: number) => {
    const t = new Date(Date.now() + hours * 3600e3).toISOString();
    try { await patch(`/crm/api/followups/${fu._id}/snooze`, { until: t }); toast.success(`Snoozed ${hours}h`); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const snoozeCustom = async () => {
    if (!until) return;
    try { await patch(`/crm/api/followups/${snoozing._id}/snooze`, { until }); setSnoozing(null); setUntil(''); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Set follow-ups from any lead or customer page" />

      <div className="card mb-4 flex gap-2 p-3">
        {[['today', 'Due today'], ['overdue', 'Overdue'], ['upcoming', 'Upcoming'], ['', 'All open']].map(([v, label]) => (
          <button key={v} onClick={() => setFilters({ due: v, page: 1 })}
            className={filters.due === v ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="Nothing due — you're all caught up 🎉" /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Who</th><th className="th">Note</th><th className="th">Channel</th>
                <th className="th">Due</th><th className="th">Status</th><th className="th">Owner</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((f) => {
                const overdue = new Date(f.dueAt) < new Date() && ['pending', 'snoozed'].includes(f.status);
                return (
                  <tr key={f._id} className="hover:bg-gray-50">
                    <td className="td font-medium">
                      {f.leadId ? <Link className="hover:text-primary-600" to={`/leads/${f.leadId._id}`}>{f.leadId.name}</Link>
                        : f.contactId ? <Link className="hover:text-primary-600" to={`/contacts/${f.contactId._id}`}>{f.contactId.firstName}</Link>
                        : '—'}
                      <p className="text-xs font-normal text-gray-400">{f.leadId?.phone || f.contactId?.phone || ''}</p>
                    </td>
                    <td className="td text-xs">{f.note || '—'}</td>
                    <td className="td text-xs">{f.channelHint}</td>
                    <td className={`td text-xs ${overdue ? 'font-semibold text-red-600' : ''}`}>{fmtDate(f.dueAt)}</td>
                    <td className="td"><Badge color={statusColor(f.status)}>{f.status}</Badge></td>
                    <td className="td text-xs">{f.ownerId?.name || '—'}</td>
                    <td className="td space-x-2 text-right text-xs">
                      <button className="text-green-600 hover:underline" onClick={() => act(f, 'done')}>Done</button>
                      <button className="text-yellow-600 hover:underline" onClick={() => quickSnooze(f, 1)}>+1h</button>
                      <button className="text-yellow-600 hover:underline" onClick={() => quickSnooze(f, 24)}>+1d</button>
                      <button className="text-gray-500 hover:underline" onClick={() => setSnoozing(f)}>Pick…</button>
                      <button className="text-red-500 hover:underline" onClick={() => act(f, 'cancel')}>Cancel</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      <Modal open={!!snoozing} onClose={() => setSnoozing(null)} title="Snooze until">
        <input type="datetime-local" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setSnoozing(null)}>Cancel</button>
          <button className="btn-primary" onClick={snoozeCustom}>Snooze</button>
        </div>
      </Modal>
    </div>
  );
};

export default FollowUpsPage;
