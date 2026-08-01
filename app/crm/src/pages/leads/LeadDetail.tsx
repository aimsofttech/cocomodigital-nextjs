import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, ClockIcon,
  CheckCircleIcon, ArrowPathIcon, UserPlusIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import api, { get, post, put, patch, errMsg } from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { can } from '@/features/auth/authSlice';
import { Spinner, Badge, statusColor, Modal, fmtDate } from '@/components/ui';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'lost', 'junk'];

const ACTIVITY_ICON: Record<string, string> = {
  'note.added': '📝', 'lead.created': '✨', 'lead.status_changed': '🔄', 'lead.assigned': '👤',
  'lead.converted': '🏆', 'lead.re_enquired': '🔁', 'call.scheduled': '📅', 'call.logged': '📞',
  'message.sent': '📤', 'message.received': '📥', 'task.created': '✅', 'task.completed': '☑️',
  'followup.created': '⏰', 'followup.done': '⏱️', 'document.uploaded': '📎',
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [lead, setLead] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // composer
  const [tab, setTab] = useState<'note' | 'email' | 'whatsapp' | 'sms'>('note');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState('');

  // modals
  const [modal, setModal] = useState<'' | 'call' | 'logcall' | 'followup' | 'task' | 'convert' | 'lost'>('');
  const [mForm, setMForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const [leadRes, tlRes] = await Promise.all([
        get(`/crm/api/leads/${id}`),
        get(`/crm/api/leads/${id}/timeline`, { limit: 50 }),
      ]);
      setLead(leadRes.data);
      setTimeline(tlRes.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get('/crm/api/templates', { active: 'true', limit: 100 }).then((r) => setTemplates(r.data as any[])).catch(() => {});
    if (can(user, 'users:manage') || can(user, 'leads:assign')) {
      get('/crm/api/users', { limit: 100 }).then((r) => setUsers(r.data as any[])).catch(() => {});
    }
  }, [user]);

  if (!lead) return <Spinner />;

  const doStatus = async (status: string) => {
    if (['lost', 'junk'].includes(status)) { setMForm({ status }); setModal('lost'); return; }
    try { await patch(`/crm/api/leads/${id}/status`, { status }); toast.success('Status updated'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const doAssign = async (ownerId: string) => {
    try { await patch(`/crm/api/leads/${id}/assign`, { ownerId }); toast.success('Assigned'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const sendComposer = async () => {
    if (!text && !templateId) return toast.error('Write a message or pick a template');
    setBusy(true);
    try {
      if (tab === 'note') {
        await post(`/crm/api/leads/${id}/notes`, { note: text });
        toast.success('Note added');
      } else {
        const msg: any = await post('/crm/api/messages/send', {
          channel: tab, leadId: id,
          templateId: templateId || undefined,
          subject: tab === 'email' ? subject || undefined : undefined,
          body: text || undefined,
        });
        // Sends are queued and delivered by the worker, so the provider isn't
        // known yet — the timeline shows the outcome (or the wa.me link).
        toast.success('Message queued');
      }
      setText(''); setSubject(''); setTemplateId('');
      setTimeout(load, 800);
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const submitModal = async () => {
    setBusy(true);
    try {
      if (modal === 'call') {
        await post('/crm/api/calls', { leadId: id, scheduledAt: mForm.scheduledAt, purpose: mForm.purpose || 'follow_up', notes: mForm.notes });
        toast.success('Call scheduled');
      } else if (modal === 'logcall') {
        await post('/crm/api/calls/log', { leadId: id, status: mForm.status || 'completed', outcome: mForm.outcome || undefined, durationSec: Number(mForm.durationMin || 0) * 60, notes: mForm.notes });
        toast.success('Call logged');
      } else if (modal === 'followup') {
        await post('/crm/api/followups', { leadId: id, dueAt: mForm.dueAt, note: mForm.note, channelHint: mForm.channelHint || 'any' });
        toast.success('Follow-up set');
      } else if (modal === 'task') {
        await post('/crm/api/tasks', { leadId: id, title: mForm.title, dueAt: mForm.dueAt, priority: mForm.priority || 'medium', description: mForm.description });
        toast.success('Task created');
      } else if (modal === 'convert') {
        const payload: any = {};
        if (mForm.dealTitle) payload.deal = { title: mForm.dealTitle, value: Number(mForm.dealValue) || 0, expectedCloseDate: mForm.expectedCloseDate };
        await post(`/crm/api/leads/${id}/convert`, payload);
        toast.success('Lead converted to customer 🎉');
      } else if (modal === 'lost') {
        await patch(`/crm/api/leads/${id}/status`, { status: mForm.status, lostReason: mForm.lostReason });
        toast.success('Status updated');
      }
      setModal(''); setMForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const waLinkOf = (activity: any) => activity?.meta?.messageId && timeline ? null : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/leads')} className="btn-secondary">←</button>
          <div>
            <h1 className="text-xl font-bold">{lead.name}</h1>
            <p className="text-sm text-gray-500">
              {lead.company && <span>{lead.company} · </span>}
              {lead.source?.channel?.replace('_', ' ')}{lead.source?.sourcePage ? ` (${lead.source.sourcePage})` : ''}
            </p>
          </div>
          <Badge color={statusColor(lead.status)}>{lead.status}</Badge>
          <Badge color={statusColor(lead.rating)}>{lead.rating} · {lead.score}</Badge>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'won' && can(user, 'leads:convert') && (
            <button className="btn-primary" onClick={() => { setMForm({}); setModal('convert'); }}>
              <SparklesIcon className="h-4 w-4" />Convert
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Email', lead.email], ['Phone', lead.phone], ['Company', lead.company],
                ['Service', lead.serviceInterest], ['Budget', lead.budget],
                ['Created', fmtDate(lead.createdAt)], ['Last activity', fmtDate(lead.lastActivityAt)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-gray-400">{k}</dt>
                  <dd className="text-right font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {lead.message && <p className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">{lead.message}</p>}
            {lead.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">{lead.tags.map((t: string) => <Badge key={t}>{t}</Badge>)}</div>
            )}
          </div>

          {/* Status + owner */}
          <div className="card space-y-3 p-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={lead.status} disabled={lead.status === 'won'} onChange={(e) => doStatus(e.target.value)}>
                {[...STATUSES, 'won'].map((s) => <option key={s} value={s} disabled={s === 'won'}>{s}</option>)}
              </select>
            </div>
            {can(user, 'leads:assign') && (
              <div>
                <label className="label">Owner</label>
                <select className="input" value={lead.ownerId?._id || ''} onChange={(e) => doAssign(e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
            {lead.convertedContactId && (
              <p className="text-xs text-green-600">
                Converted → <Link className="underline" to={`/contacts/${lead.convertedContactId._id || lead.convertedContactId}`}>view customer</Link>
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="card grid grid-cols-2 gap-2 p-4">
            <button className="btn-secondary justify-center" onClick={() => { setMForm({}); setModal('call'); }}>
              <PhoneIcon className="h-4 w-4" />Schedule call
            </button>
            <button className="btn-secondary justify-center" onClick={() => { setMForm({}); setModal('logcall'); }}>
              <CheckCircleIcon className="h-4 w-4" />Log call
            </button>
            <button className="btn-secondary justify-center" onClick={() => { setMForm({}); setModal('followup'); }}>
              <ClockIcon className="h-4 w-4" />Follow-up
            </button>
            <button className="btn-secondary justify-center" onClick={() => { setMForm({}); setModal('task'); }}>
              <UserPlusIcon className="h-4 w-4" />Task
            </button>
            {lead.phone && (
              <a className="btn-secondary col-span-2 justify-center" href={`tel:${lead.phone}`}>
                <PhoneIcon className="h-4 w-4" />Call now: {lead.phone}
              </a>
            )}
          </div>

          {/* Upcoming */}
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Upcoming</h3>
            {(lead.upcomingCalls?.length || 0) + (lead.pendingFollowUps?.length || 0) + (lead.openTasks?.length || 0) === 0 && (
              <p className="text-xs text-gray-400">Nothing scheduled.</p>
            )}
            {lead.upcomingCalls?.map((c: any) => (
              <p key={c._id} className="py-1 text-xs">📞 Call · {fmtDate(c.scheduledAt)}</p>
            ))}
            {lead.pendingFollowUps?.map((f: any) => (
              <p key={f._id} className="py-1 text-xs">⏰ Follow-up · {fmtDate(f.dueAt)} {f.note && `— ${f.note}`}</p>
            ))}
            {lead.openTasks?.map((t: any) => (
              <p key={t._id} className="py-1 text-xs">✅ {t.title} · {t.dueAt ? fmtDate(t.dueAt) : 'no due date'}</p>
            ))}
          </div>

          {/* Documents */}
          <DocumentsCard entityKind="lead" entityId={lead._id} documents={lead.documents || []} onChange={load} />
        </div>

        {/* Center+right: composer + timeline */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            <div className="mb-3 flex gap-1">
              {([['note', 'Note'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setTab(k); setTemplateId(''); }}
                  className={clsx('rounded-lg px-3 py-1.5 text-sm font-medium',
                    tab === k ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100')}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab !== 'note' && (
              <select className="input mb-2" value={templateId} onChange={async (e) => {
                setTemplateId(e.target.value);
                if (e.target.value) {
                  try {
                    const prev: any = await post(`/crm/api/templates/${e.target.value}/preview`, { leadId: id });
                    setText(prev.body || ''); if (tab === 'email') setSubject(prev.subject || '');
                  } catch { /* ignore */ }
                }
              }}>
                <option value="">— Use a template (optional) —</option>
                {templates.filter((t) => t.channel === tab).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            )}
            {tab === 'email' && (
              <input className="input mb-2" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            )}
            <textarea
              className="input" rows={tab === 'note' ? 2 : 4}
              placeholder={tab === 'note' ? 'Add an internal note…' : `Write your ${tab} message… ({{name}}, {{agent_name}} placeholders work)`}
              value={text} onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              {tab === 'whatsapp' && <p className="text-[11px] text-gray-400">Sends via your configured WhatsApp provider; with none set up, generates a free wa.me link you tap to send.</p>}
              <span />
              <button className="btn-primary" onClick={sendComposer} disabled={busy}>
                {busy ? 'Working…' : tab === 'note' ? 'Add note' : 'Send'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="card mt-4 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Activity timeline</h3>
              <button className="text-xs text-primary-600 hover:underline" onClick={load}><ArrowPathIcon className="inline h-3.5 w-3.5" /> Refresh</button>
            </div>
            {timeline.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No activity yet.</p>}
            <ol className="relative ml-2 space-y-4 border-l border-gray-100 pl-5 pt-2">
              {timeline.map((a) => (
                <li key={a._id} className="relative">
                  <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs ring-1 ring-gray-200">
                    {ACTIVITY_ICON[a.type] || '•'}
                  </span>
                  <p className="text-sm text-gray-800">{a.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {fmtDate(a.createdAt)} · {a.actor?.kind === 'automation' ? `⚡ ${a.actor.label || 'Automation'}` : a.actor?.label || a.actor?.kind}
                  </p>
                  {a.meta?.status === 'manual' && a.meta?.messageId && (
                    <WaLinkButton messageId={a.meta.messageId} />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <Modal open={modal === 'call'} onClose={() => setModal('')} title="Schedule a call">
        <div className="space-y-3">
          <div><label className="label">When *</label>
            <input type="datetime-local" className="input" onChange={(e) => setMForm({ ...mForm, scheduledAt: e.target.value })} /></div>
          <div><label className="label">Purpose</label>
            <select className="input" onChange={(e) => setMForm({ ...mForm, purpose: e.target.value })}>
              {['intro', 'follow_up', 'demo', 'support', 'other'].map((p) => <option key={p}>{p}</option>)}
            </select></div>
          <div><label className="label">Notes</label>
            <textarea className="input" rows={2} onChange={(e) => setMForm({ ...mForm, notes: e.target.value })} /></div>
        </div>
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Schedule" />
      </Modal>

      <Modal open={modal === 'logcall'} onClose={() => setModal('')} title="Log a call">
        <div className="space-y-3">
          <div><label className="label">Result *</label>
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
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Log call" />
      </Modal>

      <Modal open={modal === 'followup'} onClose={() => setModal('')} title="Set a follow-up">
        <div className="space-y-3">
          <div><label className="label">Due *</label>
            <input type="datetime-local" className="input" onChange={(e) => setMForm({ ...mForm, dueAt: e.target.value })} /></div>
          <div><label className="label">Note</label>
            <input className="input" onChange={(e) => setMForm({ ...mForm, note: e.target.value })} /></div>
          <div><label className="label">Channel hint</label>
            <select className="input" onChange={(e) => setMForm({ ...mForm, channelHint: e.target.value })}>
              {['any', 'call', 'whatsapp', 'sms', 'email'].map((c) => <option key={c}>{c}</option>)}
            </select></div>
        </div>
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Set follow-up" />
      </Modal>

      <Modal open={modal === 'task'} onClose={() => setModal('')} title="Create a task">
        <div className="space-y-3">
          <div><label className="label">Title *</label>
            <input className="input" onChange={(e) => setMForm({ ...mForm, title: e.target.value })} /></div>
          <div><label className="label">Due</label>
            <input type="datetime-local" className="input" onChange={(e) => setMForm({ ...mForm, dueAt: e.target.value })} /></div>
          <div><label className="label">Priority</label>
            <select className="input" onChange={(e) => setMForm({ ...mForm, priority: e.target.value })}>
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} selected={p === 'medium'}>{p}</option>)}
            </select></div>
          <div><label className="label">Description</label>
            <textarea className="input" rows={2} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} /></div>
        </div>
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Create task" />
      </Modal>

      <Modal open={modal === 'convert'} onClose={() => setModal('')} title="Convert lead to customer">
        <p className="mb-3 text-xs text-gray-500">
          Creates a customer record{lead.company ? ` under "${lead.company}"` : ''}. Optionally open a deal right away.
        </p>
        <div className="space-y-3">
          <div><label className="label">Deal title (optional)</label>
            <input className="input" placeholder="e.g. Website redesign — Acme" onChange={(e) => setMForm({ ...mForm, dealTitle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deal value (₹)</label>
              <input type="number" className="input" onChange={(e) => setMForm({ ...mForm, dealValue: e.target.value })} /></div>
            <div><label className="label">Expected close</label>
              <input type="date" className="input" onChange={(e) => setMForm({ ...mForm, expectedCloseDate: e.target.value })} /></div>
          </div>
        </div>
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Convert" />
      </Modal>

      <Modal open={modal === 'lost'} onClose={() => setModal('')} title={`Mark as ${mForm.status}`}>
        <div><label className="label">Reason *</label>
          <input className="input" placeholder="e.g. budget too low, went with competitor" onChange={(e) => setMForm({ ...mForm, lostReason: e.target.value })} /></div>
        <ModalActions onCancel={() => setModal('')} onOk={submitModal} busy={busy} okLabel="Save" />
      </Modal>
    </div>
  );
};

const ModalActions = ({ onCancel, onOk, busy, okLabel }: any) => (
  <div className="mt-4 flex justify-end gap-2">
    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
    <button className="btn-primary" onClick={onOk} disabled={busy}>{busy ? 'Working…' : okLabel}</button>
  </div>
);

/** Fetches the message to expose its wa.me link + mark-sent action (free WhatsApp mode). */
const WaLinkButton = ({ messageId }: { messageId: string }) => {
  const [msg, setMsg] = useState<any>(null);
  useEffect(() => { get(`/crm/api/messages/${messageId}`).then((r) => setMsg(r.data)).catch(() => {}); }, [messageId]);
  if (!msg || msg.status !== 'manual' || !msg.waLink) return null;
  return (
    <a
      href={msg.waLink} target="_blank" rel="noreferrer"
      onClick={() => patch(`/crm/api/messages/${messageId}/mark-sent`).catch(() => {})}
      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
    >
      <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" /> Open WhatsApp & send
    </a>
  );
};

/** Shared documents card (used by lead + contact detail). */
export const DocumentsCard = ({ entityKind, entityId, documents, onChange }: any) => {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityKind', entityKind);
      fd.append('entityId', entityId);
      await api.post('/crm/api/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Uploaded');
      onChange && onChange();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Documents</h3>
        <label className="cursor-pointer text-xs font-medium text-primary-600 hover:underline">
          {busy ? 'Uploading…' : '+ Upload'}
          <input type="file" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0] || null)} />
        </label>
      </div>
      {(!documents || documents.length === 0) && <p className="text-xs text-gray-400">No documents.</p>}
      {documents?.map((d: any) => (
        <a key={d._id} href={d.url} target="_blank" rel="noreferrer" className="block truncate py-1 text-xs text-primary-600 hover:underline">
          📎 {d.name}
        </a>
      ))}
    </div>
  );
};

export default LeadDetail;
