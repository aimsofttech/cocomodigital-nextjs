import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { get, post } from '@/services/api';
import {
  CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon,
  ArrowPathIcon, PhoneIcon, CheckCircleIcon, ClockIcon, VideoCameraIcon,
} from '@heroicons/react/24/outline';

type ViewName = 'day' | 'week' | 'month' | 'agenda';
type EventType = 'meeting' | 'call' | 'task' | 'followup';

interface CalEvent {
  id: string;
  sourceId: string;
  type: EventType;
  title: string;
  start: string;
  end: string;
  status?: string;
  entity?: { kind: string; id: string } | null;
  meta?: Record<string, any>;
}

interface CalPayload {
  range: { from: string; to: string; anchor: string; view: ViewName; timezone: string };
  counts: Record<EventType, number>;
  total: number;
  events: CalEvent[];
  byDay: Record<string, CalEvent[]>;
}

const VIEWS: ViewName[] = ['day', 'week', 'month', 'agenda'];

const TYPE_META: Record<EventType, { label: string; cls: string; Icon: any }> = {
  meeting: { label: 'Meetings', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200', Icon: VideoCameraIcon },
  call: { label: 'Calls', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', Icon: PhoneIcon },
  task: { label: 'Tasks', cls: 'bg-amber-100 text-amber-800 border-amber-200', Icon: CheckCircleIcon },
  followup: { label: 'Follow-ups', cls: 'bg-sky-100 text-sky-800 border-sky-200', Icon: ClockIcon },
};

/* ── plain calendar-date helpers (no timezone maths — the API owns that) ── */

const todayYmd = () => new Intl.DateTimeFormat('en-CA').format(new Date());

const shiftYmd = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

const shiftMonth = (ymd: string, months: number) => {
  const [y, m] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return dt.toISOString().slice(0, 10);
};

/** Render an instant as a time string in the calendar's own timezone. */
const timeIn = (iso: string, tz: string) =>
  new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });

const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  });
};

