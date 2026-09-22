'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { focusApi, tasksApi, FocusSummary, Task } from '@/lib/api';
import { Button, Card, EmptyState, ErrorAlert, Select, Spinner } from '@/components/ui';
import { formatRelative } from '@/lib/utils';

const PRESETS = [15, 25, 45, 60];

type TimerState = 'idle' | 'running' | 'paused';

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function FocusPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState('');
  const [duration, setDuration] = useState(25);
  const [state, setState] = useState<TimerState>('idle');
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000);
  const endAtRef = useRef(0);

  const [summary, setSummary] = useState<FocusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await focusApi.summary());
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load focus stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    tasksApi.list({}).then(list => setTasks(list.filter(t => t.status !== 'done'))).catch(() => {});
  }, [loadSummary]);

  const logSession = useCallback(async (minutes: number) => {
    try {
      await focusApi.logSession({ task_id: taskId ? Number(taskId) : null, minutes });
      setMessage(`✓ Logged a ${minutes}-minute focus session. Nice work!`);
      await loadSummary();
    } catch (e: any) {
      setMessage('');
      setError(e.message || 'Could not save the session');
    }
  }, [taskId, loadSummary]);

  // Countdown: based on an end timestamp so it stays accurate even if the tab is throttled.
  useEffect(() => {
    if (state !== 'running') return;
    const id = setInterval(() => {
      const left = endAtRef.current - Date.now();
      if (left <= 0) {
        clearInterval(id);
        setRemainingMs(duration * 60 * 1000); // ready for the next session
        setState('idle');
        logSession(duration);
      } else {
        setRemainingMs(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, duration, logSession]);

  // Show the countdown in the browser tab title.
  useEffect(() => {
    if (state === 'idle') { document.title = 'DevFlow AI – Developer Project & Task Manager'; return; }
    document.title = `${fmt(remainingMs)} · Focus`;
    return () => { document.title = 'DevFlow AI – Developer Project & Task Manager'; };
  }, [state, remainingMs]);

  const start = () => {
    setMessage(''); setError('');
    endAtRef.current = Date.now() + remainingMs;
    setState('running');
  };
  const pause = () => { setRemainingMs(Math.max(0, endAtRef.current - Date.now())); setState('paused'); };
  const reset = () => { setState('idle'); setRemainingMs(duration * 60 * 1000); };
  const finishEarly = async () => {
    const elapsedMin = Math.floor((duration * 60 * 1000 - remainingMs) / 60000);
    setState('idle');
    setRemainingMs(duration * 60 * 1000);
    if (elapsedMin >= 1) await logSession(elapsedMin);
    else setMessage('Session ended (under 1 minute, so nothing was logged).');
  };
  const choosePreset = (m: number) => {
    if (state !== 'idle') return;
    setDuration(m);
    setRemainingMs(m * 60 * 1000);
  };

  const progress = 1 - remainingMs / (duration * 60 * 1000);
  const maxDay = summary ? Math.max(1, ...summary.daily_minutes.map(d => d.minutes)) : 1;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Focus Timer</h1>
        <p className="text-slate-400 text-sm mt-1">Work in focused sessions, track your time and build a streak</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timer */}
        <Card className="lg:col-span-3">
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {PRESETS.map(m => (
              <button
                key={m}
                onClick={() => choosePreset(m)}
                disabled={state !== 'idle'}
                className={`px-3.5 py-1.5 rounded-full border text-sm transition-all disabled:cursor-not-allowed ${
                  duration === m
                    ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                    : 'border-white/10 text-slate-400 hover:text-slate-200 disabled:opacity-50'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>

          <div className="text-center mb-2">
            <p className="text-7xl font-bold tabular-nums text-slate-100">{fmt(remainingMs)}</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-5 max-w-sm mx-auto">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>

          <div className="max-w-sm mx-auto mt-6">
            <Select
              label="Working on (optional)"
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              disabled={state !== 'idle'}
              options={[{ value: '', label: 'No specific task' }, ...tasks.map(t => ({ value: String(t.id), label: t.title }))]}
            />
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            {state !== 'running' && (
              <Button size="lg" onClick={start}>{state === 'paused' ? '▶ Resume' : '▶ Start focus'}</Button>
            )}
            {state === 'running' && <Button size="lg" variant="secondary" onClick={pause}>⏸ Pause</Button>}
            {state !== 'idle' && <Button size="lg" variant="secondary" onClick={finishEarly}>✓ Finish &amp; log</Button>}
            {state !== 'idle' && <Button size="lg" variant="ghost" onClick={reset}>Reset</Button>}
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm text-center">
              {message}
            </div>
          )}
          {error && <div className="mt-5"><ErrorAlert message={error} onRetry={loadSummary} /></div>}
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 space-y-4">
          {loading && <div className="flex justify-center py-10"><Spinner size={28} /></div>}
          {!loading && summary && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="text-center !p-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Today</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{fmtMinutes(summary.today_minutes)}</p>
                </Card>
                <Card className="text-center !p-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">7 days</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{fmtMinutes(summary.week_minutes)}</p>
                </Card>
                <Card className="text-center !p-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Streak</p>
                  <p className="text-xl font-bold text-amber-300 mt-1">🔥 {summary.streak_days}</p>
                </Card>
              </div>

              <Card>
                <h2 className="text-slate-200 font-semibold mb-4">Last 7 days</h2>
                <div className="flex items-end gap-2 h-24">
                  {summary.daily_minutes.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date}: ${d.minutes} min`}>
                      <div
                        className="w-full rounded-t bg-violet-500/70"
                        style={{ height: d.minutes > 0 ? `${Math.max(8, (d.minutes / maxDay) * 100)}%` : '2px', opacity: d.minutes > 0 ? 1 : 0.3 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-slate-600 text-xs mt-2">
                  {summary.daily_minutes.map(d => (
                    <span key={d.date} className="flex-1 text-center">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-slate-200 font-semibold mb-3">Most focused tasks</h2>
                {summary.top_tasks.length === 0 ? (
                  <EmptyState icon="◔" title="No sessions yet" description="Pick a task and start your first session." />
                ) : (
                  <div className="space-y-2">
                    {summary.top_tasks.map(t => (
                      <div key={t.task_id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-slate-200 truncate">{t.title}</p>
                          <p className="text-slate-500 text-xs truncate">{t.project_name}</p>
                        </div>
                        <span className="text-violet-300 font-medium flex-shrink-0">{fmtMinutes(t.minutes)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {summary.recent_sessions.length > 0 && (
                <Card>
                  <h2 className="text-slate-200 font-semibold mb-3">Recent sessions</h2>
                  <div className="space-y-2">
                    {summary.recent_sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                        <p className="text-slate-300 truncate">{s.task_title ?? 'No specific task'}</p>
                        <span className="text-slate-500 text-xs flex-shrink-0">{s.minutes}m · {formatRelative(s.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
