import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { get, post, errMsg } from '@/services/api';
import { Spinner, Badge, statusColor, fmtDate, PageHeader } from '@/components/ui';

const InboxPage = () => {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/messages/inbox', channel ? { channel } : {});
      setThreads(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [channel]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const openThread = async (t: any) => {
    setActive(t);
    try {
      const res = await get('/crm/api/messages/thread', {
        leadId: t.leadId || undefined, contactId: t.contactId || undefined, channel: t.channel,
      });
      setMessages(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const sendReply = async () => {
    if (!reply || !active) return;
    setBusy(true);
    try {
      await post('/crm/api/messages/send', {
        channel: active.channel,
        leadId: active.leadId || undefined,
        contactId: active.contactId || undefined,
        body: reply,
        subject: active.channel === 'email' ? 'Re: your conversation with Cocoma Digital' : undefined,
      });
      setReply('');
      // Sends are queued and delivered by the worker, so the provider isn't known
      // yet: with Twilio configured this goes out automatically, otherwise the
      // thread shows a wa.me link to open. Don't promise either one here.
      toast.success('Message queued');
      setTimeout(() => openThread(active), 800);
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader title="Inbox" subtitle="All WhatsApp / SMS / Email conversations in one place" />
      <div className="card mb-4 flex gap-2 p-3">
        {[['', 'All'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email']].map(([v, label]) => (
          <button key={v} onClick={() => { setChannel(v); setActive(null); }}
            className={channel === v ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Threads */}
        <div className="card max-h-[70vh] overflow-y-auto">
          {loading ? <Spinner /> : threads.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No conversations yet.</p>
          ) : threads.map((t, i) => (
            <button
              key={i}
              onClick={() => openThread(t)}
              className={clsx('block w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50',
                active === t && 'bg-primary-50/60')}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.name}</p>
                <Badge color={t.channel === 'whatsapp' ? 'green' : t.channel === 'sms' ? 'blue' : 'purple'}>{t.channel}</Badge>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                {t.lastMessage.direction === 'inbound' ? '← ' : '→ '}{t.lastMessage.body}
              </p>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{fmtDate(t.lastMessage.createdAt)}</span>
                {t.unreadInbound > 0 && <Badge color="red">{t.unreadInbound} new</Badge>}
              </div>
            </button>
          ))}
        </div>

        {/* Active thread */}
        <div className="card flex max-h-[70vh] flex-col lg:col-span-2">
          {!active ? (
            <p className="flex flex-1 items-center justify-center p-10 text-sm text-gray-400">Select a conversation</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{active.name}</p>
                  {active.leadId && <Link to={`/leads/${active.leadId}`} className="text-xs text-primary-600 hover:underline">Open lead →</Link>}
                  {active.contactId && <Link to={`/contacts/${active.contactId}`} className="text-xs text-primary-600 hover:underline">Open customer →</Link>}
                </div>
                <Badge color={statusColor(active.channel)}>{active.channel}</Badge>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m._id} className={clsx('max-w-[75%] rounded-xl px-3 py-2 text-sm',
                    m.direction === 'outbound' ? 'ml-auto bg-primary-600 text-white' : 'bg-gray-100 text-gray-800')}>
                    {m.subject && <p className="mb-0.5 text-xs font-bold opacity-80">{m.subject}</p>}
                    <p className="whitespace-pre-wrap">{m.body?.replace(/<[^>]+>/g, ' ')}</p>
                    <p className={clsx('mt-1 text-[10px]', m.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400')}>
                      {fmtDate(m.createdAt)} · {m.status}
                      {m.status === 'queued' && m.scheduledFor && ` · held for quiet hours, sending ${fmtDate(m.scheduledFor)}`}
                      {m.status === 'failed' && m.failReason && ` · ${m.failReason}`}
                    </p>
                    {m.status === 'manual' && m.waLink && (
                      <a href={m.waLink} target="_blank" rel="noreferrer"
                        className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-[11px] underline">
                        Open WhatsApp & send →
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-gray-100 p-3">
                <input className="input" placeholder={`Reply via ${active.channel}…`} value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()} />
                <button className="btn-primary" onClick={sendReply} disabled={busy}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
