import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import { meetingApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import TableFilter, {
  FilterField, FilterValues, isEmptyValue,
} from '@/components/ui/TableFilter';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Tooltip from '@/components/ui/Tooltip';
import {
  EyeIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon,
  CalendarDaysIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, UserPlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// 10:00–18:45 in 15-minute steps — mirrors the public booking page's slot grid.
const RESCHEDULE_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 10; h < 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

// A meeting whose scheduled slot has already passed without being resolved.
function isExpired(row: any): boolean {
  if (row.meeting_start_utc) {
    const t = new Date(row.meeting_start_utc).getTime();
    if (!Number.isNaN(t)) return t < Date.now();
  }
  if (!row.meetingDate) return false;
  const t = new Date(`${row.meetingDate}T${(row.meetingTime || '00:00').slice(0, 5)}`).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Local YYYY-MM-DD (not toISOString, which would shift the date across UTC midnight).
function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// "14:30" -> "2:30 PM" when hour12, otherwise passed through unchanged.
function formatSlotLabel(slot24: string, hour12: boolean): string {
  if (!hour12) return slot24;
  const [h, m] = slot24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
    {status}
  </span>
);

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'status', label: 'Status', type: 'select', serverSide: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'completed', label: 'Completed' },
    ],
  },
  { key: 'createdAt', label: 'Date Range', type: 'date-range', serverSide: false },
];

function getSessionKey(p: string) { return `crud_filter_${p.replace(/\//g, '_')}`; }

