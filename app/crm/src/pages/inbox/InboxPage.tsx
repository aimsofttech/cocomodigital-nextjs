import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { get, post, errMsg } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useRealtimeEvent, useRealtimeStatus, useThreadRoom } from '@/hooks/useRealtime';
import { Spinner, Badge, fmtDate, PageHeader } from '@/components/ui';

/**
 * Live WhatsApp / SMS / Email inbox.
 *
 * The two directions of a conversation arrive by different routes: an agent's
 * message is the response to their own POST, while a customer's reply arrives
 * as a Twilio webhook on the server with no browser involved. The socket layer
 * is what makes the second one visible without a refresh — everything below is
 * written so that if the socket is down, the inbox still works, just not live.
 */

type Thread = {
  key: string; channel: string; leadId: string | null; contactId: string | null;
  name: string; phone: string | null; total: number; unreadInbound: number;
  lastMessage: { body: string; direction: string; status: string; createdAt: string };
};

type Message = {
  _id: string; channel: string; direction: 'inbound' | 'outbound';
  body: string; subject?: string; status: string; failReason?: string;
  waLink?: string; mediaUrls?: string[]; scheduledFor?: string; createdAt: string;
};

/** Delivery state as a WhatsApp-style tick. */
const StatusTick = ({ status }: { status: string }) => {
  if (status === 'failed' || status === 'bounced') return <span title="Failed" className="text-red-300">✕</span>;
  if (status === 'queued') return <span title="Queued">🕑</span>;
  if (status === 'manual') return <span title="Needs manual send">↗</span>;
  if (status === 'read') return <span title="Read" className="text-sky-300">✓✓</span>;
  if (status === 'delivered') return <span title="Delivered">✓✓</span>;
  if (status === 'sent') return <span title="Sent">✓</span>;
  return null;
};

