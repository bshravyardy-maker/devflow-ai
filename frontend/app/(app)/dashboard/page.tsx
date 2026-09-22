'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, DashboardStats, Task } from '@/lib/api';
import { Card, EmptyState, ErrorAlert, Spinner, ProgressBar, Badge } from '@/components/ui';
import { formatRelative, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { FocusCoachCard } from '@/components/focus-coach';
import { DigestCard } from '@/components/digest';

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: string }) {
  return (
    <Card className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-0.5">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm font-medium truncate">{task.title}</p>
        <p className="text-slate-500 text-xs">{formatRelative(task.created_at)}</p>
      </div>
      <Badge label={PRIORITY_LABELS[task.priority] ?? task.priority} colorClass={PRIORITY_COLORS[task.priority] ?? ''} />
      <Badge label={STATUS_LABELS[task.status] ?? task.status} colorClass={STATUS_COLORS[task.status] ?? ''} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.get();
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening with your projects today.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Spinner size={32} />
        </div>
      )}

      {!loading && error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Projects" value={stats.total_projects} icon="◈" />
            <StatCard label="Active Projects" value={stats.active_projects} icon="⚡" />
            <StatCard label="Total Tasks" value={stats.total_tasks} icon="✓" />
            <StatCard
              label="Completed"
              value={`${stats.completion_percentage}%`}
              sub={`${stats.completed_tasks} of ${stats.total_tasks} tasks`}
              icon="★"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <FocusCoachCard />
            <DigestCard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Task status donut card */}
            <Card>
              <h2 className="text-slate-200 font-semibold mb-4">Task Status</h2>
              <div className="space-y-3">
                {[
                  { key: 'todo', label: 'To Do', color: 'bg-slate-500' },
                  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
                  { key: 'done', label: 'Done', color: 'bg-emerald-500' },
                ].map(s => {
                  const count = stats.task_status_counts[s.key as keyof typeof stats.task_status_counts] ?? 0;
                  const pct = stats.total_tasks > 0 ? Math.round((count / stats.total_tasks) * 100) : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{s.label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent tasks */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-200 font-semibold">Recent Tasks</h2>
                <Link href="/tasks" className="text-violet-400 hover:text-violet-300 text-xs">View all →</Link>
              </div>
              {stats.recent_tasks.length === 0 ? (
                <EmptyState icon="✓" title="No tasks yet" description="Create your first task to get started." />
              ) : (
                <div>
                  {stats.recent_tasks.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project progress */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-200 font-semibold">Project Progress</h2>
                <Link href="/projects" className="text-violet-400 hover:text-violet-300 text-xs">View all →</Link>
              </div>
              {stats.projects.length === 0 ? (
                <EmptyState icon="◈" title="No projects yet" description="Create your first project." />
              ) : (
                <div className="space-y-4">
                  {stats.projects.map(p => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Link href={`/projects/${p.id}`} className="text-slate-200 text-sm font-medium hover:text-violet-300 transition-colors truncate">
                          {p.name}
                        </Link>
                        <span className="text-slate-500 text-xs ml-2">{p.task_count} tasks</span>
                      </div>
                      <ProgressBar value={p.progress} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card>
              <h2 className="text-slate-200 font-semibold mb-4">Recent Activity</h2>
              {stats.recent_activities.length === 0 ? (
                <EmptyState icon="⏰" title="No activity yet" />
              ) : (
                <div className="space-y-3">
                  {stats.recent_activities.map(act => (
                    <div key={act.id} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs flex-shrink-0 mt-0.5">
                        {act.user?.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm">{act.action}</p>
                        <p className="text-slate-500 text-xs">{formatRelative(act.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
