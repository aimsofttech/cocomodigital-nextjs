import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  PhoneIcon, PhoneXMarkIcon, ArrowPathIcon, PlayIcon, PauseIcon,
  ExclamationTriangleIcon, SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import api, { get, post, errMsg } from '@/services/api';
import { Badge, Empty, Spinner, fmtDate } from '@/components/ui';

/* ── Shared types ───────────────────────────────────────────────────────── */

export interface CallConfig {
  voiceReady: boolean;
  missing: string[];
  warnings: string[];
  fromNumber: string | null;
  agentPhoneSet: boolean;
  recordingEnabled: boolean;
  automatedCallingEnabled: boolean;
  callWindow: { start: string; end: string };
}

export interface CallRecord {
  _id: string;
  status: string;
  direction: 'inbound' | 'outbound';
  mode?: 'bridge' | 'auto' | 'inbound';
  toNumber?: string;
  fromNumber?: string;
  durationSec?: number;
  recordingSid?: string;
  outcome?: string | null;
  notes?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  attemptNo?: number;
  answeredBy?: string;
  startedAt?: string;
  endedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  ownerId?: { name?: string };
  responses?: { digits?: string; speech?: string }[];
}

/** Statuses where the call is still moving — the UI keeps polling through these. */
const LIVE_STATUSES = ['queued', 'initiated', 'ringing', 'in_progress'];

export const isLive = (status: string) => LIVE_STATUSES.includes(status);

export const callStatusColor = (status: string): string => ({
  completed: 'green',
  in_progress: 'blue',
  ringing: 'blue',
  initiated: 'blue',
  queued: 'gray',
  scheduled: 'yellow',
  no_answer: 'yellow',
  busy: 'yellow',
  failed: 'red',
  cancelled: 'gray',
  missed: 'red',
}[status] || 'gray');