const InboxPage = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [channel, setChannel] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);

  const connected = useRealtimeStatus();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Thread | null>(null);
  activeRef.current = active;

  useThreadRoom(active?.key ?? null);

  /* ── loading ──────────────────────────────────────────────────────────── */

  const loadThreads = useCallback(async (opts: { quiet?: boolean } = {}) => {
    if (!opts.quiet) setLoading(true);
    try {
      const res = await get<Thread[]>('/crm/api/messages/inbox', {
        ...(channel ? { channel } : {}),
        ...(search ? { q: search } : {}),
      });
      setThreads(res.data);
    } catch (err) { toast.error(errMsg(err)); }
    if (!opts.quiet) setLoading(false);
  }, [channel, search]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { loadThreads(); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadThreads, search]);

  const openThread = async (t: Thread) => {
    setActive(t);
    setMessages([]);
    setPeerTyping(null);
    try {
      const res = await get<Message[]>('/crm/api/messages/thread', {
        leadId: t.leadId || undefined, contactId: t.contactId || undefined,
        channel: t.channel, limit: 50,
      });
      setMessages(res.data);
      setHasMore(Boolean(res.meta?.hasMore));
      setNextBefore(res.meta?.nextBefore ?? null);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView());

      // Clearing unread is its own call, so paging through history does not
      // keep re-clearing it.
      if (t.unreadInbound > 0) {
        await post('/crm/api/messages/read', {
          leadId: t.leadId || undefined, contactId: t.contactId || undefined, channel: t.channel,
        });
        setThreads((prev) => prev.map((x) => (x.key === t.key ? { ...x, unreadInbound: 0 } : x)));
      }
    } catch (err) { toast.error(errMsg(err)); }
  };

  /** Walk backwards through history, keeping the reading position steady. */
  const loadOlder = async () => {
    if (!active || !hasMore || loadingOlder || !nextBefore) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await get<Message[]>('/crm/api/messages/thread', {
        leadId: active.leadId || undefined, contactId: active.contactId || undefined,
        channel: active.channel, limit: 50, before: nextBefore,
      });
      setMessages((prev) => [...res.data, ...prev]);
      setHasMore(Boolean(res.meta?.hasMore));
      setNextBefore(res.meta?.nextBefore ?? null);
      // Prepending grows the scroll container upward; without this correction
      // the view jumps and the user loses their place.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch (err) { toast.error(errMsg(err)); }
    setLoadingOlder(false);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 60 && hasMore && !loadingOlder) loadOlder();
  };

  /* ── live updates ─────────────────────────────────────────────────────── */

  const atBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useRealtimeEvent<{ key: string; message: Message }>('message:new', ({ key, message }) => {
    if (activeRef.current?.key === key) {
      const wasAtBottom = atBottom();
      // Dedupe: an agent's own message arrives twice — once as the POST
      // response, once on the socket.
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      // Only auto-scroll if they were already at the bottom; yanking the view
      // while someone reads history is worse than a missed scroll.
      if (wasAtBottom) requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      setPeerTyping(null);
    }
    loadThreads({ quiet: true });
  });

  useRealtimeEvent<{ key: string; messageId: string; status: string; failReason?: string }>(
    'message:status',
    ({ key, messageId, status, failReason }) => {
      if (activeRef.current?.key === key) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, status, failReason } : m)));
      }
      loadThreads({ quiet: true });
    }
  );

  useRealtimeEvent<{ key: string; messageIds: string[] }>('message:read', ({ key, messageIds }) => {
    if (activeRef.current?.key !== key) return;
    const ids = new Set(messageIds);
    setMessages((prev) => prev.map((m) => (ids.has(m._id) ? { ...m, status: 'read' } : m)));
  });

  // Another agent typing in the same conversation. WhatsApp does not report
  // whether the *customer* is typing, so this is colleague-awareness only.
  useRealtimeEvent<{ key: string; name?: string }>('agent:typing', ({ key, name }) => {
    if (activeRef.current?.key !== key) return;
    setPeerTyping(name || 'Someone');
    setTimeout(() => setPeerTyping(null), 3000);
  });

  const typingSentAt = useRef(0);
  const onReplyChange = (v: string) => {
    setReply(v);
    const now = Date.now();
    if (active && now - typingSentAt.current > 1500) {
      typingSentAt.current = now;
      getSocket()?.emit('agent:typing', { key: active.key });
    }
  };

  /* ── sending ──────────────────────────────────────────────────────────── */

  const sendReply = async () => {
    if (!reply.trim() || !active || sending) return;
    const text = reply;
    setSending(true);
    try {
      const msg = await post<Message>('/crm/api/messages/send', {
        channel: active.channel,
        leadId: active.leadId || undefined,
        contactId: active.contactId || undefined,
        body: text,
        subject: active.channel === 'email' ? 'Re: your conversation with Cocoma Digital' : undefined,
      });
      setReply('');
      // Render it straight from the response so the message appears even when
      // the socket is down; the socket event dedupes on _id.
      if (msg && msg._id) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      }
    } catch (err) {
      // The backend refuses out-of-window WhatsApp with a full explanation —
      // show it rather than a generic failure.
      toast.error(errMsg(err), { duration: 8000 });
    }
    setSending(false);
  };

  const grouped = useMemo(() => {
    const out: { date: string; items: Message[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last && last.date === d) last.items.push(m);
      else out.push({ date: d, items: [m] });
    }
    return out;
  }, [messages]);

  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <div>
      <PageHeader title="Inbox" subtitle="All WhatsApp / SMS / Email conversations in one place" />

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        {[['', 'All'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email']].map(([v, label]) => (
          <button key={v} onClick={() => { setChannel(v); setActive(null); }}
            className={channel === v ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
        <input
          className="input ml-auto max-w-xs" placeholder="Search name, phone or message…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <span
          title={connected ? 'Live — replies appear instantly' : 'Reconnecting — replies are still saved, but will not appear until the connection returns'}
          className={clsx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
            connected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-amber-500 animate-pulse')} />
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversations */}
        <div className="card max-h-[70vh] overflow-y-auto">
          {loading ? <Spinner /> : threads.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">
              {search ? 'No conversations match that search.' : 'No conversations yet.'}
            </p>
          ) : threads.map((t) => (
            <button
              key={t.key}
              onClick={() => openThread(t)}
              className={clsx('block w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50',
                active?.key === t.key && 'bg-primary-50/60')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{t.name}</p>
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

        {/* Conversation */}
        <div className="card flex max-h-[70vh] flex-col lg:col-span-2">
          {!active ? (
            <p className="flex flex-1 items-center justify-center p-10 text-sm text-gray-400">Select a conversation</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{active.name}</p>
                  <div className="flex items-center gap-2">
                    {active.phone && <span className="text-[11px] text-gray-400">{active.phone}</span>}
                    {active.leadId && <Link to={`/leads/${active.leadId}`} className="text-xs text-primary-600 hover:underline">Open lead →</Link>}
                    {active.contactId && <Link to={`/contacts/${active.contactId}`} className="text-xs text-primary-600 hover:underline">Open customer →</Link>}
                  </div>
                </div>
                <Badge color={active.channel === 'whatsapp' ? 'green' : active.channel === 'sms' ? 'blue' : 'purple'}>
                  {active.channel}
                </Badge>
              </div>

              <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto p-4">
                {hasMore && (
                  <div className="pb-2 text-center">
                    <button onClick={loadOlder} disabled={loadingOlder}
                      className="text-xs text-primary-600 hover:underline disabled:opacity-50">
                      {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                    </button>
                  </div>
                )}

                {grouped.map((g) => (
                  <div key={g.date} className="space-y-2">
                    <p className="my-3 text-center text-[11px] text-gray-400">
                      {new Date(g.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {g.items.map((m) => (
                      <div key={m._id} className={clsx('max-w-[75%] rounded-xl px-3 py-2 text-sm',
                        m.direction === 'outbound' ? 'ml-auto bg-primary-600 text-white' : 'bg-gray-100 text-gray-800',
                        m.status === 'failed' && 'ring-1 ring-red-300')}>
                        {m.subject && <p className="mb-0.5 text-xs font-bold opacity-80">{m.subject}</p>}
                        <p className="whitespace-pre-wrap break-words">{m.body?.replace(/<[^>]+>/g, ' ')}</p>

                        {(m.mediaUrls || []).length > 0 && (
                          <p className={clsx('mt-1 text-[11px]', m.direction === 'outbound' ? 'text-primary-100' : 'text-gray-500')}>
                            📎 {m.mediaUrls!.length} attachment(s)
                          </p>
                        )}

                        <p className={clsx('mt-1 flex items-center gap-1 text-[10px]',
                          m.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400')}>
                          {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {m.direction === 'outbound' && <StatusTick status={m.status} />}
                          {m.status === 'queued' && m.scheduledFor && ` · held for quiet hours, sending ${fmtDate(m.scheduledFor)}`}
                        </p>

                        {m.status === 'failed' && m.failReason && (
                          <p className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">{m.failReason}</p>
                        )}
                        {m.status === 'manual' && m.waLink && (
                          <a href={m.waLink} target="_blank" rel="noreferrer"
                            className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-[11px] underline">
                            Open WhatsApp &amp; send →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {peerTyping && (
                  <p className="text-[11px] italic text-gray-400">{peerTyping} is typing…</p>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 border-t border-gray-100 p-3">
                <input
                  className="input" placeholder={`Reply via ${active.channel}…`} value={reply}
                  onChange={(e) => onReplyChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  disabled={sending}
                />
                <button className="btn-primary whitespace-nowrap" onClick={sendReply} disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
