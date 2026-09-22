'use client';
import { useEffect, useState } from 'react';
import { aiApi, ProjectHealth } from '@/lib/api';
import { Button, Card, ErrorAlert, Spinner } from '@/components/ui';

const RISK_STYLES: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function scoreStyle(score: number | null): { ring: string; text: string } {
  if (score === null) return { ring: 'border-slate-500/40', text: 'text-slate-400' };
  if (score >= 80) return { ring: 'border-emerald-500/60', text: 'text-emerald-300' };
  if (score >= 55) return { ring: 'border-amber-500/60', text: 'text-amber-300' };
  return { ring: 'border-red-500/60', text: 'text-red-300' };
}

export function ProjectHealthCard({ projectId }: { projectId: number }) {
  const [data, setData] = useState<ProjectHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await aiApi.projectHealth(projectId, false));
    } catch (e: any) {
      setError(e.message || 'Failed to load project health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const generateReport = async () => {
    setAsking(true);
    setAiError('');
    try {
      setData(await aiApi.projectHealth(projectId, true));
    } catch (e: any) {
      setAiError(e.message || 'Could not generate the AI report right now.');
    } finally {
      setAsking(false);
    }
  };

  const style = scoreStyle(data?.score ?? null);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
            ✨ AI Project Health
          </span>
          <h2 className="text-slate-200 font-semibold mt-2">How is this project doing?</h2>
        </div>
        {data && data.metrics.total > 0 && (
          <Button variant="secondary" size="sm" onClick={generateReport} loading={asking}>
            {asking ? 'Writing report...' : data.ai_used ? '↻ Regenerate report' : '✨ Generate AI report'}
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-6"><Spinner size={24} /></div>}
      {!loading && error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-full border-4 ${style.ring} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-2xl font-bold ${style.text}`}>{data.score ?? '—'}</span>
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-semibold ${style.text}`}>{data.label}</p>
              <p className="text-slate-500 text-sm">
                {data.metrics.done} of {data.metrics.total} tasks done
                {data.metrics.overdue > 0 ? ` · ${data.metrics.overdue} overdue` : ''}
                {data.metrics.in_progress > 0 ? ` · ${data.metrics.in_progress} in progress` : ''}
              </p>
            </div>
          </div>

          {aiError && <ErrorAlert message={aiError} />}

          {data.risks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.risks.map((r, i) => (
                <span key={i} className={`px-2.5 py-1 rounded-full border text-xs font-medium ${RISK_STYLES[r.level] ?? RISK_STYLES.low}`}>
                  {r.text}
                </span>
              ))}
            </div>
          )}

          {data.report && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 space-y-3 text-sm">
              <p className="text-violet-100">🤖 {data.report.summary}</p>
              {data.report.risks.length > 0 && (
                <div>
                  <p className="text-slate-300 font-medium mb-1">Biggest risks</p>
                  <ul className="list-disc pl-5 text-slate-300 space-y-0.5">
                    {data.report.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {data.report.next_steps.length > 0 && (
                <div>
                  <p className="text-slate-300 font-medium mb-1">Suggested next steps</p>
                  <ul className="list-disc pl-5 text-slate-300 space-y-0.5">
                    {data.report.next_steps.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
