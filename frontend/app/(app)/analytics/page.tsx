'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, Analytics } from '@/lib/api';
import { Card, EmptyState, ErrorAlert, ProgressBar, Spinner } from '@/components/ui';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/utils';

function StatCard({ label, value, sub, tone = 'text-slate-100' }: { label: string; value: number | string; sub?: string; tone?: string }) {
  return (
    <Card>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </Card>
  );
}

function DistributionCard({
  title, counts, labels, colors, total,
}: {
  title: string;
  counts: Record<string, number>;
  labels: Record<string, string>;
  colors: Record<string, string>;
  total: number;
}) {
  return (
    <Card>
      <h2 className="text-slate-200 font-semibold mb-4">{title}</h2>
      <div className="space-y-3">
        {Object.keys(colors).map(key => {
          const count = counts[key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{labels[key] ?? key}</span>
                <span>{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${colors[key]} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await dashboardApi.analytics());
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxDaily = data ? Math.max(1, ...data.tasks_created_last_14_days.map(d => d.count)) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Progress, priorities and productivity across your projects</p>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><Spinner size={32} /></div>}
      {!loading && error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && data && data.total_tasks === 0 && (
        <EmptyState icon="▤" title="No data yet" description="Create some tasks and your analytics will show up here." />
      )}

      {!loading && !error && data && data.total_tasks > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Tasks" value={data.total_tasks} />
            <StatCard
              label="Completion"
              value={`${data.completion_percentage}%`}
              sub={`${data.completed_tasks} of ${data.total_tasks} done`}
              tone="text-emerald-300"
            />
            <StatCard label="Overdue" value={data.overdue_tasks} tone={data.overdue_tasks > 0 ? 'text-red-300' : 'text-slate-100'} />
            <StatCard label="Due This Week" value={data.due_this_week} tone="text-amber-300" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DistributionCard
              title="Task Status"
              counts={data.status_counts}
              labels={STATUS_LABELS}
              colors={{ todo: 'bg-slate-500', in_progress: 'bg-blue-500', done: 'bg-emerald-500' }}
              total={data.total_tasks}
            />
            <DistributionCard
              title="Task Priority"
              counts={data.priority_counts}
              labels={PRIORITY_LABELS}
              colors={{ high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-500' }}
              total={data.total_tasks}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-slate-200 font-semibold mb-4">Project Progress</h2>
              {data.project_progress.length === 0 ? (
                <EmptyState icon="◈" title="No projects yet" />
              ) : (
                <div className="space-y-4">
                  {data.project_progress.map(p => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Link href={`/projects/${p.id}`} className="text-slate-200 text-sm font-medium hover:text-violet-300 transition-colors truncate">
                          {p.name}
                        </Link>
                        <span className="text-slate-500 text-xs ml-2 flex-shrink-0">{p.done}/{p.total} done</span>
                      </div>
                      <ProgressBar value={p.progress} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-slate-200 font-semibold mb-1">Tasks Created</h2>
              <p className="text-slate-500 text-xs mb-4">Last 14 days</p>
              <div className="flex items-end gap-1.5 h-32">
                {data.tasks_created_last_14_days.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date}: ${d.count}`}>
                    <div
                      className="w-full rounded-t bg-violet-500/70"
                      style={{ height: d.count > 0 ? `${Math.max(8, (d.count / maxDaily) * 100)}%` : '2px', opacity: d.count > 0 ? 1 : 0.3 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-slate-600 text-xs mt-2">
                <span>{data.tasks_created_last_14_days[0]?.date.slice(5)}</span>
                <span>{data.tasks_created_last_14_days[data.tasks_created_last_14_days.length - 1]?.date.slice(5)}</span>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
