import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { get, post, put, patch, errMsg } from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { can } from '@/features/auth/authSlice';
import { Spinner, Badge, statusColor, Pagination, PageHeader, Modal, Empty, fmtDate } from '@/components/ui';
import {
  CallButton, RecordingPlayer, VoiceSetupBanner, useCallConfig,
  callStatusColor, fmtDuration,
} from '@/components/calls';

type Tab = 'calls' | 'campaigns' | 'scripts';

const CallsPage = () => {
  const user = useAppSelector((s) => s.auth.user);
  const config = useCallConfig();
  const [tab, setTab] = useState<Tab>('calls');

  return (
    <div>
      <PageHeader
        title="Calls"
        subtitle={config?.voiceReady
          ? `Click-to-call via Twilio (${config.fromNumber}) — your phone rings first, then the lead`
          : 'Scheduled + logged calls. Configure Twilio to enable click-to-call.'}
      />
      <VoiceSetupBanner />

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {([['calls', 'Calls'], ['campaigns', 'Campaigns'], ['scripts', 'Scripts']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === k ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calls' && <CallsTab />}
      {tab === 'campaigns' && <CampaignsTab canBulk={can(user, 'calls:bulk')} />}
      {tab === 'scripts' && <ScriptsTab />}
    </div>
  );
};

/* ── Calls ──────────────────────────────────────────────────────────────── */

const CallsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({ status: 'scheduled', page: 1 });
  const [logModal, setLogModal] = useState<any>(null);
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

  const retry = async (call: any) => {
    try {
      await post(`/crm/api/calls/${call._id}/retry`, { now: true });
      toast.success('Retrying now');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const personOf = (c: any) =>
    c.leadId?.name || `${c.contactId?.firstName || ''} ${c.contactId?.lastName || ''}`.trim() || '—';
  const phoneOf = (c: any) => c.leadId?.phone || c.contactId?.phone || c.toNumber || '';

  const STATUS_TABS = ['scheduled', 'in_progress', 'completed', 'no_answer', 'failed', 'missed', ''];

  return (
    <>
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        {STATUS_TABS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilters({ ...filters, status: s, page: 1 })}
            className={filters.status === s ? 'btn-primary' : 'btn-secondary'}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <select
          className="input ml-auto max-w-[160px]"
          value={filters.direction || ''}
          onChange={(e) => setFilters({ ...filters, direction: e.target.value, page: 1 })}
        >
          <option value="">All directions</option>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No calls here." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">With</th><th className="th">When</th><th className="th">Status</th>
                <th className="th">Duration</th><th className="th">Outcome</th>
                <th className="th">Recording</th><th className="th">Owner</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="td font-medium">
                    {c.leadId
                      ? <Link to={`/leads/${c.leadId._id}`} className="hover:text-primary-600">{personOf(c)}</Link>
                      : personOf(c)}
                    <p className="text-xs font-normal text-gray-400">
                      {phoneOf(c)}
                      {c.direction === 'inbound' && ' · inbound'}
                      {c.mode === 'auto' && ' · automated'}
                      {(c.attemptNo || 1) > 1 && ` · attempt #${c.attemptNo}`}
                    </p>
                  </td>
                  <td className="td text-xs">{fmtDate(c.startedAt || c.scheduledAt || c.createdAt)}</td>
                  <td className="td">
                    <Badge color={callStatusColor(c.status)}>{c.status.replace('_', ' ')}</Badge>
                    {c.errorMessage && (
                      <p className="mt-1 max-w-[220px] text-xs text-red-500" title={c.errorMessage}>
                        {c.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="td text-xs">{fmtDuration(c.durationSec)}</td>
                  <td className="td text-xs">{c.outcome?.replace('_', ' ') || '—'}</td>
                  <td className="td text-xs">
                    {c.recordingSid ? <RecordingPlayer callId={c._id} /> : '—'}
                  </td>
                  <td className="td text-xs">{c.ownerId?.name || '—'}</td>
                  <td className="td space-x-2 whitespace-nowrap text-right text-xs">
                    {c.status === 'scheduled' && (
                      <>
                        <CallButton
                          callId={c._id}
                          phone={phoneOf(c)}
                          label="Call"
                          className="!inline-flex !w-auto !px-2 !py-1"
                          onFinished={load}
                        />
                        <button className="text-primary-600 hover:underline" onClick={() => { setLogModal(c); setMForm({}); }}>Log</button>
                        <button className="text-gray-500 hover:underline" onClick={() => { setReschedModal(c); setMForm({}); }}>Reschedule</button>
                        <button className="text-red-500 hover:underline" onClick={() => cancel(c)}>Cancel</button>
                      </>
                    )}
                    {['no_answer', 'busy', 'failed', 'missed'].includes(c.status) && (
                      <button className="text-primary-600 hover:underline" onClick={() => retry(c)}>Retry</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters((f: any) => ({ ...f, page: p }))} />
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
    </>
  );
};

/* ── Campaigns (bulk + scheduled outbound) ──────────────────────────────── */

const CampaignsTab = ({ canBulk }: { canBulk: boolean }) => {
  const config = useCallConfig();
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ mode: 'auto', concurrency: 1, maxAttempts: 2, leadStatus: 'new' });
  const [preview, setPreview] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/calls/campaigns/list', { page, limit: 20 });
      setItems(res.data as any[]);
      setMeta(res.meta);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get('/crm/api/calls/scripts/list', { limit: 100 }).then((r) => setScripts(r.data as any[])).catch(() => {});
  }, []);

  /** Resolve the audience before creating anything, so the operator sees the
   *  blast radius rather than discovering it after 400 calls have gone out. */
  const loadPreview = async () => {
    try {
      const res = await get('/crm/api/leads', { status: form.leadStatus, limit: 100 });
      setPreview((res.data as any[]).filter((l) => l.phone && !l.doNotCall));
    } catch (err) { toast.error(errMsg(err)); }
  };

  const create = async () => {
    if (!preview?.length) return toast.error('Load the audience first');
    if (form.mode === 'auto' && !form.scriptId) return toast.error('Pick a script for an automated campaign');
    setBusy(true);
    try {
      const res: any = await post('/crm/api/calls/bulk', {
        name: form.name || undefined,
        mode: form.mode,
        scriptId: form.scriptId || undefined,
        leadIds: preview.map((l) => l._id),
        startAt: form.startAt || undefined,
        concurrency: Number(form.concurrency) || 1,
        maxAttempts: Number(form.maxAttempts) || 2,
        windowStart: form.windowStart || undefined,
        windowEnd: form.windowEnd || undefined,
      });
      toast.success(`Campaign created — ${res.campaign.targets.length} target(s)${res.skipped?.length ? `, ${res.skipped.length} skipped` : ''}`);
      setModal(false); setForm({ mode: 'auto', concurrency: 1, maxAttempts: 2, leadStatus: 'new' }); setPreview(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const act = async (camp: any, action: string) => {
    if (action === 'cancel' && !window.confirm('Cancel this campaign and hang up live calls?')) return;
    try {
      await patch(`/crm/api/calls/campaigns/${camp._id}/${action}`);
      toast.success(`Campaign ${action}d`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Bulk and scheduled outbound calling.
          {config && ` Dialling window ${config.callWindow.start}–${config.callWindow.end}; calls outside it are deferred.`}
        </p>
        {canBulk && (
          <button className="btn-primary" onClick={() => setModal(true)} disabled={!config?.voiceReady}>
            <PlusIcon className="h-4 w-4" />New campaign
          </button>
        )}
      </div>

      {config && !config.automatedCallingEnabled && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          Automated (robocall) mode is disabled. Turn on <b>automatedCallingEnabled</b> in CRM Settings to run
          script-driven campaigns; agent-bridged campaigns work without it.
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No campaigns yet." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th><th className="th">Mode</th><th className="th">Status</th>
                <th className="th">Progress</th><th className="th">Connected</th>
                <th className="th">Owner</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c) => {
                const done = (c.stats?.completed || 0) + (c.stats?.failed || 0);
                const total = c.stats?.total || 0;
                return (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="td font-medium">{c.name}
                      <p className="text-xs font-normal text-gray-400">{c.scriptId?.name || 'agent-bridged'}</p>
                    </td>
                    <td className="td text-xs">{c.mode}</td>
                    <td className="td"><Badge color={statusColor(c.status)}>{c.status}</Badge></td>
                    <td className="td text-xs">
                      <div className="h-1.5 w-24 overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
                        />
                      </div>
                      {done}/{total}
                    </td>
                    <td className="td text-xs">
                      {c.stats?.answered || 0} answered
                      {c.stats?.machine ? ` · ${c.stats.machine} voicemail` : ''}
                    </td>
                    <td className="td text-xs">{c.ownerId?.name || '—'}</td>
                    <td className="td space-x-2 whitespace-nowrap text-right text-xs">
                      {canBulk && ['running', 'scheduled'].includes(c.status) && (
                        <button className="text-gray-600 hover:underline" onClick={() => act(c, 'pause')}>
                          <PauseIcon className="inline h-3 w-3" /> Pause
                        </button>
                      )}
                      {canBulk && c.status === 'paused' && (
                        <button className="text-green-600 hover:underline" onClick={() => act(c, 'resume')}>
                          <PlayIcon className="inline h-3 w-3" /> Resume
                        </button>
                      )}
                      {canBulk && !['completed', 'cancelled'].includes(c.status) && (
                        <button className="text-red-500 hover:underline" onClick={() => act(c, 'cancel')}>
                          <XMarkIcon className="inline h-3 w-3" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New calling campaign">
        <div className="space-y-3">
          <div><label className="label">Name</label>
            <input className="input" placeholder="March re-engagement"
              onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Mode</label>
              <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="auto">Automated (plays a script)</option>
                <option value="bridge">Agent-bridged (rings you first)</option>
              </select></div>
            {form.mode === 'auto' && (
              <div><label className="label">Script *</label>
                <select className="input" onChange={(e) => setForm({ ...form, scriptId: e.target.value })}>
                  <option value="">Pick a script…</option>
                  {scripts.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select></div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Audience: lead status</label>
              <select className="input" value={form.leadStatus}
                onChange={(e) => { setForm({ ...form, leadStatus: e.target.value }); setPreview(null); }}>
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation'].map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div className="flex items-end">
              <button className="btn-secondary w-full justify-center" onClick={loadPreview}>Load audience</button>
            </div>
          </div>

          {preview && (
            <p className={`text-xs ${preview.length ? 'text-green-600' : 'text-red-500'}`}>
              {preview.length} callable lead(s) with a phone number and no Do-Not-Call flag.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Start at</label>
              <input type="datetime-local" className="input"
                onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></div>
            <div><label className="label">Concurrency</label>
              <input type="number" min={1} max={5} className="input" value={form.concurrency}
                onChange={(e) => setForm({ ...form, concurrency: e.target.value })} /></div>
            <div><label className="label">Max attempts</label>
              <input type="number" min={1} max={5} className="input" value={form.maxAttempts}
                onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Window start</label>
              <input type="time" className="input" placeholder={config?.callWindow.start}
                onChange={(e) => setForm({ ...form, windowStart: e.target.value })} /></div>
            <div><label className="label">Window end</label>
              <input type="time" className="input" placeholder={config?.callWindow.end}
                onChange={(e) => setForm({ ...form, windowEnd: e.target.value })} /></div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={busy || !preview?.length}>
            {busy ? 'Creating…' : `Create${preview?.length ? ` (${preview.length} calls)` : ''}`}
          </button>
        </div>
      </Modal>
    </>
  );
};

/* ── Scripts (what an automated call says) ──────────────────────────────── */

const ScriptsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({ steps: [] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/calls/scripts/list', { limit: 50 });
      setItems(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({
      name: '',
      voice: 'Polly.Aditi',
      language: 'en-IN',
      // A sensible starting point: greet, qualify with one keypress, exit.
      steps: [
        { kind: 'say', text: 'Hello {{firstName}}, this is a call from {{brand}}.' },
        {
          kind: 'gather',
          text: 'Press 1 if you are interested, or 2 if you would rather not be contacted.',
          numDigits: 1,
          branches: { '1': 'interested', '2': 'not_interested' },
        },
        { kind: 'say', text: 'Thank you for your time. Goodbye.' },
      ],
      voicemailText: 'Hello {{firstName}}, this is {{brand}}. We will try again later. Thank you.',
    });
    setModal('new');
  };

  const save = async () => {
    if (!form.name) return toast.error('Name is required');
    setBusy(true);
    try {
      if (modal === 'new') await post('/crm/api/calls/scripts', form);
      else await put(`/crm/api/calls/scripts/${form._id}`, form);
      toast.success('Script saved');
      setModal(null); load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const setStep = (i: number, patchObj: any) => {
    const steps = [...form.steps];
    steps[i] = { ...steps[i], ...patchObj };
    setForm({ ...form, steps });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          What an automated call says. Supports <code>{'{{firstName}}'}</code>, <code>{'{{name}}'}</code>,{' '}
          <code>{'{{company}}'}</code>, <code>{'{{agent}}'}</code> and <code>{'{{brand}}'}</code>.
        </p>
        <button className="btn-primary" onClick={openNew}><PlusIcon className="h-4 w-4" />New script</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <Empty message="No scripts yet." /> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="th">Name</th><th className="th">Steps</th><th className="th">Voice</th><th className="th"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-xs">{s.steps?.length || 0} step(s)</td>
                  <td className="td text-xs">{s.voice} · {s.language}</td>
                  <td className="td text-right text-xs">
                    <button className="text-primary-600 hover:underline"
                      onClick={() => { setForm(s); setModal('edit'); }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'New call script' : 'Edit call script'}>
        <div className="space-y-3">
          <div><label className="label">Name *</label>
            <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Voice</label>
              <select className="input" value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
                {['Polly.Aditi', 'Polly.Raveena', 'Polly.Joanna', 'Polly.Matthew', 'alice'].map((v) => <option key={v}>{v}</option>)}
              </select></div>
            <div><label className="label">Language</label>
              <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {['en-IN', 'en-US', 'en-GB', 'hi-IN'].map((v) => <option key={v}>{v}</option>)}
              </select></div>
          </div>

          <label className="label">Steps</label>
          {(form.steps || []).map((st: any, i: number) => (
            <div key={i} className="rounded border border-gray-200 p-2">
              <div className="mb-1 flex items-center gap-2">
                <select className="input !w-28 !py-1 text-xs" value={st.kind}
                  onChange={(e) => setStep(i, { kind: e.target.value })}>
                  {['say', 'gather', 'record', 'dial', 'hangup'].map((k) => <option key={k}>{k}</option>)}
                </select>
                <button className="ml-auto text-xs text-red-500 hover:underline"
                  onClick={() => setForm({ ...form, steps: form.steps.filter((_: any, j: number) => j !== i) })}>
                  Remove
                </button>
              </div>
              {['say', 'gather'].includes(st.kind) && (
                <textarea className="input text-xs" rows={2} value={st.text || ''}
                  placeholder="What the caller hears"
                  onChange={(e) => setStep(i, { text: e.target.value })} />
              )}
              {st.kind === 'gather' && (
                <input className="input mt-1 text-xs" placeholder='Branches JSON, e.g. {"1":"interested","2":"not_interested"}'
                  defaultValue={JSON.stringify(st.branches || {})}
                  onBlur={(e) => {
                    try { setStep(i, { branches: JSON.parse(e.target.value || '{}') }); }
                    catch { toast.error('Branches must be valid JSON'); }
                  }} />
              )}
              {st.kind === 'dial' && (
                <input className="input text-xs" placeholder="+919876543210" value={st.transferTo || ''}
                  onChange={(e) => setStep(i, { transferTo: e.target.value })} />
              )}
            </div>
          ))}
          <button className="btn-secondary w-full justify-center text-xs"
            onClick={() => setForm({ ...form, steps: [...(form.steps || []), { kind: 'say', text: '' }] })}>
            <PlusIcon className="h-3 w-3" />Add step
          </button>

          <div><label className="label">Voicemail message (played when a machine answers)</label>
            <textarea className="input" rows={2} value={form.voicemailText || ''}
              onChange={(e) => setForm({ ...form, voicemailText: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save script'}</button>
        </div>
      </Modal>
    </>
  );
};

export default CallsPage;
