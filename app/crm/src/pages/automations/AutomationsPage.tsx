import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, BoltIcon, TrashIcon } from '@heroicons/react/24/outline';
import { get, post, put, patch, del, errMsg } from '@/services/api';
import { Spinner, Badge, PageHeader, Modal, Empty, confirmAction, fmtDate } from '@/components/ui';

const ACTION_LABEL: Record<string, string> = {
  send_email: '📧 Send email', send_whatsapp: '💬 Send WhatsApp', send_sms: '📱 Send SMS',
  schedule_call: '📞 Schedule call', create_task: '✅ Create task', create_followup: '⏰ Create follow-up',
  assign_owner: '👤 Assign owner', update_field: '✏️ Update field', add_tag: '🏷️ Add tag',
  remove_tag: '🏷️ Remove tag', notify_user: '🔔 Notify user', wait: '⏳ Wait',
};

const AutomationsPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [metaOpts, setMetaOpts] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [runs, setRuns] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/automations', { limit: 100 });
      setItems(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    get('/crm/api/automations/meta').then((r) => setMetaOpts(r.data)).catch(() => {});
    get('/crm/api/templates', { limit: 100 }).then((r) => setTemplates(r.data as any[])).catch(() => {});
  }, [load]);

  const toggle = async (rule: any) => {
    try { await patch(`/crm/api/automations/${rule._id}/toggle`); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const remove = async (rule: any) => {
    if (!confirmAction(`Delete automation "${rule.name}"?`)) return;
    try { await del(`/crm/api/automations/${rule._id}`); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const openEditor = (rule?: any) => {
    setEditing(rule || {});
    setForm(rule ? JSON.parse(JSON.stringify(rule)) : {
      name: '', trigger: { event: 'lead.created', config: {} }, conditions: [], actions: [],
    });
  };

  const save = async () => {
    if (!form.name || !form.actions?.length) return toast.error('Name and at least one action are required');
    setBusy(true);
    try {
      if (editing?._id) await put(`/crm/api/automations/${editing._id}`, form);
      else await post('/crm/api/automations', form);
      toast.success('Saved');
      setEditing(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const showRuns = async (rule: any) => {
    try {
      const res = await get(`/crm/api/automations/${rule._id}/runs`, { limit: 20 });
      setRuns({ rule, items: res.data });
    } catch (err) { toast.error(errMsg(err)); }
  };

  const setAction = (i: number, patchObj: any) => {
    const actions = [...form.actions];
    actions[i] = { ...actions[i], ...patchObj };
    setForm({ ...form, actions });
  };
  const setActionCfg = (i: number, key: string, value: any) => {
    const actions = [...form.actions];
    actions[i] = { ...actions[i], config: { ...(actions[i].config || {}), [key]: value } };
    setForm({ ...form, actions });
  };

  return (
    <div>
      <PageHeader
        title="Automations"
        subtitle="When something happens → check conditions → run actions"
        actions={<button className="btn-primary" onClick={() => openEditor()}><PlusIcon className="h-4 w-4" />New Rule</button>}
      />

      {loading ? <Spinner /> : items.length === 0 ? <div className="card"><Empty message="No automation rules yet — run npm run seed:crm for a starter pack." /></div> : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r._id} className="card flex flex-wrap items-center gap-3 p-4">
              <BoltIcon className={`h-5 w-5 ${r.isActive ? 'text-yellow-500' : 'text-gray-300'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-gray-500">
                  On <Badge color="blue">{r.trigger.event}</Badge>
                  {r.conditions?.length > 0 && <span> · {r.conditions.length} condition(s)</span>}
                  {' → '}{(r.actions || []).map((a: any) => ACTION_LABEL[a.type] || a.type).join(' → ')}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Runs: {r.runCount || 0}{r.lastRunAt ? ` · last: ${fmtDate(r.lastRunAt)}` : ''}
                </p>
              </div>
              <button className="text-xs text-gray-500 hover:underline" onClick={() => showRuns(r)}>Run log</button>
              <button className="text-xs text-primary-600 hover:underline" onClick={() => openEditor(r)}>Edit</button>
              <button
                onClick={() => toggle(r)}
                className={`relative h-6 w-11 rounded-full transition-colors ${r.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.isActive ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <button onClick={() => remove(r)} className="text-gray-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Automation' : 'New Automation'} wide>
        {metaOpts && form.trigger && (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Rule name *</label>
                <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Trigger event *</label>
                <select className="input" value={form.trigger.event}
                  onChange={(e) => setForm({ ...form, trigger: { ...form.trigger, event: e.target.value } })}>
                  {metaOpts.events.map((ev: string) => <option key={ev}>{ev}</option>)}
                </select></div>
            </div>

            {/* Conditions */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Conditions (all must match)</label>
                <button className="text-xs text-primary-600 hover:underline"
                  onClick={() => setForm({ ...form, conditions: [...(form.conditions || []), { field: 'lead.status', op: 'eq', value: '' }] })}>
                  + Add condition
                </button>
              </div>
              {(form.conditions || []).map((c: any, i: number) => (
                <div key={i} className="mb-1.5 flex gap-2">
                  <select className="input" value={c.field} onChange={(e) => {
                    const cs = [...form.conditions]; cs[i] = { ...c, field: e.target.value }; setForm({ ...form, conditions: cs });
                  }}>
                    {metaOpts.fields.map((f: string) => <option key={f}>{f}</option>)}
                  </select>
                  <select className="input max-w-28" value={c.op} onChange={(e) => {
                    const cs = [...form.conditions]; cs[i] = { ...c, op: e.target.value }; setForm({ ...form, conditions: cs });
                  }}>
                    {metaOpts.ops.map((o: string) => <option key={o}>{o}</option>)}
                  </select>
                  <input className="input" placeholder="value (comma-sep for in/nin)" value={Array.isArray(c.value) ? c.value.join(',') : (c.value ?? '')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = ['in', 'nin'].includes(c.op) ? raw.split(',').map((s) => s.trim()) : raw;
                      const cs = [...form.conditions]; cs[i] = { ...c, value: v }; setForm({ ...form, conditions: cs });
                    }} />
                  <button className="text-red-400" onClick={() => setForm({ ...form, conditions: form.conditions.filter((_: any, j: number) => j !== i) })}>✕</button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Actions (run in order) *</label>
                <button className="text-xs text-primary-600 hover:underline"
                  onClick={() => setForm({ ...form, actions: [...(form.actions || []), { type: 'send_email', config: {} }] })}>
                  + Add action
                </button>
              </div>
              {(form.actions || []).map((a: any, i: number) => (
                <div key={i} className="mb-2 rounded-lg border border-gray-100 p-2.5">
                  <div className="flex gap-2">
                    <select className="input max-w-48" value={a.type} onChange={(e) => setAction(i, { type: e.target.value, config: {} })}>
                      {metaOpts.actions.map((t: string) => <option key={t} value={t}>{ACTION_LABEL[t] || t}</option>)}
                    </select>
                    <div className="flex-1">
                      {['send_email', 'send_whatsapp', 'send_sms'].includes(a.type) && (
                        <select className="input" value={a.config?.templateId || ''} onChange={(e) => setActionCfg(i, 'templateId', e.target.value)}>
                          <option value="">— choose template —</option>
                          {templates.filter((t) => t.channel === a.type.replace('send_', '')).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      )}
                      {a.type === 'wait' && (
                        <div className="flex gap-2">
                          <input type="number" className="input" placeholder="days" value={a.config?.days || ''} onChange={(e) => setActionCfg(i, 'days', Number(e.target.value))} />
                          <input type="number" className="input" placeholder="hours" value={a.config?.hours || ''} onChange={(e) => setActionCfg(i, 'hours', Number(e.target.value))} />
                          <input type="number" className="input" placeholder="minutes" value={a.config?.minutes || ''} onChange={(e) => setActionCfg(i, 'minutes', Number(e.target.value))} />
                        </div>
                      )}
                      {a.type === 'schedule_call' && (
                        <input type="number" className="input" placeholder="offset minutes (e.g. 30)" value={a.config?.offsetMinutes || ''} onChange={(e) => setActionCfg(i, 'offsetMinutes', Number(e.target.value))} />
                      )}
                      {a.type === 'create_task' && (
                        <input className="input" placeholder="Task title (placeholders ok)" value={a.config?.title || ''} onChange={(e) => setActionCfg(i, 'title', e.target.value)} />
                      )}
                      {a.type === 'create_followup' && (
                        <div className="flex gap-2">
                          <input type="number" className="input" placeholder="due in hours" value={a.config?.dueOffsetHours || ''} onChange={(e) => setActionCfg(i, 'dueOffsetHours', Number(e.target.value))} />
                          <input className="input" placeholder="note" value={a.config?.note || ''} onChange={(e) => setActionCfg(i, 'note', e.target.value)} />
                        </div>
                      )}
                      {a.type === 'assign_owner' && (
                        <select className="input" value={a.config?.strategy || 'round_robin'} onChange={(e) => setActionCfg(i, 'strategy', e.target.value)}>
                          <option value="round_robin">round robin</option>
                          <option value="load_balanced">load balanced</option>
                        </select>
                      )}
                      {['add_tag', 'remove_tag'].includes(a.type) && (
                        <input className="input" placeholder="tag" value={a.config?.tag || ''} onChange={(e) => setActionCfg(i, 'tag', e.target.value)} />
                      )}
                      {a.type === 'update_field' && (
                        <div className="flex gap-2">
                          <select className="input max-w-36" value={a.config?.field || 'rating'} onChange={(e) => setActionCfg(i, 'field', e.target.value)}>
                            {['status', 'rating', 'serviceInterest', 'score'].map((f) => <option key={f}>{f}</option>)}
                          </select>
                          <input className="input" placeholder="value" value={a.config?.value ?? ''} onChange={(e) => setActionCfg(i, 'value', e.target.value)} />
                        </div>
                      )}
                      {a.type === 'notify_user' && (
                        <div className="flex gap-2">
                          <select className="input max-w-36" value={a.config?.who || 'owner'} onChange={(e) => setActionCfg(i, 'who', e.target.value)}>
                            <option value="owner">owner</option><option value="managers">managers</option>
                          </select>
                          <input className="input" placeholder="message" value={a.config?.message || ''} onChange={(e) => setActionCfg(i, 'message', e.target.value)} />
                        </div>
                      )}
                    </div>
                    <button className="text-red-400" onClick={() => setForm({ ...form, actions: form.actions.filter((_: any, j: number) => j !== i) })}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save rule'}</button>
        </div>
      </Modal>

      {/* Run log */}
      <Modal open={!!runs} onClose={() => setRuns(null)} title={`Run log — ${runs?.rule?.name || ''}`} wide>
        {runs?.items?.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No runs yet.</p>}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {runs?.items?.map((r: any) => (
            <div key={r._id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <Badge color={r.status === 'completed' ? 'green' : r.status === 'failed' ? 'red' : r.status === 'skipped' ? 'gray' : 'yellow'}>{r.status}</Badge>
                <span className="text-[11px] text-gray-400">{fmtDate(r.createdAt)}</span>
              </div>
              {r.skippedReason && <p className="mt-1 text-xs text-gray-400">{r.skippedReason}</p>}
              <ul className="mt-1.5 space-y-0.5">
                {(r.steps || []).map((s: any, i: number) => (
                  <li key={i} className="text-xs">
                    {s.status === 'ok' ? '✅' : s.status === 'waiting' ? '⏳' : '❌'} {ACTION_LABEL[s.actionType] || s.actionType}
                    {s.error && <span className="text-red-500"> — {s.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default AutomationsPage;
