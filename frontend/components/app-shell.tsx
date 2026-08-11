'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, Camera, FileText, Home, LogOut, MapPinned, ScrollText, Settings, ShieldCheck, SquareUser, Users, Wallet, Wifi } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

const navigation = {
  ADMIN: [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/workers', label: 'Supervisors', icon: Users },
    { href: '/worksites', label: 'Worksites', icon: MapPinned },
    { href: '/integrity', label: 'Integrity', icon: ShieldCheck },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/audit', label: 'Audit', icon: ScrollText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  SUPERVISOR: [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/attendance', label: 'Attendance', icon: Camera },
    { href: '/workers', label: 'Workers', icon: Users },
    { href: '/enrollment', label: 'Enrollment', icon: BadgeCheck },
    { href: '/worksites', label: 'Worksites', icon: MapPinned },
    { href: '/integrity', label: 'Integrity', icon: ShieldCheck },
    { href: '/wages', label: 'Wages', icon: Wallet },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  WORKER: [
    { href: '/worker', label: 'My Work', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export function AppShell({ title, subtitle, children, allowedRoles }: { title: string; subtitle?: string; children: ReactNode; allowedRoles?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>('ADMIN');
  const [userName, setUserName] = useState<string>('Member');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') : null;
    
    if (!token) {
      if (pathname !== '/login' && pathname !== '/register') {
        router.replace('/login');
      }
      setIsAuthChecking(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          localStorage.removeItem('terra-session-token');
          localStorage.removeItem('terra-workforce-token');
          localStorage.removeItem('terra-workforce-role');
          localStorage.removeItem('terra-workforce-user');
          router.replace('/login');
          return;
        }

        const user = await response.json();
        const nextRole = (user.role ?? 'ADMIN').toUpperCase();
        setRole(nextRole);
        setUserName(user.name ?? 'Member');
        localStorage.setItem('terra-workforce-role', nextRole);

        if (allowedRoles && !allowedRoles.map(r => r.toUpperCase()).includes(nextRole)) {
          router.replace('/403');
          return;
        }
      })
      .catch(() => {
        localStorage.removeItem('terra-session-token');
        localStorage.removeItem('terra-workforce-token');
        router.replace('/login');
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, [allowedRoles, pathname, router]);

  const navItems = useMemo(() => navigation[role as keyof typeof navigation] ?? navigation.ADMIN, [role]);

  function handleLogout() {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token');
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    localStorage.removeItem('terra-session-token');
    localStorage.removeItem('terra-workforce-token');
    localStorage.removeItem('terra-workforce-role');
    localStorage.removeItem('terra-workforce-user');
    router.push('/login');
  }

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8] flex items-center justify-center">
        <div className="text-sm text-[#8d998b] animate-pulse">Authenticating session...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/90 p-4 lg:w-[260px]">
          <Link href={role === 'WORKER' ? '/worker' : '/dashboard'} className="flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#dfeab1]">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#b7cc75]" />
            terra.
          </Link>

          <div className="mt-6 rounded border border-[rgba(183,196,170,0.12)] bg-[#111811] p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#8d998b]">Active role</div>
            <div className="mt-2 text-sm font-medium text-[#dfeab1] capitalize">{role.toLowerCase()}</div>
          </div>

          <nav className="mt-7 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition ${active ? 'border border-[#b7cc75]/35 bg-[#121b12] text-[#f5f1e8]' : 'border border-transparent text-[#b8c0b0] hover:border-[rgba(183,196,170,0.12)] hover:bg-[#101610] hover:text-[#f5f1e8]'}`}
                >
                  <Icon size={15} className={active ? 'text-[#b7cc75]' : 'text-[#8d998b]'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-3">
            <div className="flex items-center gap-2 text-sm text-[#dfeab1]">
              <Wifi size={14} className="text-[#b7cc75]" /> Online
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[#8d998b]">Core features available</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-3 py-2.5 text-sm text-[#dfeab1] transition hover:border-[rgba(183,196,170,0.18)] hover:text-[#f5f1e8]"
          >
            <LogOut size={14} className="text-[#b7cc75]" />
            Sign out
          </button>

          <div className="mt-8 flex items-center gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-3 py-3 text-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#b7cc75]/30 bg-[#171d17] text-[#dfeab1]">
              <SquareUser size={15} />
            </div>
            <div>
              <div className="text-[#f5f1e8] font-medium">{userName}</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">{role}</div>
            </div>
          </div>
        </aside>

        <section className="flex-1 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/90 p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-[rgba(183,196,170,0.12)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="terra-kicker">Terra Workforce</p>
              <h1 className="mt-2 text-3xl font-light tracking-[-0.04em] text-[#f5f1e8] md:text-[2.2rem]">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-[#a8b1a1]">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-4 py-3 text-sm text-[#dfeab1]">
              <div className="flex items-center gap-2 text-[#b7cc75]">
                <Activity size={14} />
                <span>Online</span>
              </div>
              <span className="text-[#8d998b]">•</span>
              <span className="text-[#8d998b]">Ready</span>
            </div>
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
