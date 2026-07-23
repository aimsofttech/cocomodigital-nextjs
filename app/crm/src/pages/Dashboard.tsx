import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { get } from '@/services/api';
import { Spinner, Badge, statusColor, PageHeader, fmtDate, inr } from '@/components/ui';

const Stat = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
  <div className="card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${accent || 'text-gray-900'}`}>{value}</p>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    get('/crm/api/dashboard').then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  const statusChart = Object.entries(data.leads.byStatus || {}).map(([status, count]) => ({ status, count }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your day at a glance" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="New leads (7d)" value={data.leads.newThisWeek} accent="text-primary-600" />
        <Stat label="Calls today" value={data.today.calls.length} />
        <Stat label="Follow-ups due" value={data.today.followupsDue} accent={data.today.followupsOverdue ? 'text-red-600' : undefined} />
        <Stat label="Tasks due" value={data.today.tasksDue} />
        <Stat label="Unread replies" value={data.today.unreadReplies} accent="text-purple-600" />
        <Stat label="Won this month" value={inr(data.deals.wonThisMonth.value)} accent="text-green-600" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Leads by status */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Leads by status</h3>
          {statusChart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChart}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-10 text-center text-sm text-gray-400">No leads yet</p>}
        </div>

        {/* Today's calls */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Today's scheduled calls</h3>
          {data.today.calls.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No calls scheduled today</p>}
          <ul className="divide-y divide-gray-50">
            {data.today.calls.map((c: any) => (
              <li key={c._id} className="flex items-center justify-between py-2.5">
                <div>
                  <Link to={c.leadId ? `/leads/${c.leadId._id}` : '/calls'} className="text-sm font-medium text-gray-800 hover:text-primary-600">
                    {c.leadId?.name || `${c.contactId?.firstName || ''} ${c.contactId?.lastName || ''}`.trim() || 'Unknown'}
                  </Link>
                  <p className="text-xs text-gray-400">{c.purpose} · {fmtDate(c.scheduledAt)}</p>
                </div>
                <Badge color="blue">{new Date(c.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent leads */}
      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Recent leads</h3>
          <Link to="/leads" className="text-xs font-medium text-primary-600 hover:underline">View all →</Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Name</th><th className="th">Source</th><th className="th">Status</th>
              <th className="th">Rating</th><th className="th">Owner</th><th className="th">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.recentLeads.map((l: any) => (
              <tr key={l._id} className="hover:bg-gray-50">
                <td className="td font-medium">
                  <Link to={`/leads/${l._id}`} className="hover:text-primary-600">{l.name}</Link>
                </td>
                <td className="td">{l.source?.channel?.replace('_', ' ') || '—'}</td>
                <td className="td"><Badge color={statusColor(l.status)}>{l.status}</Badge></td>
                <td className="td"><Badge color={statusColor(l.rating)}>{l.rating}</Badge></td>
                <td className="td">{l.ownerId?.name || <span className="text-gray-400">Unassigned</span>}</td>
                <td className="td text-gray-400">{fmtDate(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
