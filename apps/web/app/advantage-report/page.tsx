import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { ApiUnreachableError, getAdvantageReport, type AdvantageReportTask } from '@/lib/api';

function groupByTask(tasks: AdvantageReportTask[]) {
  const groups = new Map<string, { withAgent?: AdvantageReportTask; manual?: AdvantageReportTask }>();
  for (const task of tasks) {
    const entry = groups.get(task.taskName) ?? {};
    if (task.ranWithAgent) entry.withAgent = task;
    else entry.manual = task;
    groups.set(task.taskName, entry);
  }
  return groups;
}

function fmtTime(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function fmtCost(usd: number | null) {
  return usd == null ? '—' : `$${usd.toFixed(2)}`;
}

export default async function AdvantageReportPage() {
  let tasks: AdvantageReportTask[] = [];
  let summary = { distinctTasks: 0, meetsMinimumThree: false, hasHighStakesTask: false };
  let loadError: string | null = null;

  try {
    ({ tasks, summary } = await getAdvantageReport());
  } catch (err) {
    loadError = err instanceof ApiUnreachableError ? err.message : 'Could not load the report.';
  }

  const groups = groupByTask(tasks);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-2 border-b border-line pb-6">
        <span className="font-mono text-xs text-amber">TERMIX</span>
        <h1 className="font-display text-3xl font-medium text-text">Agent Advantage Report</h1>
        <p className="max-w-xl text-text-muted">
          Every task run both ways — once hired through M402, once by hand — with real time, cost,
          and quality attached. This is the evidence, not the pitch.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Panel className="flex-1 min-w-[160px] p-4">
          <p className="font-mono text-[11px] text-text-muted">distinct tasks logged</p>
          <p className="font-display text-2xl text-text">{summary.distinctTasks}</p>
        </Panel>
        <Panel className="flex-1 min-w-[160px] p-4">
          <p className="font-mono text-[11px] text-text-muted">≥3 required</p>
          <p className={`font-display text-2xl ${summary.meetsMinimumThree ? 'text-sage' : 'text-amber'}`}>
            {summary.meetsMinimumThree ? 'met' : 'not yet'}
          </p>
        </Panel>
        <Panel className="flex-1 min-w-[160px] p-4">
          <p className="font-mono text-[11px] text-text-muted">high-stakes task</p>
          <p className={`font-display text-2xl ${summary.hasHighStakesTask ? 'text-sage' : 'text-amber'}`}>
            {summary.hasHighStakesTask ? 'present' : 'missing'}
          </p>
        </Panel>
      </div>

      {loadError && <Panel className="p-6 text-sm text-text-muted">{loadError}</Panel>}

      {!loadError && groups.size === 0 && (
        <Panel className="p-6 text-sm text-text-muted">
          Nothing logged yet. Every real task — deploying, testing, comparing — should get{' '}
          <code className="font-mono text-text">POST /advantage-report</code> called twice: once
          with <code className="font-mono text-text">ranWithAgent: true</code>, once{' '}
          <code className="font-mono text-text">false</code>, with the real numbers each time. At
          least one task needs <code className="font-mono text-text">isHighStakes: true</code>{' '}
          (trading, stock, or security).
        </Panel>
      )}

      {[...groups.entries()].map(([taskName, { withAgent, manual }]) => (
        <Panel key={taskName} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-text">{taskName}</h2>
            {withAgent?.isHighStakes && (
              <span className="rounded-sm border border-amber/40 px-2 py-0.5 font-mono text-[10px] uppercase text-amber">
                high-stakes
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-line pt-3 font-mono text-xs sm:grid-cols-2">
            {(
              [
                ['manual', manual],
                ['via M402', withAgent],
              ] as const
            ).map(([label, entry]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-text-muted uppercase tracking-wide">{label}</span>
                {entry ? (
                  <>
                    <span className="text-text">time: {fmtTime(entry.timeSeconds)}</span>
                    <span className="text-text">cost: {fmtCost(entry.costUsd)}</span>
                    {entry.qualityNotes && <span className="text-text-muted">{entry.qualityNotes}</span>}
                    {entry.outputUrl && (
                      <Link href={entry.outputUrl} className="text-sage hover:underline">
                        view output →
                      </Link>
                    )}
                  </>
                ) : (
                  <span className="text-text-muted">not logged yet</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </main>
  );
}
