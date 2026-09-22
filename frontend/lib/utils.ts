export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatRelative(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
};
