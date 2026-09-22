'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { Button, Card, ErrorAlert, Input } from '@/components/ui';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  try { localStorage.setItem('theme', theme); } catch {}
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  }, []);
  const chooseTheme = (t: Theme) => { setTheme(t); applyTheme(t); };

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (next.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setError('New password and confirmation do not match.'); return; }
    setSaving(true);
    try {
      await usersApi.changePassword({ current_password: current, new_password: next });
      setCurrent(''); setNext(''); setConfirm('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Appearance, password and account</p>
      </div>

      <Card className="mb-6">
        <h2 className="text-slate-200 font-semibold mb-1">Appearance</h2>
        <p className="text-slate-500 text-sm mb-4">Your choice is saved in this browser.</p>
        <div className="flex gap-3">
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => chooseTheme('dark')}>🌙 Dark</Button>
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => chooseTheme('light')}>☀️ Light</Button>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-slate-200 font-semibold mb-4">Change Password</h2>
        {error && <div className="mb-4"><ErrorAlert message={error} /></div>}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm">
            ✓ Password updated successfully
          </div>
        )}
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="Current password" type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" />
          <Input label="New password" type="password" value={next} onChange={e => setNext(e.target.value)} required autoComplete="new-password" placeholder="At least 6 characters" />
          <Input label="Confirm new password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
          <Button type="submit" loading={saving}>Update Password</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-slate-200 font-semibold mb-1">Account</h2>
        <p className="text-slate-500 text-sm mb-4">Signed in as {user?.email}</p>
        <Button variant="danger" onClick={logout}>⎋ Log out</Button>
      </Card>
    </div>
  );
}