export const fmtDuration = (sec?: number): string => {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

/* ── Config hook ────────────────────────────────────────────────────────────
 * Every calling surface needs to know whether Twilio is actually usable before
 * it renders a button, so the answer is fetched once and shared. */

let configCache: CallConfig | null = null;
let configCachedAt = 0;
// Short TTL so fixing the Twilio setup shows up without a hard reload, but the
// lookup still costs one request per page rather than one per component.
const CONFIG_TTL_MS = 60_000;

export const useCallConfig = () => {
  const fresh = configCache && Date.now() - configCachedAt < CONFIG_TTL_MS;
  const [config, setConfig] = useState<CallConfig | null>(fresh ? configCache : null);

  useEffect(() => {
    if (configCache && Date.now() - configCachedAt < CONFIG_TTL_MS) {
      setConfig(configCache);
      return;
    }
    get<CallConfig>('/crm/api/calls/config')
      .then((r) => { configCache = r.data; configCachedAt = Date.now(); setConfig(r.data); })
      .catch(() => {
        // A failed config lookup must not disable calling entirely — fall back
        // to the manual tel: path, which always works.
        const fallback: CallConfig = {
          voiceReady: false, missing: [], warnings: [], fromNumber: null,
          agentPhoneSet: false, recordingEnabled: false,
          automatedCallingEnabled: false, callWindow: { start: '', end: '' },
        };
        configCache = fallback;
        configCachedAt = Date.now();
        setConfig(fallback);
      });
  }, []);

  return config;
};

/* ── Recording player ───────────────────────────────────────────────────────
 * The recording endpoint needs the CRM bearer token, which an <audio src="…">
 * cannot send. Fetching it as a blob and playing an object URL keeps the audio
 * behind the normal permission check instead of exposing a public media URL. */

export const RecordingPlayer = ({ callId }: { callId: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Object URLs leak the underlying blob until explicitly revoked.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    if (url) { toggle(); return; }
    setLoading(true);
    try {
      const res = await api.get(`/crm/api/calls/${callId}/recording`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(res.data);
      setUrl(objectUrl);
      setTimeout(() => { audioRef.current?.play(); setPlaying(true); }, 50);
    } catch (err) {
      toast.error('Recording is not available yet — Twilio delivers it a few seconds after the call ends.');
    }
    setLoading(false);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
        title="Play call recording"
      >
        {loading ? <Spinner className="h-3 w-3" />
          : playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        {url ? (playing ? 'Pause' : 'Play') : 'Recording'}
      </button>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          controls
          className="h-8 max-w-[220px] align-middle"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      )}
    </span>
  );
};

/* ── Call button ────────────────────────────────────────────────────────────
 * One button that adapts to what is actually configured:
 *   Twilio ready  → click-to-call (our phone rings, then theirs)
 *   not ready     → a tel: link, which is the honest fallback
 * While a Twilio call is live it polls status so the agent sees ringing →
 * in progress → completed without refreshing. */

interface CallButtonProps {
  leadId?: string;
  contactId?: string;
  phone?: string;
  /** Existing scheduled call to dial, instead of starting a fresh one. */
  callId?: string;
  className?: string;
  label?: string;
  onFinished?: () => void;
}

export const CallButton = ({
  leadId, contactId, phone, callId, className, label, onFinished,
}: CallButtonProps) => {
  const config = useCallConfig();
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<CallRecord | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  /** Follow one call to a terminal state, then hand control back to the page. */
  const poll = useCallback((id: string) => {
    stopPolling();
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks += 1;
      try {
        const res = await get<CallRecord>(`/crm/api/calls/${id}`);
        setLive(res.data);
        if (!isLive(res.data.status)) {
          stopPolling();
          setLive(null);
          if (res.data.status === 'completed') {
            toast.success(`Call completed — ${fmtDuration(res.data.durationSec)}`);
          } else {
            toast.error(`Call ${res.data.status.replace('_', ' ')}${res.data.errorMessage ? `: ${res.data.errorMessage}` : ''}`);
          }
          onFinished?.();
        }
      } catch { /* a transient poll failure is not worth surfacing */ }
      // Stop after ~10 minutes; the reconcile worker settles anything longer.
      if (ticks > 200) { stopPolling(); setLive(null); onFinished?.(); }
    }, 3000);
  }, [onFinished, stopPolling]);

  const startCall = async () => {
    setBusy(true);
    try {
      const res: any = callId
        ? await post(`/crm/api/calls/${callId}/dial`)
        : await post('/crm/api/calls/start', { leadId, contactId, mode: 'bridge' });

      if (res.mode === 'manual' && res.telLink) {
        window.location.href = res.telLink;
        onFinished?.();
      } else {
        toast.success('Answer your phone — we are connecting you now.');
        setLive({ _id: res.callId, status: res.status || 'queued' } as CallRecord);
        poll(res.callId);
      }
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  const hangup = async () => {
    if (!live) return;
    try {
      await post(`/crm/api/calls/${live._id}/hangup`);
      toast('Ending call…');
    } catch (err) { toast.error(errMsg(err)); }
  };

  if (live) {
    return (
      <button
        type="button"
        onClick={hangup}
        className={clsx('btn-secondary justify-center !border-red-200 !bg-red-50 !text-red-600', className)}
      >
        <PhoneXMarkIcon className="h-4 w-4 animate-pulse" />
        {live.status === 'ringing' ? 'Ringing…' : live.status === 'in_progress' ? 'In call — hang up' : 'Connecting…'}
      </button>
    );
  }

  // Twilio is live but this agent has no phone on file: the call would fail at
  // Twilio with a confusing error, so say so up front.
  if (config?.voiceReady && !config.agentPhoneSet) {
    return (
      <a
        href={phone ? `tel:${phone}` : undefined}
        className={clsx('btn-secondary justify-center', className)}
        title="Add your phone number in Settings → Profile to enable click-to-call"
      >
        <PhoneIcon className="h-4 w-4" />
        {label || 'Call'} (add your number for click-to-call)
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={startCall}
      disabled={busy || (!leadId && !contactId && !callId)}
      className={clsx('btn-secondary justify-center', className)}
      title={config?.voiceReady
        ? `Click-to-call: your phone rings first, then ${phone || 'the lead'}`
        : 'Opens your phone dialler'}
    >
      <PhoneIcon className="h-4 w-4" />
      {busy ? 'Calling…' : (label || (config?.voiceReady ? 'Call via Twilio' : `Call ${phone || ''}`))}
    </button>
  );
};

/* ── Call history ───────────────────────────────────────────────────────────
 * Every attempt against one lead/contact, newest first, including the failures.
 * Showing only successful calls is what makes a CRM lie about how hard someone
 * has been chased. */

export const CallHistory = ({
  leadId, contactId, limit = 20, onChanged,
}: { leadId?: string; contactId?: string; limit?: number; onChanged?: () => void }) => {
  const [items, setItems] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leadId && !contactId) return;
    setLoading(true);
    try {
      const res = await get<CallRecord[]>('/crm/api/calls/history', { leadId, contactId, limit });
      setItems(res.data);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [leadId, contactId, limit]);

  useEffect(() => { load(); }, [load]);

  const retry = async (call: CallRecord, now: boolean) => {
    setRetrying(call._id);
    try {
      await post(`/crm/api/calls/${call._id}/retry`, { now });
      toast.success(now ? 'Retrying now' : 'Retry scheduled');
      load(); onChanged?.();
    } catch (err) { toast.error(errMsg(err)); }
    setRetrying(null);
  };

  if (loading) return <Spinner />;
  if (!items.length) return <Empty message="No calls yet." />;

  return (
    <div className="divide-y divide-gray-50">
      {items.map((c) => (
        <div key={c._id} className="py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={callStatusColor(c.status)}>{c.status.replace('_', ' ')}</Badge>
            <span className="text-gray-500">
              {c.direction === 'inbound' ? '↙ inbound' : '↗ outbound'}
              {c.mode === 'auto' && ' · automated'}
            </span>
            {(c.attemptNo || 1) > 1 && <span className="text-gray-400">attempt #{c.attemptNo}</span>}
            <span className="text-gray-400">{fmtDate(c.startedAt || c.scheduledAt || c.createdAt)}</span>
            {c.durationSec ? <span className="font-medium text-gray-600">{fmtDuration(c.durationSec)}</span> : null}
            {c.answeredBy?.startsWith('machine') && (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <SpeakerWaveIcon className="h-3 w-3" />voicemail
              </span>
            )}
            {c.recordingSid && <RecordingPlayer callId={c._id} />}
            {['no_answer', 'busy', 'failed', 'missed'].includes(c.status) && (
              <span className="ml-auto space-x-2">
                <button
                  className="text-primary-600 hover:underline disabled:opacity-50"
                  disabled={retrying === c._id}
                  onClick={() => retry(c, true)}
                >
                  <ArrowPathIcon className="inline h-3 w-3" /> Retry now
                </button>
                <button
                  className="text-gray-500 hover:underline disabled:opacity-50"
                  disabled={retrying === c._id}
                  onClick={() => retry(c, false)}
                >
                  Retry later
                </button>
              </span>
            )}
          </div>
          {c.outcome && <p className="mt-1 text-gray-600">Outcome: {c.outcome.replace('_', ' ')}</p>}
          {!!c.responses?.length && (
            <p className="mt-1 text-gray-600">
              Pressed: {c.responses.map((r) => r.digits).filter(Boolean).join(', ') || '—'}
            </p>
          )}
          {c.errorMessage && (
            <p className="mt-1 flex items-start gap-1 text-red-500">
              <ExclamationTriangleIcon className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{c.errorMessage}{c.errorCode ? ` (Twilio ${c.errorCode})` : ''}</span>
            </p>
          )}
          {c.notes && <p className="mt-1 text-gray-500">{c.notes}</p>}
        </div>
      ))}
    </div>
  );
};

/* ── Setup banner ───────────────────────────────────────────────────────────
 * Shown to admins when Twilio is half-configured, so the cause is visible in
 * the product rather than only in the server log. */

export const VoiceSetupBanner = () => {
  const config = useCallConfig();
  if (!config) return null;
  if (config.voiceReady && !config.warnings.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p className="flex items-center gap-1 font-semibold">
        <ExclamationTriangleIcon className="h-4 w-4" />
        {config.voiceReady ? 'Twilio Voice warnings' : 'Twilio Voice is not fully configured'}
      </p>
      {!config.voiceReady && !!config.missing.length && (
        <p className="mt-1">
          Missing: <code>{config.missing.join(', ')}</code>. Calls fall back to opening your phone dialler.
        </p>
      )}
      {config.warnings.map((w) => <p key={w} className="mt-1">{w}</p>)}
    </div>
  );
};
