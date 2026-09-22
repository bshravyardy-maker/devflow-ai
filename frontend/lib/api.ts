const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ id: number; name: string; email: string; created_at: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request<User[]>('/api/users'),
  me: () => request<User>('/api/users/me'),
  update: (data: { name?: string; email?: string }) =>
    request<User>('/api/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ message: string }>('/api/users/me/password', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => request<DashboardStats>('/api/dashboard'),
  analytics: () => request<Analytics>('/api/dashboard/analytics'),
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => request<Project[]>('/api/projects'),
  get: (id: number) => request<Project>(`/api/projects/${id}`),
  create: (data: { name: string; description?: string; status?: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; description?: string; status?: string }) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (params?: {
    project_id?: number;
    status?: string;
    priority?: string;
    assignee_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.set(k, String(v));
      });
    }
    return request<Task[]>(`/api/tasks?${q}`);
  },
  get: (id: number) => request<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task> & { project_id: number; title: string }) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// ── AI ────────────────────────────────────────────────────────────────────────

export const aiApi = {
  generateTasks: (data: { project_id: number; goal: string }) =>
    request<AIGenerateResponse>('/api/ai/generate-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addTasks: (data: { project_id: number; tasks: AIGeneratedTask[] }) =>
    request<Task[]>('/api/ai/add-tasks', { method: 'POST', body: JSON.stringify(data) }),
  focusCoach: (advice = false) =>
    request<FocusCoach>(`/api/ai/focus-coach?advice=${advice ? 'true' : 'false'}`),
  projectHealth: (projectId: number, report = false) =>
    request<ProjectHealth>(`/api/ai/project-health/${projectId}?report=${report ? 'true' : 'false'}`),
  digest: (days = 7, narrate = false) =>
    request<Digest>(`/api/ai/digest?days=${days}&narrate=${narrate ? 'true' : 'false'}`),
};

// ── Focus Timer ───────────────────────────────────────────────────────────────

export const focusApi = {
  logSession: (data: { task_id?: number | null; minutes: number }) =>
    request<FocusSession>('/api/focus/sessions', { method: 'POST', body: JSON.stringify(data) }),
  summary: () => request<FocusSummary>('/api/focus/summary'),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  owner_id: number;
  created_at: string;
  task_count: number;
  done_count: number;
  progress: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  project_id: number;
  assignee_id?: number | null;
  created_at: string;
  assignee?: User | null;
}

export interface Activity {
  id: number;
  action: string;
  user_id: number;
  project_id?: number;
  created_at: string;
  user?: User;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  projects: Project[];
  recent_tasks: Task[];
  recent_activities: Activity[];
  task_status_counts: { todo: number; in_progress: number; done: number };
}

export interface AIGeneratedTask {
  title: string;
  description: string;
  priority: string;
  due_date?: string;
}

export interface AIGenerateResponse {
  tasks: AIGeneratedTask[];
}

export interface FocusTask {
  id: number;
  title: string;
  project_id: number;
  project_name: string;
  status: string;
  priority: string;
  due_date?: string;
  score: number;
  urgency: 'overdue' | 'due_soon' | 'normal';
  reasons: string[];
}

export interface FocusCoach {
  summary: string;
  open_count: number;
  overdue_count: number;
  due_soon_count: number;
  in_progress_count: number;
  focus_tasks: FocusTask[];
  coach_message?: string | null;
  ai_used: boolean;
}

export interface Analytics {
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  overdue_tasks: number;
  due_this_week: number;
  status_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  project_progress: { id: number; name: string; total: number; done: number; progress: number }[];
  tasks_created_last_14_days: { date: string; count: number }[];
}

export interface ProjectHealth {
  project_id: number;
  project_name: string;
  score: number | null;
  label: string;
  metrics: Record<string, number>;
  risks: { level: 'high' | 'medium' | 'low'; text: string }[];
  report?: { summary: string; risks: string[]; next_steps: string[] } | null;
  ai_used: boolean;
}

export interface FocusSession {
  id: number;
  task_id?: number | null;
  task_title?: string | null;
  minutes: number;
  created_at: string;
}

export interface FocusSummary {
  today_minutes: number;
  week_minutes: number;
  total_minutes: number;
  sessions_today: number;
  streak_days: number;
  daily_minutes: { date: string; minutes: number }[];
  top_tasks: { task_id: number; title: string; project_name: string; minutes: number }[];
  recent_sessions: FocusSession[];
}

export interface Digest {
  period_days: number;
  completed_count: number;
  created_count: number;
  active_projects: number;
  highlights: string[];
  summary?: string | null;
  ai_used: boolean;
}

