import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api, { get, errMsg } from '@/services/api';
import { Spinner, PageHeader, Empty } from '@/components/ui';

const REPORTS = [
  { key: 'lead-sources', label: 'Lead sources', chart: 'total' },
  { key: 'funnel', label: 'Funnel', chart: 'count' },
  { key: 'agent-activity', label: 'Agent activity', chart: 'calls' },
  { key: 'deliverability', label: 'Message deliverability', chart: 'sent' },
  { key: 'forecast', label: 'Revenue forecast', chart: 'weightedValue' },
  { key: 'idle-leads', label: 'Idle leads', chart: null },
] as const;

const ReportsPage = () => {
  const [active, setActive] = useState<string>('lead-sources');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/crm/api/reports/${active}`, {
        from: range.from || undefined, to: range.to || undefined,
      });
      setRows(res.data as any[]);
    } catch (err) { toast.error(errMsg(err)); }
    setLoading(false);
  }, [active, range]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const res = await api.get(`/crm/api/reports/${active}`, {
        params: { format: 'csv', from: range.from || undefined, to: range.to || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${active}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const def = REPORTS.find((r) => r.key === active)!;
  const columns = rows.length ? Object.keys(rows[0]).filter((k) => k !== '_id') : [];
  const chartKey = def.chart && columns.includes(def.chart) ? def.chart : null;
  const labelKey = columns[0];

  return (
    <div>
      <PageHeader
        title="Reports"
        actions={<button className="btn-secondary" onClick={exportCsv}>Export CSV</button>}
      />

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className={active === r.key ? 'btn-primary' : 'btn-secondary'}>{r.label}</button>
        ))}
        <span className="flex-1" />
        <input type="date" className="input max-w-40" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" className="input max-w-40" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <div className="card"><Empty message="No data for this period." /></div> : (
        <>
          {chartKey && (
            <div className="card mb-4 p-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rows}>
                  <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Bar dataKey={chartKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>{columns.map((c) => <th key={c} className="th">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((c) => <td key={c} className="td text-xs">{String(row[c] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