export default function MeetingList() {
  const { pathname } = useLocation();
  const sk = getSessionKey(pathname);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => { try { return parseInt(sessionStorage.getItem(sk + '_ps') || '20'); } catch { return 20; } });
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(() => { try { return JSON.parse(sessionStorage.getItem(sk) || '{}'); } catch { return {}; } });

  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation modals
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleHour12, setRescheduleHour12] = useState(true);
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Assign-to-team-member modal
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [assigneeList, setAssigneeList] = useState<any[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<any>(null);

  const [stats, setStats] = useState<Record<string, number>>({});

  const serverFilters: Record<string, any> = {};
  FILTER_FIELDS.filter((f) => f.serverSide && !isEmptyValue(filterValues[f.key])).forEach((f) => {
    serverFilters[f.apiParam || f.key] = filterValues[f.key];
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    meetingApi.getAll({ page, limit, search, ...serverFilters })
      .then(({ data: res }: any) => { setData(res.data || []); setPagination(res.pagination); })
      .finally(() => setLoading(false));
  }, [page, limit, search, JSON.stringify(serverFilters)]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    meetingApi.getStats().then(({ data: res }: any) => setStats(res.data || {})).catch(() => {});
  }, [data]);

  const handleFilterChange = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    setPage(1);
    try { sessionStorage.setItem(sk, JSON.stringify(next)); } catch { /* noop */ }
  };
  const handleFilterReset = () => {
    setFilterValues({});
    setPage(1);
    try { sessionStorage.removeItem(sk); } catch { /* noop */ }
  };
  const handlePageSizeChange = (s: number) => { setLimit(s); setPage(1); try { sessionStorage.setItem(sk + '_ps', String(s)); } catch { /* noop */ } };

  const activeCount = FILTER_FIELDS.filter((f) => !isEmptyValue(filterValues[f.key])).length;

  // Called after the user clicks "Confirm" inside the confirm modal
  const executeConfirm = async () => {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      await meetingApi.confirm(confirmTarget._id);
      toast.success('Meeting confirmed and emails sent');
      setConfirmTarget(null);
      if (selected?._id === confirmTarget._id) setSelected(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to confirm meeting');
    } finally {
      setActionLoading(false);
    }
  };

  // Called after the user clicks "Reject" inside the reject modal
  const executeReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await meetingApi.reject(rejectTarget._id);
      toast.success('Meeting rejected and user notified');
      setRejectTarget(null);
      if (selected?._id === rejectTarget._id) setSelected(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reject meeting');
    } finally {
      setActionLoading(false);
    }
  };

  const openReschedule = (row: any) => {
    setRescheduleTarget(row);
    setRescheduleDate(new Date());
    setRescheduleTime('');
  };
  const closeReschedule = () => {
    if (actionLoading) return;
    setRescheduleTarget(null);
    setRescheduleDate(new Date());
    setRescheduleTime('');
    setBookedTimes(new Set());
  };

  // Called after the user picks a new date/time and clicks "Reschedule & Notify"
  const executeReschedule = async () => {
    if (!rescheduleTarget || !rescheduleTime) return;
    setActionLoading(true);
    try {
      await meetingApi.reschedule(rescheduleTarget._id, { meetingDate: dateToYMD(rescheduleDate), meetingTime: rescheduleTime });
      toast.success('Meeting rescheduled and emails sent');
      if (selected?._id === rescheduleTarget._id) setSelected(null);
      closeReschedule();
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reschedule meeting');
    } finally {
      setActionLoading(false);
    }
  };

  // Owner delegates the meeting to a team member — opens the picker with the
  // admin users list (name + email) and preselects the current assignee.
  const openAssign = (row: any) => {
    setAssignTarget(row);
    setSelectedAssignee(row.assignedTo?.email ? row.assignedTo : null);
    setAssigneesLoading(true);
    meetingApi.getAssignees()
      .then(({ data: res }: any) => setAssigneeList(res.data || []))
      .catch(() => toast.error('Failed to load team members'))
      .finally(() => setAssigneesLoading(false));
  };
  const closeAssign = () => {
    if (actionLoading) return;
    setAssignTarget(null);
    setSelectedAssignee(null);
  };

  // Called after the owner picks a team member and clicks "Assign & Notify"
  const executeAssign = async () => {
    // actionLoading guard: a double-click must not fire two assignments
    // (each assignment sends its own emails to the assignee and the owner).
    if (!assignTarget || !selectedAssignee || actionLoading) return;
    setActionLoading(true);
    try {
      await meetingApi.assign(assignTarget._id, { name: selectedAssignee.name, email: selectedAssignee.email });
      toast.success('Meeting assigned and emails sent');
      if (selected?._id === assignTarget._id) setSelected(null);
      closeAssign();
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to assign meeting');
    } finally {
      setActionLoading(false);
    }
  };

  // Hide already-passed slots when the selected day is today (soft UX guard —
  // the backend still re-validates against the meeting's actual timezone).
  const visibleRescheduleSlots = useMemo(() => {
    const now = new Date();
    if (!isSameLocalDay(rescheduleDate, now)) return RESCHEDULE_SLOTS;
    return RESCHEDULE_SLOTS.filter((slot) => {
      const [h, m] = slot.split(':').map(Number);
      const slotDate = new Date(rescheduleDate);
      slotDate.setHours(h, m, 0, 0);
      return slotDate.getTime() > now.getTime();
    });
  }, [rescheduleDate]);

  // Default the time picker to the meeting's own original time-of-day whenever
  // the target meeting or the picked date changes — admins usually keep the
  // same time and just move the day. Falls back to no selection if that slot
  // isn't valid (e.g. already past) for the newly-picked date.
  useEffect(() => {
    if (!rescheduleTarget) return;
    const originalTime = (rescheduleTarget.meetingTime || '').slice(0, 5);
    setRescheduleTime(originalTime && visibleRescheduleSlots.includes(originalTime) ? originalTime : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleDate, rescheduleTarget]);

  // Fetch which slots on the picked date are already booked/confirmed by
  // ANOTHER meeting, so they can be disabled in the grid below.
  useEffect(() => {
    if (!rescheduleTarget) { setBookedTimes(new Set()); return; }
    let cancelled = false;
    setAvailabilityLoading(true);
    meetingApi
      .checkAvailability({
        date: dateToYMD(rescheduleDate),
        timezone: rescheduleTarget.meetingTimezone || undefined,
        excludeId: rescheduleTarget._id,
      })
      .then(({ data }: any) => { if (!cancelled) setBookedTimes(new Set(data?.booked || [])); })
      .catch(() => { if (!cancelled) setBookedTimes(new Set()); })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [rescheduleTarget, rescheduleDate]);

  // If the currently-selected slot turns out to already be booked (race with
  // another booking, or it was auto-selected before availability loaded), drop it.
  useEffect(() => {
    if (rescheduleTime && bookedTimes.has(rescheduleTime)) setRescheduleTime('');
  }, [bookedTimes, rescheduleTime]);

  // Deep link from the meeting emails:
  //   /contact/meetings?open=<id>&action=confirm|reject|reschedule|assign
  // Every email button opens this meeting's Details modal, where all four
  // action buttons are available (with their usual guards/tooltips).
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    const id = searchParams.get('open');
    if (!id || deepLinkHandled.current) return;
    deepLinkHandled.current = true; // StrictMode runs effects twice — fetch once
    meetingApi
      .getOne(id)
      .then(({ data: res }: any) => {
        // Only clear the query once handled, so an auth round-trip (401 →
        // login → back) still carries the deep link and re-triggers this.
        setSearchParams({}, { replace: true });
        const row = res?.data;
        if (!row) { toast.error('Meeting not found'); return; }
        setSelected(row);
      })
      .catch((e: any) => {
        // 401: the axios interceptor redirects to login preserving this URL —
        // keep the params so the modal opens after re-authentication.
        if (e?.response?.status === 401) { deepLinkHandled.current = false; return; }
        setSearchParams({}, { replace: true });
        toast.error('Meeting not found');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await meetingApi.delete(deleteId);
      toast.success('Deleted');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'userName', label: 'Name', sortable: true,
      render: (row: any) => <span className="font-medium text-gray-900">{row.userName || 'N/A'}</span>,
    },
    { key: 'email', label: 'Email', sortable: true, render: (row: any) => row.email || 'N/A' },
    { key: 'phone', label: 'Phone', render: (row: any) => row.phone || 'N/A' },
    {
      key: 'meetingDate', label: 'Meeting Date', sortable: true,
      render: (row: any) => row.meetingDate
        ? <span className="whitespace-nowrap">{row.meetingDate}{row.meetingTime ? ` · ${row.meetingTime}` : ''}</span>
        : 'N/A',
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt', label: 'Submitted', sortable: true,
      render: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Meeting Requests"
        breadcrumbs={[{ label: 'Contact' }, { label: 'Meetings' }]}
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Pending', key: 'pending', color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Confirmed', key: 'confirmed', color: 'text-green-600 bg-green-50' },
          { label: 'Rejected', key: 'rejected', color: 'text-red-600 bg-red-50' },
          { label: 'Completed', key: 'completed', color: 'text-blue-600 bg-blue-50' },
        ].map(({ label, key, color }) => (
          <div key={key} className={`card p-4 flex items-center gap-3 ${color}`}>
            <span className="text-2xl font-bold">{stats[key] ?? 'N/A'}</span>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>

      <TableFilter
        fields={FILTER_FIELDS}
        values={filterValues}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        activeCount={activeCount}
        loading={loading}
      />

      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onSearch={setSearch}
          pageSize={limit}
          onPageSizeChange={handlePageSizeChange}
          actions={(row: any) => (
            <div className="flex gap-1 justify-start">
              <Tooltip content="View details">
                <button
                  onClick={() => setSelected(row)}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          )}
          deleteAction={(row: any) => (
            <Tooltip content="Delete">
              <button
                onClick={() => setDeleteId(row._id)}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        />
      </div>

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Meeting Details" size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.userName || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p>{selected.phone || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Company</p><p>{selected.companyName || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Meeting Date</p><p>{selected.meetingDate || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Meeting Time</p><p>{selected.meetingTime || 'N/A'}{selected.meetingTimezone ? ` (${selected.meetingTimezone})` : ''}</p></div>
              <div><p className="text-xs text-gray-500">Duration</p><p>{selected.duration || 15} minutes</p></div>
              <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={selected.status} /></div>
              <div><p className="text-xs text-gray-500">Submitted</p><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : 'N/A'}</p></div>
              {selected.confirmedAt && <div><p className="text-xs text-gray-500">Confirmed At</p><p>{new Date(selected.confirmedAt).toLocaleString()}</p></div>}
              {selected.rejectedAt && <div><p className="text-xs text-gray-500">Rejected At</p><p>{new Date(selected.rejectedAt).toLocaleString()}</p></div>}
              {selected.assignedTo?.name && (
                <div>
                  <p className="text-xs text-gray-500">Assigned To</p>
                  <p>{selected.assignedTo.name}{selected.assignedTo.email ? ` (${selected.assignedTo.email})` : ''}</p>
                </div>
              )}
            </div>
            {selected.notes && (
              <div><p className="text-xs text-gray-500 mb-1">Notes / Message</p><p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selected.notes}</p></div>
            )}
            {selected.meetLink && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Google Meet Link</p>
                <Link to={selected.meetLink} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 underline break-all">{selected.meetLink}</Link>
              </div>
            )}
            <div className="flex gap-3 pt-2 border-t flex-wrap">
              <button
                onClick={() => { setSelected(null); setConfirmTarget(selected); }}
                disabled={selected.status !== 'pending' || isExpired(selected)}
                title={
                  selected.status !== 'pending'
                    ? `This meeting has already been ${selected.status}`
                    : isExpired(selected)
                    ? 'This meeting slot has already passed — reschedule it instead'
                    : undefined
                }
                className="btn-primary flex-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Meeting
              </button>
              <button
                onClick={() => { setSelected(null); setRejectTarget(selected); }}
                disabled={selected.status !== 'pending' || isExpired(selected)}
                title={
                  selected.status !== 'pending'
                    ? `This meeting has already been ${selected.status}`
                    : isExpired(selected)
                    ? 'This meeting slot has already passed — reschedule it instead'
                    : undefined
                }
                className="btn bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 flex-1 whitespace-nowrap"
              >
                Reject Meeting
              </button>
              <button
                onClick={() => { setSelected(null); openReschedule(selected); }}
                className="btn bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 flex-1 whitespace-nowrap"
              >
                Reschedule Meeting
              </button>
              <button
                onClick={() => { setSelected(null); openAssign(selected); }}
                className="btn bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 flex-1 whitespace-nowrap"
              >
                Assign Meeting
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirm meeting modal ────────────────────────────────────────────── */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Meeting" size="sm">
        {confirmTarget && (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-7 h-7 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Confirm this meeting?</p>
              <p className="text-sm text-gray-500">
                A Google Meet link will be generated and confirmation emails will be sent to both
                <span className="font-medium text-gray-700"> {confirmTarget.userName}</span> and the owner.
              </p>
            </div>
            {/* Meeting summary */}
            <div className="w-full rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100 text-left text-sm">
              <div className="flex items-center gap-2 px-3 py-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-600 truncate">{confirmTarget.email}</span>
              </div>
              {confirmTarget.phone && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">{confirmTarget.phone}</span>
                </div>
              )}
              {(confirmTarget.meetingDate || confirmTarget.meetingTime) && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">
                    {confirmTarget.meetingDate}{confirmTarget.meetingTime ? ` · ${confirmTarget.meetingTime}` : ''}
                    {confirmTarget.meetingTimezone ? ` (${confirmTarget.meetingTimezone})` : ''}
                  </span>
                </div>
              )}
              {confirmTarget.companyName && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">{confirmTarget.companyName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmTarget(null)}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Confirming…' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reject meeting modal ─────────────────────────────────────────────── */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Meeting" size="sm">
        {rejectTarget && (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
              <XCircleIcon className="w-7 h-7 text-orange-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Reject this meeting?</p>
              <p className="text-sm text-gray-500">
                A rejection email will be sent to
                <span className="font-medium text-gray-700"> {rejectTarget.userName}</span> notifying
                them that their request could not be approved.
              </p>
            </div>
            {/* Meeting summary */}
            <div className="w-full rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100 text-left text-sm">
              <div className="flex items-center gap-2 px-3 py-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-600 truncate">{rejectTarget.email}</span>
              </div>
              {(rejectTarget.meetingDate || rejectTarget.meetingTime) && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">
                    {rejectTarget.meetingDate}{rejectTarget.meetingTime ? ` · ${rejectTarget.meetingTime}` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setRejectTarget(null)}
                className="btn-secondary flex-1"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeReject}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Rejecting…' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reschedule meeting modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!rescheduleTarget} onClose={closeReschedule} title="Reschedule Meeting" size="xl">
        {rescheduleTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <ArrowPathIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{rescheduleTarget.userName}</p>
                <p className="text-sm text-gray-500">
                  Previously: {rescheduleTarget.meetingDate}{rescheduleTarget.meetingTime ? ` · ${rescheduleTarget.meetingTime}` : ''}
                  {rescheduleTarget.meetingTimezone ? ` (${rescheduleTarget.meetingTimezone})` : ''} — expired
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Left: calendar */}
              <div className="reschedule-calendar border border-gray-200 rounded-xl p-3">
                <Calendar
                  onChange={(d) => setRescheduleDate(d as Date)}
                  value={rescheduleDate}
                  minDate={new Date()}
                  prev2Label={null}
                  next2Label={null}
                />
              </div>

              {/* Right: date header + time-slot grid */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{formatLongDate(rescheduleDate)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rescheduleTarget.meetingTimezone || 'Local time'} · 15 min · Google Meet
                    </p>
                  </div>
                  <div className="inline-flex bg-gray-100 border border-gray-200 rounded-full p-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setRescheduleHour12(true)}
                      className={`text-xs font-bold rounded-full px-2.5 py-1 transition-colors ${rescheduleHour12 ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                    >
                      12h
                    </button>
                    <button
                      type="button"
                      onClick={() => setRescheduleHour12(false)}
                      className={`text-xs font-bold rounded-full px-2.5 py-1 transition-colors ${!rescheduleHour12 ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                    >
                      24h
                    </button>
                  </div>
                </div>

                {availabilityLoading && (
                  <p className="text-xs text-gray-400 mb-1.5" aria-live="polite">Checking availability…</p>
                )}

                {visibleRescheduleSlots.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No more slots today — pick another date.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-64 pr-1">
                    {visibleRescheduleSlots.map((slot) => {
                      const booked = bookedTimes.has(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={booked}
                          title={booked ? 'Already booked' : undefined}
                          onClick={() => !booked && setRescheduleTime(slot)}
                          className={`text-sm font-semibold px-2 py-2 rounded-lg border transition-colors ${
                            booked
                              ? 'border-gray-200 text-gray-300 bg-gray-50 line-through cursor-not-allowed'
                              : rescheduleTime === slot
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'border-gray-200 hover:border-purple-400 text-gray-700'
                          }`}
                        >
                          {formatSlotLabel(slot, rescheduleHour12)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              A new Google Meet link will be generated and emails will be sent to both{' '}
              <span className="font-medium text-gray-700">{rescheduleTarget.userName}</span> and the owner.
            </p>

            <div className="flex gap-3">
              <button onClick={closeReschedule} className="btn-secondary flex-1" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={executeReschedule}
                disabled={actionLoading || !rescheduleTime}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Rescheduling…' : 'Reschedule & Notify'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Assign meeting modal ─────────────────────────────────────────────── */}
      <Modal isOpen={!!assignTarget} onClose={closeAssign} title="Assign Meeting" size="lg">
        {assignTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <UserPlusIcon className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Assign {assignTarget.userName}'s meeting</p>
                <p className="text-sm text-gray-500">
                  The selected team member will be notified by email and will also receive all
                  future updates (confirm / reject / reschedule) for this meeting.
                </p>
              </div>
            </div>

            {assigneesLoading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading team members…</p>
            ) : assigneeList.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No team members found.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                {assigneeList.map((u: any) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => setSelectedAssignee(u)}
                    className={`text-left border rounded-lg px-3 py-2.5 transition-colors ${
                      selectedAssignee?.email === u.email
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </button>
                ))}
              </div>
            )}

            {assignTarget.assignedTo?.email && (
              <p className="text-xs text-gray-500">
                Currently assigned to{' '}
                <span className="font-medium text-gray-700">{assignTarget.assignedTo.name}</span>{' '}
                ({assignTarget.assignedTo.email})
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={closeAssign} className="btn-secondary flex-1" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={executeAssign}
                disabled={actionLoading || !selectedAssignee}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Assigning…' : 'Assign & Notify'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this meeting request? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
