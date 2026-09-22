'use client';
import { useEffect, useState } from 'react';
import { aiApi, Digest } from '@/lib/api';
import { Button, Card, ErrorAlert, Spinner } from '@/components/ui';

export function DigestCard() {
  const [data, setData] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await aiApi.digest(7, false));
    } catch (e: any) {
      setError(e.message || 'Failed to load your digest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const narrate = async () => {
    setAsking(true);
    setAiError('');
    try {
      setData(await aiApi.digest(7, true));
    } catch (e: any) {
      setAiError(e.message || 'Could not generate the AI recap right now.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
            ✨ AI Weekly Digest
          </span>
          <h2 className="text-slate-200 font-semibold mt-2">Your last 7 days</h2>
        </div>
        {data && data.highlights.length > 0 && (
          <Button variant="secondary" size="sm" onClick={narrate} loading={asking}>
            {asking ? 'Writing recap...' : data.ai_used ? '↻ Regenerate recap' : '✨ Summarize with AI'}
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-6"><Spinner size={24} /></div>}
      {!loading && error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-emerald-300">{data.completed_count}</p>
              <p className="text-slate-500 text-xs">completed</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{data.created_count}</p>
              <p className="text-slate-500 text-xs">created</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{data.active_projects}</p>
              <p className="text-slate-500 text-xs">project{data.active_projects !== 1 ? 's' : ''} touched</p>
            </div>
          </div>

          {aiError && <ErrorAlert message={aiError} />}

          {data.summary && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <span className="mr-1">🤖</span>{data.summary}
            </div>
          )}

          {data.highlights.length === 0 ? (
            <p className="text-slate-500 text-sm">No activity in the last 7 days yet - create or update a task to see it here.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.highlights.map((h, i) => (
                <li key={i} className="text-slate-400 text-sm flex gap-2">
                  <span className="text-slate-600">•</span>{h}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
