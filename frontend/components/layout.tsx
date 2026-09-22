'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/projects', label: 'Projects', icon: '◈' },
  { href: '/tasks', label: 'Tasks', icon: '✓' },
  { href: '/analytics', label: 'Analytics', icon: '▤' },
  { href: '/focus', label: 'Focus', icon: '◔' },
  { href: '/profile', label: 'Profile', icon: '◉' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-900/80 border-r border-white/10 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-lg">
            D
          </div>
          <div>
            <p className="text-slate-100 font-semibold text-sm">DevFlow AI</p>
            <p className="text-slate-500 text-xs">Project Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-slate-500">
          ⎋ Logout
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold">
            D
          </div>
          <span className="text-slate-100 font-semibold">DevFlow AI</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-slate-400 hover:text-slate-200 p-2"
        >
          {open ? '✕' : '☰'}
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-900 border-r border-white/10 p-4 flex flex-col">
            <div className="flex-1 space-y-1 mt-4">
              {navItems.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-slate-500 mt-4">
              ⎋ Logout
            </Button>
          </div>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 border-t border-white/10 backdrop-blur-xl flex">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-all ${
                active ? 'text-violet-400' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
