import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get, post, patch, errMsg } from '@/services/api';
import { Spinner, Badge, Modal, fmtDate } from '@/components/ui';
import { DocumentsCard } from '@/pages/leads/LeadDetail';

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [dealModal, setDealModal] = useState(false);
  const [dealForm, setDealForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, tRes, dRes] = await Promise.all([
        get(`/crm/api/contacts/${id}`),
        get(`/crm/api/contacts/${id}/timeline`, { limit: 50 }),
        get('/crm/api/documents', { entityKind: 'contact', entityId: id }),
      ]);
      setContact(cRes.data);
      setTimeline(tRes.data as any[]);
      setDocuments(dRes.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!contact) return <Spinner />;

  const toggleConsent = async (key: string, value: boolean) => {
    try { await patch(`/crm/api/contacts/${id}/consent`, { [key]: value }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const addNote = async () => {
    if (!note) return;
    try { await post(`/crm/api/contacts/${id}/notes`, { note }); setNote(''); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const createDeal = async () => {
    if (!dealForm.title) return toast.error('Deal title is required');
    setBusy(true);
    try {
      await post('/crm/api/deals', { ...dealForm, contactId: id, companyId: contact.companyId?._id, value: Number(dealForm.value) || 0 });
      toast.success('Deal created');
      setDealModal(false); setDealForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate('/contacts')} className="btn-secondary">←</button>
        <div>
          <h1 className="text-xl font-bold">{contact.firstName} {contact.lastName}</h1>
          <p className="text-sm text-gray-500">
            {contact.designation ? `${contact.designation} · ` : ''}{contact.companyId?.name || 'No company'}
          </p>
        </div>
        <Badge color={contact.lifecycle === 'customer' ? 'green' : 'gray'}>{contact.lifecycle.replace('_', ' ')}</Badge>
        <span className="flex-1" />
        <button className="btn-primary" onClick={() => setDealModal(true)}>+ New Deal</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            <dl className="space-y-2 text-sm">
              {[['Email', contact.email], ['Phone', contact.phone], ['Owner', contact.ownerId?.name],
                ['Customer since', fmtDate(contact.createdAt)], ['Last activity', fmtDate(contact.lastActivityAt)]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-gray-400">{k}</dt><dd className="text-right font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {contact.originLeadId && (
              <p className="mt-2 text-xs text-gray-400">
                Origin lead: <Link className="text-primary-600 underline" to={`/leads/${contact.originLeadId._id || contact.originLeadId}`}>view history</Link>
              </p>
            )}
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Messaging consent</h3>
            {[['whatsappOptIn', 'WhatsApp'], ['smsOptIn', 'SMS'], ['emailOptIn', 'Email'], ['dnd', 'Do Not Disturb (blocks all)']].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-1.5 text-sm">
                <span className={key === 'dnd' ? 'text-red-600' : ''}>{label}</span>
                <input type="checkbox" checked={!!contact[key]} onChange={(e) => toggleConsent(key, e.target.checked)} />
              </label>
            ))}
          </div>

          <DocumentsCard entityKind="contact" entityId={contact._id} documents={documents} onChange={load} />
        </div>

        <div className="lg:col-span-2">
          <div className="card p-4">
            <div className="flex gap-2">
              <input className="input" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn-primary" onClick={addNote}>Add</button>
            </div>
          </div>
          <div className="card mt-4 p-4">
            <h3 className="mb-3 text-sm font-semibold">Activity timeline (incl. lead history)</h3>
            {timeline.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No activity yet.</p>}
            <ol className="relative ml-2 space-y-4 border-l border-gray-100 pl-5 pt-2">
              {timeline.map((a) => (
                <li key={a._id} className="relative">
                  <span className="absolute -left-[27px] h-2.5 w-2.5 translate-y-1.5 rounded-full bg-primary-200" />
                  <p className="text-sm text-gray-800">{a.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {fmtDate(a.createdAt)} · {a.actor?.kind === 'automation' ? `⚡ ${a.actor.label || 'Automation'}` : a.actor?.label || a.actor?.kind}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Modal open={dealModal} onClose={() => setDealModal(false)} title="New Deal">
        <div className="space-y-3">
          <div><label className="label">Title *</label>
            <input className="input" onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Value (₹)</label>
              <input type="number" className="input" onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })} /></div>
            <div><label className="label">Expected close</label>
              <input type="date" className="input" onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })} /></div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setDealModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={createDeal} disabled={busy}>{busy ? 'Saving…' : 'Create deal'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default ContactDetail;
