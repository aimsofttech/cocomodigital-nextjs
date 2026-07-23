import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { get, post, patch, errMsg } from '@/services/api';
import { Spinner, Badge, statusColor, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';

const PRIORITY_COLOR: Record<string, string> = { low: 'gray', medium: 'blue', high: 'orange', urgent: 'red' };

const TasksPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ due: '', status: 'open,in_progress', assigneeId: 'me', page: 1 });
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/tasks', { ...filters, limit: 25 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get('/crm/api/users', { limit: 100 }).then((r) => setUsers(r.data as any[])).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.title) return toast.error('Title is required');
    setBusy(true);
    try {
      await post('/crm/api/tasks', form);
      toast.success('Task created');
      setShow(false); setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const setStatus = async (task: any, status: string) => {
    try { await patch(`/crm/api/tasks/${task._id}/status`, { status }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        actions={<button className="btn-primary" onClick={() => setShow(true)}><PlusIcon className="h-4 w-4" />New Task</button>}
      />

      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        {[['', 'Open'], ['today', 'Due today'], ['overdue', 'Overdue'], ['week', 'This week']].map(([v, label]) => (
          <button key={v} onClick={() => setFilters((f) => ({ ...f, due: v, page: 1 }))}
            className={filters.due === v ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
        <span className="flex-1" />
        <select className="input max-w-44" value={filters.assigneeId}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value, page: 1 }))}>
          <option value="me">My tasks</option>
          <option value="">Everyone</option>
          {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <select className="input max-w-44" value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="open,in_progress">Open</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No tasks — enjoy the calm ☕" /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Task</th><th className="th">Linked to</th><th className="th">Priority</th>
                <th className="th">Due</th><th className="th">Assignee</th><th className="th">Status</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((t) => {
                const overdue = t.dueAt && new Date(t.dueAt) < new Date() && ['open', 'in_progress'].includes(t.status);
                return (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="td font-medium">{t.title}
                      {t.description && <p className="text-xs font-normal text-gray-400 line-clamp-1">{t.description}</p>}
                    </td>
                    <td className="td text-xs">
                      {t.leadId ? <Link className="text-primary-600 hover:underline" to={`/leads/${t.leadId._id}`}>{t.leadId.name}</Link>
                        : t.contactId ? <Link className="text-primary-600 hover:underline" to={`/contacts/${t.contactId._id}`}>{t.contactId.firstName}</Link>
                        : '—'}
                    </td>
                    <td className="td"><Badge color={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge></td>
                    <td className={`td text-xs ${overdue ? 'font-semibold text-red-600' : ''}`}>{t.dueAt ? fmtDate(t.dueAt) : '—'}</td>
                    <td className="td text-xs">{t.assigneeId?.name || '—'}</td>
                    <td className="td"><Badge color={statusColor(t.status)}>{t.status.replace('_', ' ')}</Badge></td>
                    <td className="td space-x-2 text-right text-xs">
                      {['open', 'in_progress'].includes(t.status) && (
                        <>
                          {t.status === 'open' && <button className="text-yellow-600 hover:underline" onClick={() => setStatus(t, 'in_progress')}>Start</button>}
                          <button className="text-green-600 hover:underline" onClick={() => setStatus(t, 'done')}>Done</button>
                          <button className="text-gray-400 hover:underline" onClick={() => setStatus(t, 'cancelled')}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      <Modal open={show} onClose={() => setShow(false)} title="New Task">
        <div className="space-y-3">
          <div><label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due</label>
              <input type="datetime-local" className="input" onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
            <div><label className="label">Priority</label>
              <select className="input" value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
              </select></div>
          </div>
          <div><label className="label">Assignee</label>
            <select className="input" value={form.assigneeId || ''} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Me</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select></div>
          <div><label className="label">Description</label>
            <textarea className="input" rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShow(false)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={busy}>{busy ? 'Saving…' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;
