'use client';
import { useEffect, useState, useCallback } from 'react';
import { tasksApi, projectsApi, usersApi, Task, Project, User } from '@/lib/api';
import {
  Button, Card, EmptyState, ErrorAlert, Spinner, Badge, Modal, Input, Textarea, Select
} from '@/components/ui';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, formatRelative } from '@/lib/utils';

function TaskForm({
  projects,
  users,
  initial,
  onSubmit,
  loading,
}: {
  projects: Project[];
  users: User[];
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'todo');
  const [priority, setPriority] = useState(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.due_date ? initial.due_date.split('T')[0] : '');
  const [projectId, setProjectId] = useState(String(initial?.project_id ?? (projects[0]?.id ?? '')));
  const [assigneeId, setAssigneeId] = useState(initial?.assignee_id ? String(initial.assignee_id) : '');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          title, description, status, priority,
          due_date: dueDate || undefined,
          project_id: parseInt(projectId),
          assignee_id: assigneeId ? parseInt(assigneeId) : null,
        });
      }}
      className="space-y-4"
    >
      <Input label="Task Title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Implement feature X" />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional details" />
      <Select
        label="Project"
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
        options={projects.map(p => ({ value: String(p.id), label: p.name }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}
          options={[{ value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }]} />
        <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)}
          options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <Select
          label="Assignee"
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
          options={[{ value: '', label: 'Unassigned' }, ...users.map(u => ({ value: String(u.id), label: u.name }))]}
        />
      </div>
      <Button type="submit" loading={loading} className="w-full justify-center">
        {initial?.id ? 'Save Changes' : 'Create Task'}
      </Button>
    </form>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [taskList, projList, userList] = await Promise.all([
        tasksApi.list({
          search: search || undefined,
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          assignee_id: filterAssignee ? parseInt(filterAssignee) : undefined,
          project_id: filterProject ? parseInt(filterProject) : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        projectsApi.list(),
        usersApi.list(),
      ]);
      setTasks(taskList);
      setProjects(projList);
      setUsers(userList);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterPriority, filterProject, filterAssignee, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Partial<Task>) => {
    setSaving(true);
    try {
      await tasksApi.create(data as any);
      setShowCreate(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (data: Partial<Task>) => {
    if (!editTask) return;
    setSaving(true);
    try {
      await tasksApi.update(editTask.id, data);
      setEditTask(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    setDeleting(id);
    try { await tasksApi.delete(id); load(); }
    catch (e: any) { setError(e.message); }
    finally { setDeleting(null); }
  };

  const getProjectName = (id: number) => projects.find(p => p.id === id)?.name ?? '—';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={projects.length === 0}>+ New Task</Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search tasks..."
          className="col-span-2 lg:col-span-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-all"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="">Everyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={`${sortBy}:${sortOrder}`} onChange={e => { const [b, o] = e.target.value.split(':'); setSortBy(b); setSortOrder(o); }}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
          <option value="due_date:asc">Due Date ↑</option>
          <option value="due_date:desc">Due Date ↓</option>
          <option value="priority:desc">Priority ↓</option>
        </select>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      {loading ? (
        <div className="flex justify-center py-24"><Spinner size={32} /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No tasks found"
          description={projects.length === 0 ? 'Create a project first, then add tasks.' : 'Create a new task to get started.'}
          action={projects.length > 0 ? <Button onClick={() => setShowCreate(true)}>+ Create Task</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-slate-100 font-medium flex-1 min-w-0">{task.title}</p>
                  </div>
                  {task.description && (
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge label={STATUS_LABELS[task.status] ?? task.status} colorClass={STATUS_COLORS[task.status] ?? ''} />
                    <Badge label={PRIORITY_LABELS[task.priority] ?? task.priority} colorClass={PRIORITY_COLORS[task.priority] ?? ''} />
                    <span className="text-slate-600 text-xs px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                      {getProjectName(task.project_id)}
                    </span>
                    {task.due_date && (
                      <span className="text-slate-500 text-xs">Due {formatDate(task.due_date)}</span>
                    )}
                    {task.assignee && (
                      <span className="text-slate-400 text-xs px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10">
                        👤 {task.assignee.name}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">{formatRelative(task.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditTask(task)}>Edit</Button>
                  <Button variant="danger" size="sm" loading={deleting === task.id} onClick={() => handleDelete(task.id)}>Del</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <TaskForm projects={projects} users={users} onSubmit={handleCreate} loading={saving} />
      </Modal>

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task">
        {editTask && <TaskForm projects={projects} users={users} initial={editTask} onSubmit={handleEdit} loading={saving} />}
      </Modal>
    </div>
  );
}
