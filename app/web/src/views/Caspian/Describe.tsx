"use client";

/**
 * Running the describer, and what it has cost.
 *
 * A strip rather than a tab: describing is an operation you start and
 * forget, not a place you go. It only appears when there is something
 * pending, and only for someone who may run it.
 *
 * The economics on display are the whole argument for the design. A
 * vision call is paid once per asset, at write time, and every search
 * afterwards is free — so the number that matters is not "what did this
 * run cost" but "what has the library cost in total, ever". Both are
 * shown, because a per-run number with no total invites somebody to run
 * it repeatedly without noticing the sum.
 */

import { useCallback, useEffect, useState } from "react";
import { getStats, runDescribeQueue, CaspianError, type MediaStats } from "@/src/lib/caspian";
import styles from "./Caspian.module.css";

const usd = (n: number) => (n >= 0.01 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(4)}` : "$0");

export default function Describe({ onDone }: { onDone: () => void }) {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { getStats().then(setStats).catch(() => setStats(null)); }, []);
  useEffect(load, [load]);

  if (!stats) return null;
  const pending = (stats.describeStatus.pending || 0) + (stats.describeStatus.failed || 0);
  const { budget, cost } = stats;
  const overBudget = budget.budgetUsd > 0 && budget.spentThisMonthUsd >= budget.budgetUsd;

  /* Nothing waiting and nothing spent is not worth a row on screen. */
  if (!pending && !cost.described) return null;

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await runDescribeQueue(20);
      setLast(
        `${r.described} described${r.reused ? `, ${r.reused} reused from identical files` : ""}`
        + `${r.skipped ? `, ${r.skipped} skipped` : ""}${r.failed ? `, ${r.failed} failed` : ""}`
        + `${r.costUsd ? ` · ${usd(r.costUsd)}` : " · nothing billed"}`,
      );
      load();
      onDone();
    } catch (e) {
      setError(e instanceof CaspianError ? e.message : "The queue did not run.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.describeBar}>
      <div className={styles.describeText}>
        <strong>
          {pending
            ? `${pending} ${pending === 1 ? "asset has" : "assets have"} no description yet`
            : "Everything is described"}
        </strong>
        <span className={styles.muted}>
          {cost.described} described so far · {usd(cost.totalUsd)} all time
          {cost.reusedFromChecksum > 0 && ` · ${cost.reusedFromChecksum} free from identical files`}
          {" · "}
          {budget.provider === "stub"
            ? "local stub provider — captions are guessed from filenames, not looked at"
            : `${budget.provider}/${budget.model}`}
          {budget.budgetUsd > 0 && ` · ${usd(budget.spentThisMonthUsd)} of ${usd(budget.budgetUsd)} this month`}
        </span>
      </div>
      {pending > 0 && (
        <button className={styles.ghost} onClick={run} disabled={busy || overBudget}>
          {busy ? "Running…" : overBudget ? "Monthly budget reached" : `Describe ${Math.min(pending, 20)}`}
        </button>
      )}
      {last && <span className={styles.muted}>{last}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
