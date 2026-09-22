'use client';
import { useEffect, useState } from 'react';
import { projectsApi, Project } from '@/lib/api';
import { Button, Card, EmptyState, ErrorAlert, Spinner, ProgressBar, Badge, Modal, Input, Textarea, Select } from '@/components/ui';
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function ProjectForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<Project>;
  onSubmit: (data: { name: string; description: string; status: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit({ name, description, status }); }}
      className="space-y-4"
    >
      <Input label="Project Name" value={name} onChange={e => setName(e.target.value)} required placeholder="My Awesome App" />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" />
      <Select
        label="Status"
        value={status}
        onChange={e => setStatus(e.target.value)}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'archived', label: 'Archived' },
        ]}
      />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1 justify-center">
          {initial?.id ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const router = useRouter();

  const load = async () => {
    setLoading(true); setError('');
    try { setProjects(await projectsApi.list()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: { name: string; description: string; status: string }) => {
    setSaving(true);
    try {
      await projectsApi.create(data);
      setShowCreate(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (data: { name: string; description: string; status: string }) => {
    if (!editProject) return;
    setSaving(true);
    try {
      await projectsApi.update(editProject.id, data);
      setEditProject(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    setDeleting(id);
    try { await projectsApi.delete(id); load(); }
    catch (e: any) { setError(e.message); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      {loading ? (
        <div className="flex justify-center py-24"><Spinner size={32} /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No projects yet"
          description="Create your first project to start managing tasks."
          action={<Button onClick={() => setShowCreate(true)}>+ Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(p => (
            <Card key={p.id} className="group flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/projects/${p.id}`} className="text-slate-100 font-semibold hover:text-violet-300 transition-colors block truncate">
                    {p.name}
                  </Link>
                  {p.description && (
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <Badge label={STATUS_LABELS[p.status] ?? p.status} colorClass={STATUS_COLORS[p.status] ?? ''} />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{p.task_count} tasks</span>
                  <span>{p.done_count} done</span>
                </div>
                <ProgressBar value={p.progress} size="sm" />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-600 text-xs">{formatDate(p.created_at)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => setEditProject(p)}>Edit</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleting === p.id}
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <ProjectForm onSubmit={handleCreate} loading={saving} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project">
        {editProject && <ProjectForm initial={editProject} onSubmit={handleEdit} loading={saving} />}
      </Modal>
    </div>
  );
}
