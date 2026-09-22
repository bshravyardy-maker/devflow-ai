'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, tasksApi, usersApi, aiApi, Project, Task, User, AIGeneratedTask } from '@/lib/api';
import {
  Button, Card, EmptyState, ErrorAlert, Spinner, ProgressBar, Badge, Modal, Input, Textarea, Select
} from '@/components/ui';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, formatRelative } from '@/lib/utils';
import Link from 'next/link';
import { ProjectHealthCard } from '@/components/project-health';

// ── Task Form ────────────────────────────────────────────────────────────────

function TaskForm({
  projectId,
  users,
  initial,
  onSubmit,
  loading,
}: {
  projectId: number;
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
  const [assigneeId, setAssigneeId] = useState(initial?.assignee_id ? String(initial.assignee_id) : '');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          title, description, status, priority,
          due_date: dueDate || undefined,
          project_id: projectId,
          assignee_id: assigneeId ? parseInt(assigneeId) : null,
        });
      }}
      className="space-y-4"
    >
      <Input label="Task Title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Implement user auth" />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Details..." />
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

function AITaskGenerator({ projectId, onAdded }: { projectId: number; onAdded: () => void }) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [generated, setGenerated] = useState<AIGeneratedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const generate = async () => {
    if (!goal.trim()) return;
    setLoading(true); setError(''); setGenerated([]); setSelected(new Set()); setEditingIndex(null);
    try {
      const res = await aiApi.generateTasks({ project_id: projectId, goal });
      setGenerated(res.tasks);
      setSelected(new Set(res.tasks.map((_, i) => i)));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const toggle = (i: number) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };

  const updateGeneratedTask = (index: number, updates: Partial<AIGeneratedTask>) => {
    const updated = [...generated];
    updated[index] = { ...updated[index], ...updates };
    setGenerated(updated);
  };

  const addSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true); setError('');
    try {
      const tasks = generated.filter((_, i) => selected.has(i));
      await aiApi.addTasks({ project_id: projectId, tasks });
      onAdded();
      setGenerated([]); setGoal(''); setSelected(new Set());
    } catch (e: any) { setError(e.message); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 mb-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
          ✨ Gemini AI
        </span>
      </div>
      <p className="text-sm text-slate-400">
        Describe your goal and let AI break it down into actionable tasks. Review and edit them before adding to your project.
      </p>
      
      {error && <ErrorAlert message={error} />}
      
      <Textarea
        label="Describe your project goal"
        value={goal}
        onChange={e => setGoal(e.target.value)}
        rows={3}
        placeholder="E.g. Build a login and registration system with email validation"
      />
      <Button onClick={generate} loading={loading} disabled={!goal.trim() || loading} className="w-full justify-center">
        {loading ? 'Analyzing your goal...' : '✨ Generate Tasks'}
      </Button>

      {loading && (
        <div className="flex justify-center p-8">
          <Spinner size={32} />
        </div>
      )}

      {!loading && generated.length > 0 && (
        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
          <p className="text-slate-300 font-medium">{generated.length} tasks generated. Review them below:</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {generated.map((t, i) => (
            <div key={i} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${selected.has(i) ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
              
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1.5 accent-violet-500 cursor-pointer"
                />
                
                {editingIndex === i ? (
                  <div className="flex-1 space-y-3">
                    <Input value={t.title} onChange={e => updateGeneratedTask(i, { title: e.target.value })} className="bg-slate-900" />
                    <Textarea value={t.description} onChange={e => updateGeneratedTask(i, { description: e.target.value })} rows={2} className="bg-slate-900 text-sm" />
                    <div className="flex gap-2">
                      <Select 
                        value={t.priority} 
                        onChange={e => updateGeneratedTask(i, { priority: e.target.value })}
                        options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
                        className="bg-slate-900"
                      />
                      <Input 
                        type="date" 
                        value={t.due_date?.split('T')[0] || ''} 
                        onChange={e => updateGeneratedTask(i, { due_date: e.target.value || undefined })} 
                        className="bg-slate-900"
                      />
                    </div>
                    <Button size="sm" onClick={() => setEditingIndex(null)} className="w-full justify-center">Done Editing</Button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(i)}>
                    <p className="text-slate-200 text-sm font-medium">{t.title}</p>
                    {t.description && <p className="text-slate-500 text-xs mt-0.5">{t.description}</p>}
                    <div className="flex gap-2 mt-2 items-center flex-wrap">
                      <Badge
                        label={PRIORITY_LABELS[t.priority] ?? t.priority}
                        colorClass={PRIORITY_COLORS[t.priority] ?? ''}
                      />
                      {t.due_date && <span className="text-slate-500 text-xs">Due: {t.due_date}</span>}
                    </div>
                  </div>
                )}
                
                {editingIndex !== i && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingIndex(i)}>Edit</Button>
                )}
              </div>
            </div>
          ))}
          </div>
          <Button
            onClick={addSelected}
            loading={adding}
            disabled={selected.size === 0 || adding}
            className="w-full justify-center mt-2"
          >
            Add {selected.size} Task{selected.size !== 1 ? 's' : ''} to Project
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Project Detail Page ──────────────────────────────────────────────────────

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [proj, taskList, userList] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.list({ project_id: projectId }),
        usersApi.list(),
      ]);
      setProject(proj);
      setTasks(taskList);
      setUsers(userList);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleCreateTask = async (data: Partial<Task>) => {
    setSaving(true);
    try {
      await tasksApi.create({ ...data as any, project_id: projectId });
      setShowTaskModal(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEditTask = async (data: Partial<Task>) => {
    if (!editTask) return;
    setSaving(true);
    try {
      await tasksApi.update(editTask.id, data);
      setEditTask(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    setDeleting(id);
    try { await tasksApi.delete(id); load(); }
    catch (e: any) { setError(e.message); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={32} /></div>;
  if (error) return <div className="p-6"><ErrorAlert message={error} onRetry={load} /></div>;
  if (!project) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/projects" className="hover:text-slate-300">Projects</Link>
        <span>/</span>
        <span className="text-slate-300">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-100 truncate">{project.name}</h1>
            <Badge label={STATUS_LABELS[project.status] ?? project.status} colorClass={STATUS_COLORS[project.status] ?? ''} />
          </div>
          {project.description && <p className="text-slate-400 text-sm">{project.description}</p>}
          <p className="text-slate-600 text-xs mt-1">Created {formatDate(project.created_at)}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => setShowAI(true)}>✨ AI Tasks</Button>
          <Button onClick={() => setShowTaskModal(true)}>+ Task</Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-300 font-medium">Progress</span>
          <span className="text-slate-400 text-sm">{project.done_count}/{project.task_count} tasks done</span>
        </div>
        <ProgressBar value={project.progress} />
      </Card>

      {/* AI project health */}
      <div className="mb-6">
        <ProjectHealthCard projectId={projectId} />
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No tasks yet"
          description="Add tasks manually or use AI to generate them from your project goal."
          action={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowAI(true)}>✨ AI Tasks</Button>
              <Button onClick={() => setShowTaskModal(true)}>+ Add Task</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-slate-200 font-semibold">Tasks ({tasks.length})</h2>
          {tasks.map(task => (
            <Card key={task.id} className="group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium">{task.title}</p>
                  {task.description && <p className="text-slate-500 text-sm mt-0.5 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge label={STATUS_LABELS[task.status] ?? task.status} colorClass={STATUS_COLORS[task.status] ?? ''} />
                    <Badge label={PRIORITY_LABELS[task.priority] ?? task.priority} colorClass={PRIORITY_COLORS[task.priority] ?? ''} />
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
                  <Button variant="danger" size="sm" loading={deleting === task.id} onClick={() => handleDeleteTask(task.id)}>Del</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="New Task">
        <TaskForm projectId={projectId} users={users} onSubmit={handleCreateTask} loading={saving} />
      </Modal>

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task">
        {editTask && <TaskForm projectId={projectId} users={users} initial={editTask} onSubmit={handleEditTask} loading={saving} />}
      </Modal>

      <Modal open={showAI} onClose={() => setShowAI(false)} title="AI Task Generator" maxWidth="max-w-2xl">
        <AITaskGenerator projectId={projectId} onAdded={() => { setShowAI(false); load(); }} />
      </Modal>
    </div>
  );
}
