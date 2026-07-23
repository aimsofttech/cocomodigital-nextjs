import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get, patch, errMsg } from '@/services/api';
import { Spinner, PageHeader, Modal, inr, fmtDateOnly } from '@/components/ui';

const DealsBoard = () => {
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<any>(null);      // deal being moved
  const [lostReason, setLostReason] = useState('');
  const [targetStage, setTargetStage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/crm/api/deals/board');
      setBoard(res.data);
    } catch (err: any) {
      if (err?.response?.status !== 400) toast.error(errMsg(err));
      setBoard(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = async (deal: any, stageKey: string) => {
    if (stageKey === 'lost') { setMoving(deal); setTargetStage(stageKey); return; }
    try {
      await patch(`/crm/api/deals/${deal._id}/stage`, { stageKey });
      toast.success('Stage updated');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const confirmLost = async () => {
    if (!lostReason) return toast.error('Reason is required');
    try {
      await patch(`/crm/api/deals/${moving._id}/stage`, { stageKey: targetStage, lostReason });
      toast.success('Deal marked lost');
      setMoving(null); setLostReason('');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Deals" subtitle={board ? `Pipeline: ${board.pipeline.name}` : undefined} />
      {!board ? (
        <div className="card p-10 text-center text-sm text-gray-400">
          No pipeline yet — run <code>npm run seed:crm</code> to create the default Sales pipeline.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {board.columns.map((col: any) => (
            <div key={col.key} className="w-64 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{col.label}</h3>
                <span className="text-[11px] text-gray-400">{col.deals.length} · {inr(col.totalValue)}</span>
              </div>
              <div className="space-y-2">
                {col.deals.map((d: any) => (
                  <div key={d._id} className="card p-3">
                    <p className="text-sm font-semibold text-gray-800">{d.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {d.contactId ? (
                        <Link className="hover:text-primary-600" to={`/contacts/${d.contactId._id}`}>
                          {d.contactId.firstName} {d.contactId.lastName || ''}
                        </Link>
                      ) : '—'}
                      {d.companyId?.name ? ` · ${d.companyId.name}` : ''}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-green-700">{inr(d.value)}</span>
                      {d.expectedCloseDate && <span className="text-[11px] text-gray-400">{fmtDateOnly(d.expectedCloseDate)}</span>}
                    </div>
                    <select
                      className="input mt-2 py-1 text-xs"
                      value={col.key}
                      onChange={(e) => move(d, e.target.value)}
                    >
                      {board.columns.map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
                {col.deals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-300">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!moving} onClose={() => setMoving(null)} title="Mark deal as lost">
        <label className="label">Lost reason *</label>
        <input className="input" value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="e.g. budget, timing, competitor" />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setMoving(null)}>Cancel</button>
          <button className="btn-danger" onClick={confirmLost}>Mark lost</button>
        </div>
      </Modal>
    </div>
  );
};

export default DealsBoard;
