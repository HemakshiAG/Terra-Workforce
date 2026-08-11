'use client';

import { AppShell } from '@/components/app-shell';
import Link from 'next/link';
import { Building2, ShieldCheck, Users, MapPinned, UserPlus, MapPinPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type DashboardSnapshot = {
  organization_name?: string | null;
  supervisors: number;
  worksites: number;
  users: number;
  role: string;
  empty_state?: string | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardSnapshot>({ supervisors: 0, worksites: 0, users: 0, role: 'ADMIN' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadDashboard() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ detail: 'Unable to load dashboard.' }));
          throw new Error(payload.detail ?? 'Unable to load dashboard.');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const cards = [
    { title: 'Organization', value: stats.organization_name ?? 'No organization linked', detail: 'Workspace identity', icon: Building2 },
    { title: 'Supervisors', value: String(stats.supervisors), detail: 'Managing field operations', icon: Users },
    { title: 'Worksites', value: String(stats.worksites), detail: 'Active field boundaries', icon: MapPinned },
    { title: 'Total Members', value: String(stats.users), detail: 'Users in this organization', icon: ShieldCheck },
  ];

  return (
    <AppShell
      title={stats.organization_name ? `Welcome to ${stats.organization_name}` : 'Workspace dashboard'}
      subtitle={stats.empty_state ?? 'Manage your organization, supervisors, and worksites.'}
      allowedRoles={['ADMIN', 'SUPERVISOR']}
    >
      {error ? <div className="mb-4 rounded border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">{error}</div> : null}
      {isLoading ? <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b] animate-pulse">Loading workspace data…</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
              <div className="flex items-center justify-between text-[#8d998b]">
                <span className="text-[10px] uppercase tracking-[0.3em]">{card.title}</span>
                <Icon size={16} className="text-[#b7cc75]" />
              </div>
              <p className="mt-4 text-2xl font-light text-[#f5f1e8]">{card.value}</p>
              <p className="mt-2 text-xs text-[#8d998b]">{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
          <div className="flex items-center gap-2 text-[#dfeab1]">
            <Building2 size={16} className="text-[#b7cc75]" />
            <span>Workspace overview</span>
          </div>

          {stats.users <= 1 ? (
            <div className="mt-4 rounded border border-dashed border-[rgba(183,196,170,0.18)] bg-[#0c110c] p-6 text-sm text-[#a8b1a1]">
              <p className="text-base text-[#f5f1e8] font-medium">{stats.empty_state ?? 'Your workforce is ready to be set up.'}</p>
              <p className="mt-2 text-sm text-[#8d998b]">Start by creating your first worksite location or adding a supervisor to manage field operations.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/worksites" className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/30 bg-[#141d14] px-3.5 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]">
                  <MapPinPlus size={14} /> Add worksite
                </Link>
                <Link href="/workers" className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/30 bg-[#141d14] px-3.5 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]">
                  <UserPlus size={14} /> Add supervisor
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-[#a8b1a1] leading-relaxed">
              <p>Your organization workspace is active and persistent.</p>
              <p>Use the navigation panel on the left to manage your worksites, assign supervisors, and inspect system audit logs.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]">
              <ShieldCheck size={16} className="text-[#b7cc75]" />
              <span>Current Role</span>
            </div>
            <p className="mt-4 text-2xl font-light text-[#f5f1e8] capitalize">{stats.role.toLowerCase()}</p>
            <p className="mt-2 text-xs text-[#8d998b]">Active workspace authority level</p>
          </div>
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]">
              <Users size={16} className="text-[#b7cc75]" />
              <span>Registered Accounts</span>
            </div>
            <p className="mt-4 text-2xl font-light text-[#f5f1e8]">{stats.users}</p>
            <p className="mt-2 text-xs text-[#8d998b]">Total accounts under {stats.organization_name ?? 'this workspace'}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
