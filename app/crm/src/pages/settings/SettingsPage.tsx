import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { get, post, put, del, errMsg } from '@/services/api';
import { Spinner, Badge, PageHeader, Modal, confirmAction, fmtDate } from '@/components/ui';

type Tab = 'general' | 'users' | 'roles' | 'system';

const SettingsPage = () => {
  const [tab, setTab] = useState<Tab>('general');
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(['general', 'users', 'roles', 'system'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('border-b-2 px-4 py-2 text-sm font-medium capitalize',
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'general' && <GeneralTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
};

/* ── General ── */
const GeneralTab = () => {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { get('/crm/api/settings').then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Spinner />;
  const s = data.settings;
  const setS = (k: string, v: any) => setData({ ...data, settings: { ...s, [k]: v } });

  const save = async () => {
    setBusy(true);
    try { await put('/crm/api/settings', s); toast.success('Settings saved'); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Workspace</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Quiet hours start</label>
            <input className="input" value={s.quietHoursStart} onChange={(e) => setS('quietHoursStart', e.target.value)} /></div>
          <div><label className="label">Quiet hours end</label>
            <input className="input" value={s.quietHoursEnd} onChange={(e) => setS('quietHoursEnd', e.target.value)} /></div>
          <div><label className="label">Idle lead threshold (days)</label>
            <input type="number" className="input" value={s.idleLeadDays} onChange={(e) => setS('idleLeadDays', Number(e.target.value))} /></div>
          <div><label className="label">Follow-up escalation (hours)</label>
            <input type="number" className="input" value={s.followupEscalateHours} onChange={(e) => setS('followupEscalateHours', Number(e.target.value))} /></div>
          <div><label className="label">Default country code</label>
            <input className="input" value={s.defaultCountryCode} onChange={(e) => setS('defaultCountryCode', e.target.value)} /></div>
          <div><label className="label">Assignment strategy</label>
            <select className="input" value={s.assignmentStrategy} onChange={(e) => setS('assignmentStrategy', e.target.value)}>
              <option value="round_robin">round robin</option><option value="load_balanced">load balanced</option>
            </select></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!s.emailTracking} onChange={(e) => setS('emailTracking', e.target.checked)} />
          Email open tracking pixel
        </label>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Channel providers</h3>
        <ul className="space-y-2 text-sm">
          {[
            ['Email (SMTP)', data.providers.email, 'Configured via SMTP_* env — reuses the existing mailer.'],
            ['WhatsApp Cloud API', data.providers.whatsappCloud, 'Set WA_ACCESS_TOKEN + WA_PHONE_NUMBER_ID to enable fully-automatic sending.'],
            ['WhatsApp — Twilio', data.providers.whatsappTwilio, 'Set TWILIO_WHATSAPP_FROM (sandbox: whatsapp:+14155238886). Recipients must join the sandbox first.'],
            ['WhatsApp free link mode', data.providers.whatsappLinkMode, 'Fallback when no WhatsApp provider is configured — generates wa.me links, ₹0 cost.'],
            ['SMS — Twilio', data.providers.smsTwilio, 'Set TWILIO_ACCOUNT_SID / AUTH_TOKEN / SMS_FROM.'],
            ['SMS — MSG91', data.providers.smsMsg91, 'Set MSG91_AUTH_KEY + MSG91_SENDER_ID.'],
            ['Click-to-call — Twilio Voice', data.providers.voiceTwilio, 'Set TWILIO_VOICE_FROM. Without it, calls use tel: links (free).'],
          ].map(([label, on, hint]) => (
            <li key={label as string} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              <Badge color={on ? 'green' : 'gray'}>{on ? 'active' : 'off'}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ── Users ── */
const UsersTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        get('/crm/api/users', { limit: 100 }),
        get('/crm/api/roles'),
      ]);
      setUsers(u.data as any[]);
      setRoles(r.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      if (editing?._id) await put(`/crm/api/users/${editing._id}`, form);
      else await post('/crm/api/users', form);
      toast.success('Saved');
      setEditing(null); setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const deactivate = async (u: any) => {
    if (!confirmAction(`Deactivate ${u.name}?`)) return;
    try { await del(`/crm/api/users/${u._id}`); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">Team members</h3>
        <button className="btn-primary" onClick={() => { setEditing({}); setForm({}); }}>+ Add user</button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Status</th><th className="th">Last login</th><th className="th"></th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-gray-50">
              <td className="td font-medium">{u.name}</td>
              <td className="td text-xs">{u.email}</td>
              <td className="td text-xs">{u.roleId?.name || '—'}</td>
              <td className="td"><Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'inactive'}</Badge></td>
              <td className="td text-xs text-gray-400">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'never'}</td>
              <td className="td space-x-2 text-right text-xs">
                <button className="text-primary-600 hover:underline" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, phone: u.phone, roleId: u.roleId?._id, isActive: u.isActive }); }}>Edit</button>
                {u.isActive && <button className="text-red-500 hover:underline" onClick={() => deactivate(u)}>Deactivate</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit user' : 'Add user'}>
        <div className="space-y-3">
          <div><label className="label">Name *</label>
            <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email *</label>
            <input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Phone (used for click-to-call)</label>
            <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">{editing?._id ? 'New password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><label className="label">Role *</label>
            <select className="input" value={form.roleId || ''} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">— choose —</option>
              {roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select></div>
          {editing?._id && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  );
};

/* ── Roles ── */
const RolesTab = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([get('/crm/api/roles'), get('/crm/api/users/permissions')]);
      setRoles(r.data as any[]);
      setPerms(p.data as string[]);
    } catch (err) { toast.error(errMsg(err)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      if (editing?._id) await put(`/crm/api/roles/${editing._id}`, form);
      else await post('/crm/api/roles', form);
      toast.success('Saved');
      setEditing(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const togglePerm = (p: string) => {
    const list: string[] = form.permissions || [];
    setForm({ ...form, permissions: list.includes(p) ? list.filter((x) => x !== p) : [...list, p] });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">Roles & permissions</h3>
        <button className="btn-primary" onClick={() => { setEditing({}); setForm({ permissions: [] }); }}>+ Add role</button>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr><th className="th">Role</th><th className="th">Users</th><th className="th">Scope</th><th className="th">Permissions</th><th className="th"></th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {roles.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50">
              <td className="td font-medium">{r.name} {r.isSystem && <Badge>system</Badge>}</td>
              <td className="td text-xs">{r.userCount}</td>
              <td className="td text-xs">{r.ownScope ? 'Own records only' : 'All records'}</td>
              <td className="td text-xs">{r.permissions.includes('*') ? 'Everything' : `${r.permissions.length} permissions`}</td>
              <td className="td text-right text-xs">
                <button className="text-primary-600 hover:underline" onClick={() => { setEditing(r); setForm({ name: r.name, permissions: [...r.permissions], ownScope: r.ownScope }); }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? `Edit role: ${editing.name}` : 'Add role'} wide>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name</label>
              <input className="input" value={form.name || ''} disabled={editing?.isSystem}
                onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.ownScope} onChange={(e) => setForm({ ...form, ownScope: e.target.checked })} />
              Own-records scope (agent mode)
            </label>
          </div>
          {(form.permissions || []).includes('*') ? (
            <p className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">This role has the wildcard (*) — full access to everything.</p>
          ) : (
            <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto md:grid-cols-3">
              {perms.map((p) => (
                <label key={p} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-gray-50">
                  <input type="checkbox" checked={(form.permissions || []).includes(p)} onChange={() => togglePerm(p)} />
                  {p}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  );
};

/* ── System (scheduler + audit) ── */
const SystemTab = () => {
  const [jobs, setJobs] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    get('/crm/api/settings/jobs').then((r) => setJobs(r.data)).catch(() => {});
    get('/crm/api/settings/audit-logs', { limit: 30 }).then((r) => setAudit(r.data as any[])).catch(() => {});
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold">Background scheduler {jobs && <Badge color="blue">{jobs.pending} pending</Badge>}</h3>
        {!jobs ? <Spinner /> : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {jobs.recent.map((j: any) => (
              <li key={j._id} className="flex items-center justify-between border-b border-gray-50 py-1.5 text-xs">
                <span className="font-mono">{j.name}</span>
                <span className="flex items-center gap-2">
                  <Badge color={j.status === 'done' ? 'green' : j.status === 'failed' ? 'red' : j.status === 'pending' ? 'blue' : 'gray'}>{j.status}</Badge>
                  <span className="text-gray-400">{fmtDate(j.runAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold">Audit log</h3>
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {audit.map((a) => (
            <li key={a._id} className="border-b border-gray-50 py-1.5 text-xs">
              <span className="font-medium">{a.userName}</span> — {a.action}
              <span className="float-right text-gray-400">{fmtDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
