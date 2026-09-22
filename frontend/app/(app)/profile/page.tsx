'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { Button, Card, Input, ErrorAlert } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      await usersApi.update({ name, email });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar card */}
      <Card className="flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-slate-100 font-semibold text-lg">{user?.name}</p>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <p className="text-slate-600 text-xs mt-1">Member since {formatDate(user?.created_at)}</p>
        </div>
      </Card>

      {/* Edit form */}
      <Card>
        <h2 className="text-slate-200 font-semibold mb-4">Edit Information</h2>
        {error && <div className="mb-4"><ErrorAlert message={error} /></div>}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm">
            ✓ Profile updated successfully
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Your name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Info card */}
      <Card className="mt-4">
        <h2 className="text-slate-200 font-semibold mb-3">Account Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">User ID</span>
            <span className="text-slate-300">#{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Joined</span>
            <span className="text-slate-300">{formatDate(user?.created_at)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
