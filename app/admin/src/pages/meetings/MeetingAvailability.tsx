import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  meetingAvailabilityApi,
  type AvailabilityConfig,
  type AvailabilityDay,
} from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import ContentLoader from '@/components/ui/ContentLoader';
import Tooltip from '@/components/ui/Tooltip';
import {
  ArrowPathIcon, CheckIcon, ClockIcon, DocumentDuplicateIcon,
  ChevronDownIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

/**
 * The booking schedule visitors see: which weekdays are open, and which
 * 15-minute slots each one offers.
 *
 * Everything on this page comes from (and goes back to) a single
 * `meeting_availability` document. The public Book-a-Call picker and the
 * reschedule form both read it through the API, so a save here changes what
 * visitors can book without a deploy — and the booking endpoint enforces the
 * same rules, so hiding a slot really does make it unbookable.
 */

// Monday-first, which is how the calendar and a working week read — the
// underlying weekday numbers stay Date#getDay (0 = Sunday).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const fmt12 = (slot: string): string => {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

/** "10:00 AM – 6:45 PM · 36 slots", or the gap-aware form when it isn't contiguous. */
const summarise = (day: AvailabilityDay, allSlots: string[]): string => {
  if (!day.enabled) return 'Closed';
  if (!day.slots.length) return 'Open, but no times selected';
  const sorted = [...day.slots].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = allSlots.filter((s) => s >= first && s <= last).length;
  const contiguous = span === sorted.length;
  const count = `${sorted.length} slot${sorted.length === 1 ? '' : 's'}`;
  if (sorted.length === allSlots.length) return `Open 24 hours · ${count}`;
  return contiguous
    ? `${fmt12(first)} – ${fmt12(last)} · ${count}`
    : `${fmt12(first)} – ${fmt12(last)} (with gaps) · ${count}`;
};

/** Deep copy so edits never mutate the last-saved snapshot we diff against. */
const cloneDays = (days: AvailabilityDay[]): AvailabilityDay[] =>
  days.map((d) => ({ ...d, slots: [...d.slots] }));

const sameDays = (a: AvailabilityDay[], b: AvailabilityDay[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// The "Apply to every day" presets aren't stored anywhere — a preset counts as
// active whenever the schedule on screen already matches what clicking it would
// produce, so it also lights up when the same state is reached day by day.
const BUSINESS_FROM = '10:00';
const BUSINESS_TO = '18:45';

const sameSlots = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((s, i) => s === sortedB[i]);
};

/** Preset pill: filled when active, tinted-flat when not. */
const presetBtn = (active: boolean, tone: 'neutral' | 'green' | 'red'): string => {
  const base = 'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors';
  const tones = {
    neutral: active
      ? 'bg-primary-600 border-primary-600 text-white shadow-sm hover:bg-primary-700'
      : 'bg-gray-100 border-transparent text-gray-700 hover:bg-gray-200',
    green: active
      ? 'bg-green-600 border-green-600 text-white shadow-sm hover:bg-green-700'
      : 'bg-green-50 border-transparent text-green-700 hover:bg-green-100',
    red: active
      ? 'bg-red-600 border-red-600 text-white shadow-sm hover:bg-red-700'
      : 'bg-red-50 border-transparent text-red-600 hover:bg-red-100',
  };
  return `${base} ${tones[tone]}`;
};

interface DayCardProps {
  day: AvailabilityDay;
  name: string;
  allSlots: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (next: AvailabilityDay) => void;
  onCopyTo: (weekday: number, targets: number[]) => void;
  weekdayNames: string[];
}

function DayCard({
  day, name, allSlots, expanded, onToggleExpand, onChange, onCopyTo, weekdayNames,
}: DayCardProps) {
  const selected = useMemo(() => new Set(day.slots), [day.slots]);
  const [rangeFrom, setRangeFrom] = useState('10:00');
  const [rangeTo, setRangeTo] = useState('18:45');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

  const setSlots = (slots: string[]) =>
    onChange({ ...day, slots: [...new Set(slots)].sort() });

  const toggleSlot = (slot: string) =>
    setSlots(selected.has(slot) ? day.slots.filter((s) => s !== slot) : [...day.slots, slot]);

  const rangeSlots = () => allSlots.filter((s) => s >= rangeFrom && s <= rangeTo);
  const applyRange = (on: boolean) => {
    if (rangeFrom > rangeTo) {
      toast.error('The "from" time must be before the "to" time.');
      return;
    }
    const inRange = new Set(rangeSlots());
    setSlots(on
      ? [...day.slots, ...inRange]
      : day.slots.filter((s) => !inRange.has(s)));
  };

  return (
    <div className={`card p-0 overflow-hidden ${day.enabled ? '' : 'bg-gray-50'}`}>
      {/* ── Header row: on/off, name, summary, expander ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Tooltip content={day.enabled ? `Disable ${name}` : `Enable ${name}`}>
          <button
            type="button"
            role="switch"
            aria-checked={day.enabled}
            aria-label={`${name} available`}
            onClick={() => onChange({ ...day, enabled: !day.enabled })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              day.enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                day.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </Tooltip>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className={`text-xs ${day.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
            {summarise(day, allSlots)}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
          aria-expanded={expanded}
        >
          {expanded ? 'Hide times' : 'Edit times'}
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Slot editor ── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          {!day.enabled && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {name} is switched off — these times are kept, but no one can book them
              until the day is enabled again.
            </p>
          )}

          {/* Bulk tools */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              aria-label={`${name} range start`}
            >
              {allSlots.map((s) => <option key={s} value={s}>{fmt12(s)}</option>)}
            </select>
            <span className="text-xs text-gray-400">to</span>
            <select
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              aria-label={`${name} range end`}
            >
              {allSlots.map((s) => <option key={s} value={s}>{fmt12(s)}</option>)}
            </select>
            <button type="button" onClick={() => applyRange(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
              Show range
            </button>
            <button type="button" onClick={() => applyRange(false)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
              Hide range
            </button>

            <span className="w-px h-5 bg-gray-200 mx-1" />

            <button type="button" onClick={() => setSlots([...allSlots])}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              All 24h
            </button>
            <button type="button" onClick={() => setSlots([])}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              Clear
            </button>

            <span className="w-px h-5 bg-gray-200 mx-1" />

            <button type="button" onClick={() => { setCopyOpen((v) => !v); setCopyTargets([]); }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1">
              <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Copy to…
            </button>
          </div>

          {copyOpen && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 space-y-2">
              <p className="text-xs text-gray-600">
                Copy {name}'s times (and its on/off state) to:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_ORDER.filter((wd) => wd !== day.weekday).map((wd) => {
                  const on = copyTargets.includes(wd);
                  return (
                    <button
                      key={wd}
                      type="button"
                      onClick={() => setCopyTargets((prev) =>
                        on ? prev.filter((x) => x !== wd) : [...prev, wd])}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {weekdayNames[wd]}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!copyTargets.length}
                  onClick={() => { onCopyTo(day.weekday, copyTargets); setCopyOpen(false); setCopyTargets([]); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                >
                  Copy
                </button>
                <button type="button" onClick={() => setCopyOpen(false)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* The 15-minute grid — one button per slot, click to show/hide */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {allSlots.map((slot) => {
              const on = selected.has(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSlot(slot)}
                  className={`text-[11px] font-semibold py-1.5 rounded-md border transition-colors ${
                    on
                      ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingAvailability() {
  const [config, setConfig] = useState<AvailabilityConfig | null>(null);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [savedDays, setSavedDays] = useState<AvailabilityDay[]>([]);
  const [minNotice, setMinNotice] = useState(0);
  const [savedMinNotice, setSavedMinNotice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    meetingAvailabilityApi.get()
      .then(({ data: res }: any) => {
        const cfg: AvailabilityConfig = res.data;
        setConfig(cfg);
        setDays(cloneDays(cfg.days));
        setSavedDays(cloneDays(cfg.days));
        setMinNotice(cfg.minNoticeMinutes ?? 0);
        setSavedMinNotice(cfg.minNoticeMinutes ?? 0);
      })
      .catch(() => toast.error('Failed to load booking availability'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = !sameDays(days, savedDays) || minNotice !== savedMinNotice;

  // Warn before a tab close drops unsaved schedule edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const updateDay = (next: AvailabilityDay) =>
    setDays((prev) => prev.map((d) => (d.weekday === next.weekday ? next : d)));

  const copyTo = (from: number, targets: number[]) => {
    setDays((prev) => {
      const source = prev.find((d) => d.weekday === from);
      if (!source) return prev;
      return prev.map((d) => (targets.includes(d.weekday)
        ? { ...d, enabled: source.enabled, slots: [...source.slots] }
        : d));
    });
    toast.success(`Copied to ${targets.length} day${targets.length === 1 ? '' : 's'}`);
  };

  const applyToAll = (patch: (day: AvailabilityDay) => AvailabilityDay) =>
    setDays((prev) => prev.map(patch));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { data: res }: any = await meetingAvailabilityApi.update({ days, minNoticeMinutes: minNotice });
      const cfg: AvailabilityConfig = res.data;
      setConfig(cfg);
      setDays(cloneDays(cfg.days));
      setSavedDays(cloneDays(cfg.days));
      setMinNotice(cfg.minNoticeMinutes ?? 0);
      setSavedMinNotice(cfg.minNoticeMinutes ?? 0);
      toast.success('Booking availability updated — visitors see it immediately');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ContentLoader />;
  if (!config) {
    return (
      <div>
        <PageHeader title="Booking Availability" breadcrumbs={[{ label: 'Contact' }, { label: 'Availability' }]} />
        <div className="card p-6 text-center text-sm text-gray-500">
          Couldn't load the schedule.{' '}
          <button onClick={load} className="text-blue-600 underline">Try again</button>
        </div>
      </div>
    );
  }

  const allSlots = config.allSlots;
  const names = config.weekdayNames;
  const openCount = days.filter((d) => d.enabled && d.slots.length).length;

  const businessSlots = allSlots.filter((s) => s >= BUSINESS_FROM && s <= BUSINESS_TO);
  const allEnabled = days.length > 0 && days.every((d) => d.enabled);
  const allDisabled = days.length > 0 && days.every((d) => !d.enabled);
  const open24Active = allEnabled && days.every((d) => sameSlots(d.slots, allSlots));
  const businessHoursActive = allEnabled && days.every((d) => sameSlots(d.slots, businessSlots));

  return (
    <div>
      <PageHeader
        title="Booking Availability"
        breadcrumbs={[{ label: 'Contact' }, { label: 'Availability' }]}
        actions={
          <>
            <button
              onClick={() => { setDays(cloneDays(savedDays)); setMinNotice(savedMinNotice); }}
              disabled={!dirty || saving}
              className="btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowPathIcon className="w-4 h-4" /> Discard
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckIcon className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {/* ── How this works ── */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 text-sm">
            <GlobeAltIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              Times below are <strong className="text-gray-900">{config.timezone}</strong> — visitors
              see them converted to their own timezone automatically.
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              {config.slotStepMinutes}-minute slots · {openCount} of 7 days open
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-gray-500 mr-1">Apply to every day:</span>
          <button type="button"
            aria-pressed={open24Active}
            onClick={() => applyToAll((d) => ({ ...d, enabled: true, slots: [...allSlots] }))}
            className={presetBtn(open24Active, 'neutral')}>
            {open24Active && <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Open 24 hours
          </button>
          <button type="button"
            aria-pressed={businessHoursActive}
            onClick={() => applyToAll((d) => ({
              ...d, enabled: true, slots: [...businessSlots],
            }))}
            className={presetBtn(businessHoursActive, 'neutral')}>
            {businessHoursActive && <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />}
            10:00 AM – 6:45 PM
          </button>

          <span className="w-px h-5 bg-gray-200 mx-1" />

          <button type="button"
            aria-pressed={allEnabled}
            onClick={() => applyToAll((d) => ({ ...d, enabled: true }))}
            className={presetBtn(allEnabled, 'green')}>
            {allEnabled && <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Enable all days
          </button>
          <button type="button"
            aria-pressed={allDisabled}
            onClick={() => applyToAll((d) => ({ ...d, enabled: false }))}
            className={presetBtn(allDisabled, 'red')}>
            {allDisabled && <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Disable all days
          </button>

          <span className="w-px h-5 bg-gray-200 mx-1" />

          <label className="text-xs text-gray-600 inline-flex items-center gap-1.5">
            Minimum notice
            <input
              type="number"
              min={0}
              value={minNotice}
              onChange={(e) => setMinNotice(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            />
            <Tooltip content="Slots starting sooner than this are hidden from visitors and rejected by the booking API. 0 means any future slot is bookable.">
              <span className="text-gray-400 cursor-help">minutes ⓘ</span>
            </Tooltip>
          </label>
        </div>

        {dirty && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            You have unsaved changes — visitors still see the previously saved schedule.
          </p>
        )}
      </div>

      {/* ── One card per weekday ── */}
      <div className="space-y-3">
        {DAY_ORDER.map((wd) => {
          const day = days.find((d) => d.weekday === wd);
          if (!day) return null;
          return (
            <DayCard
              key={wd}
              day={day}
              name={names[wd]}
              weekdayNames={names}
              allSlots={allSlots}
              expanded={expanded === wd}
              onToggleExpand={() => setExpanded((cur) => (cur === wd ? null : wd))}
              onChange={updateDay}
              onCopyTo={copyTo}
            />
          );
        })}
      </div>

      {config.updatedAt && (
        <p className="text-xs text-gray-400 mt-4">
          Last saved {new Date(config.updatedAt).toLocaleString('en-IN', { timeZone: config.timezone })}
        </p>
      )}
    </div>
  );
}
