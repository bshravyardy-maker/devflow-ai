'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { aiApi, FocusCoach } from '@/lib/api';
import { Badge, Button, Card, ErrorAlert, Spinner } from '@/components/ui';
import { formatDate, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';

const URGENCY_STYLES: Record<string, string> = {
  overdue: 'border-red-500/40 bg-red-500/10',
  due_soon: 'border-amber-500/40 bg-amber-500/10',
  normal: 'border-white/10 bg-white/5',
};

export function FocusCoachCard() {
  const [data, setData] = useState<FocusCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await aiApi.focusCoach(false));
    } catch (e: any) {
      setError(e.message || 'Failed to load Focus Coach');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const askGemini = async () => {
    setAsking(true);
    setAiError('');
    try {
      setData(await aiApi.focusCoach(true));
    } catch (e: any) {
      // keep the ranked list on screen; only the coaching note failed
      setAiError(e.message || 'Could not get AI coaching right now.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
            ✨ AI Focus Coach
          </span>
          <h2 className="text-slate-200 font-semibold mt-2">What to work on next</h2>
        </div>
        {data && data.focus_tasks.length > 0 && (
          <Button variant="secondary" size="sm" onClick={askGemini} loading={asking}>
            {asking ? 'Asking Gemini...' : data.ai_used ? '↻ Refresh AI advice' : '✨ Get AI coaching'}
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8"><Spinner size={24} /></div>
      )}

      {!loading && error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">{data.summary}</p>

          {aiError && <ErrorAlert message={aiError} />}

          {data.coach_message && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <span className="mr-1">🤖</span>{data.coach_message}
            </div>
          )}

          {data.focus_tasks.length > 0 && (
            <div className="space-y-2">
              {data.focus_tasks.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${URGENCY_STYLES[t.urgency] ?? URGENCY_STYLES.normal}`}
                >
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${t.project_id}`}
                      className="text-slate-200 text-sm font-medium hover:text-violet-300 transition-colors"
                    >
                      {t.title}
                    </Link>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {t.project_name}{t.due_date ? ` · Due ${formatDate(t.due_date)}` : ''}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">{t.reasons.join(' · ')}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <Badge label={PRIORITY_LABELS[t.priority] ?? t.priority} colorClass={PRIORITY_COLORS[t.priority] ?? ''} />
                    <Badge label={STATUS_LABELS[t.status] ?? t.status} colorClass={STATUS_COLORS[t.status] ?? ''} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