const headingFor = (view: ViewName, anchor: string) => {
  const [y, m, d] = anchor.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  if (view === 'month') return at.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  if (view === 'agenda') return 'Next 30 days';
  return at.toLocaleDateString('en-US', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function CalendarPage() {
  const [view, setView] = useState<ViewName>('month');
  const [anchor, setAnchor] = useState<string>(todayYmd());
  const [types, setTypes] = useState<EventType[]>(['meeting', 'call', 'task', 'followup']);
  const [mineOnly, setMineOnly] = useState(false);
  const [data, setData] = useState<CalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { view, date: anchor };
      if (types.length && types.length < 4) params.types = types.join(',');
      if (mineOnly) params.ownerId = 'me';
      const res = await get<CalPayload>('/crm/api/calendar', params);
      setData(res.data);
    } catch {
      toast.error('Could not load the calendar.');
    } finally {
      setLoading(false);
    }
  }, [view, anchor, types, mineOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    get('/crm/api/calendar/sync/status').then((r) => setSync(r.data)).catch(() => setSync(null));
  }, []);

  const step = (dir: 1 | -1) => {
    if (view === 'month') setAnchor(shiftMonth(anchor, dir));
    else if (view === 'week') setAnchor(shiftYmd(anchor, 7 * dir));
    else if (view === 'day') setAnchor(shiftYmd(anchor, dir));
  };

  const toggleType = (t: EventType) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const syncGoogle = async () => {
    setSyncing(true);
    try {
      const res: any = await post('/crm/api/calendar/sync/google', { view, date: anchor });
      const d = res.data ?? res;
      toast.success(`Synced ${d.synced ?? 0} call(s) to Google${d.failed ? `, ${d.failed} failed` : ''}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Google sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const tz = data?.range.timezone || 'Asia/Kolkata';

  /** Month grid: 6 weeks starting Monday, covering the anchor month. */
  const monthCells = useMemo(() => {
    if (view !== 'month') return [];
    const first = `${anchor.slice(0, 8)}01`;
    const [y, m, d] = first.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const start = shiftYmd(first, -((dow + 6) % 7));            // back to Monday
    return Array.from({ length: 42 }, (_, i) => shiftYmd(start, i));
  }, [view, anchor]);

  const weekCells = useMemo(() => {
    if (view !== 'week' || !data) return [];
    const from = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(data.range.from));
    return Array.from({ length: 7 }, (_, i) => shiftYmd(from, i));
  }, [view, data, tz]);

  const Pill = ({ e }: { e: CalEvent }) => {
    const meta = TYPE_META[e.type];
    return (
      <div className={`truncate rounded border px-1.5 py-0.5 text-[11px] leading-tight ${meta.cls}`} title={`${timeIn(e.start, tz)} · ${e.title}`}>
        {timeIn(e.start, tz)} {e.title}
      </div>
    );
  };

  const DayCell = ({ ymd, muted }: { ymd: string; muted?: boolean }) => {
    const evts = data?.byDay[ymd] || [];
    const isToday = ymd === todayYmd();
    return (
      <div className={`min-h-[92px] border p-1 ${muted ? 'bg-gray-50' : 'bg-white'} ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
        <div className={`mb-1 text-xs font-semibold ${muted ? 'text-gray-400' : 'text-gray-700'}`}>
          {Number(ymd.slice(8, 10))}
        </div>
        <div className="space-y-1">
          {evts.slice(0, 4).map((e) => <Pill key={e.id} e={e} />)}
          {evts.length > 4 && <div className="text-[11px] text-gray-500">+{evts.length - 4} more</div>}
        </div>
      </div>
    );
  };

  const AgendaList = () => {
    const days = Object.keys(data?.byDay || {}).sort();
    if (!days.length) return <div className="p-8 text-center text-sm text-gray-500">Nothing scheduled in this period.</div>;
    return (
      <div className="divide-y">
        {days.map((d) => (
          <div key={d} className="p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{dayLabel(d)}</div>
            <div className="space-y-1.5">
              {data!.byDay[d].map((e) => {
                const meta = TYPE_META[e.type];
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded border bg-white px-3 py-2">
                    <meta.Icon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 text-xs text-gray-600">{timeIn(e.start, tz)}</span>
                    <span className="flex-1 truncate text-sm">{e.title}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[11px] ${meta.cls}`}>{e.type}</span>
                    {e.status && <span className="text-[11px] text-gray-500">{e.status}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <CalendarDaysIcon className="h-6 w-6" /> Calendar
        </h1>
        <div className="flex items-center gap-2">
          {sync?.google?.configured && (
            <button className="btn-secondary flex items-center gap-1.5 text-sm" onClick={syncGoogle} disabled={syncing}>
              <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync to Google'}
            </button>
          )}
          <button className="btn-secondary text-sm" onClick={() => setAnchor(todayYmd())}>Today</button>
        </div>
      </div>

      {/* view switch + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div className="flex items-center gap-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1.5 text-sm capitalize ${view === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {view !== 'agenda' && (
            <>
              <button className="rounded p-1 hover:bg-gray-100" onClick={() => step(-1)} aria-label="Previous">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="min-w-[170px] text-center text-sm font-semibold">{headingFor(view, anchor)}</span>
              <button className="rounded p-1 hover:bg-gray-100" onClick={() => step(1)} aria-label="Next">
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}
          {view === 'agenda' && <span className="text-sm font-semibold">{headingFor(view, anchor)}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TYPE_META) as EventType[]).map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`rounded border px-2 py-1 text-xs ${types.includes(t) ? TYPE_META[t].cls : 'border-gray-200 bg-white text-gray-400'}`}
            >
              {TYPE_META[t].label}
              {data ? ` (${data.counts[t] ?? 0})` : ''}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Only mine
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {loading && <div className="p-8 text-center text-sm text-gray-500">Loading calendar…</div>}

        {!loading && data && view === 'month' && (
          <div>
            <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-semibold text-gray-600">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((ymd) => (
                <DayCell key={ymd} ymd={ymd} muted={ymd.slice(0, 7) !== anchor.slice(0, 7)} />
              ))}
            </div>
          </div>
        )}

        {!loading && data && view === 'week' && (
          <div className="grid grid-cols-7">
            {weekCells.map((ymd) => (
              <div key={ymd}>
                <div className="border-b bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600">{dayLabel(ymd)}</div>
                <DayCell ymd={ymd} />
              </div>
            ))}
          </div>
        )}

        {!loading && data && view === 'day' && (
          <div className="p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{dayLabel(anchor)}</div>
            {(data.byDay[anchor] || []).length === 0
              ? <div className="p-8 text-center text-sm text-gray-500">Nothing scheduled on this day.</div>
              : <AgendaList />}
          </div>
        )}

        {!loading && data && view === 'agenda' && <AgendaList />}
      </div>

      {data && (
        <p className="text-xs text-gray-500">
          Showing {data.total} event(s) · times in {data.range.timezone}
          {sync && !sync.google.configured && ' · Google sync not configured'}
          {sync && !sync.outlook.configured && ' · Outlook sync not configured'}
        </p>
      )}
    </div>
  );
}
