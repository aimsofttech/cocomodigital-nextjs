import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { get, post, put, del, errMsg } from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { can } from '@/features/auth/authSlice';
import { Spinner, Badge, PageHeader, Modal, Empty, confirmAction } from '@/components/ui';

const TemplatesPage = () => {
  const user = useAppSelector((s) => s.auth.user);
  const manage = can(user, 'templates:manage');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/templates', { channel: channel || undefined, limit: 100 });
      setItems(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [channel]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.channel || !form.body) return toast.error('Name, channel and body are required');
    setBusy(true);
    try {
      if (editing && editing._id) await put(`/crm/api/templates/${editing._id}`, form);
      else await post('/crm/api/templates', form);
      toast.success('Saved');
      setEditing(null); setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirmAction('Delete this template?')) return;
    try { await del(`/crm/api/templates/${id}`); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  const showPreview = async (tpl: any) => {
    try {
      const res: any = await post(`/crm/api/templates/${tpl._id}/preview`, {});
      setPreview({ ...res, name: tpl.name, channel: tpl.channel });
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div>
      <PageHeader
        title="Message Templates"
        subtitle="Placeholders: {{name}} {{first_name}} {{company}} {{service}} {{budget}} {{agent_name}} {{brand}}"
        actions={manage && (
          <button className="btn-primary" onClick={() => { setEditing({}); setForm({ channel: 'email' }); }}>
            <PlusIcon className="h-4 w-4" />New Template
          </button>
        )}
      />

      <div className="card mb-4 flex gap-2 p-3">
        {[['', 'All'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS']].map(([v, label]) => (
          <button key={v} onClick={() => setChannel(v)} className={channel === v ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : items.length === 0 ? <div className="card"><Empty message="No templates yet." /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <div key={t._id} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <Badge color={t.channel === 'whatsapp' ? 'green' : t.channel === 'sms' ? 'blue' : 'purple'}>{t.channel}</Badge>
              </div>
              {t.subject && <p className="mb-1 text-xs font-medium text-gray-600">Subject: {t.subject}</p>}
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-gray-500">{t.body.replace(/<[^>]+>/g, ' ')}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{t.category || 'uncategorised'}{!t.isActive && ' · inactive'}</span>
                <div className="space-x-2 text-xs">
                  <button className="text-gray-600 hover:underline" onClick={() => showPreview(t)}>Preview</button>
                  {manage && <button className="text-primary-600 hover:underline" onClick={() => { setEditing(t); setForm(t); }}>Edit</button>}
                  {manage && <button className="text-red-500 hover:underline" onClick={() => remove(t._id)}>Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Template' : 'New Template'} wide>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Name *</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Channel *</label>
              <select className="input" value={form.channel || 'email'} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                <option value="email">email</option><option value="whatsapp">whatsapp</option><option value="sms">sms</option>
              </select></div>
            <div><label className="label">Category</label>
              <select className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {['welcome', 'follow_up', 'meeting', 'promo', 'onboarding'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          {form.channel === 'email' && (
            <div><label className="label">Subject</label>
              <input className="input" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          )}
          <div><label className="label">Body * (HTML allowed for email)</label>
            <textarea className="input font-mono text-xs" rows={8} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          {editing?._id && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`Preview: ${preview?.name || ''}`}>
        {preview?.sampleLead && <p className="mb-2 text-xs text-gray-400">Rendered with lead: {preview.sampleLead.name}</p>}
        {preview?.subject && <p className="mb-2 rounded bg-gray-50 p-2 text-sm font-semibold">{preview.subject}</p>}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: preview?.body || '' }} />
      </Modal>
    </div>
  );
};

export default TemplatesPage;
