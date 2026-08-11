'use client';

import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Plus, ShieldCheck, UsersRound, UserRound } from 'lucide-react';
import { ApiError } from '@/lib/api/http';
import { listWorkers, type WorkerListResponse, type WorkerSummary } from '@/lib/api/workers';

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function statusPill(status: string) {
  if (status === 'ACTIVE') return 'border-[#b7cc75]/30 bg-[#162216] text-[#dfeab1]';
  if (status === 'PENDING_ENROLLMENT') return 'border-[#7d6e48]/35 bg-[#18140d] text-[#e3d1a0]';
  return 'border-[rgba(183,196,170,0.12)] bg-[#101610] text-[#8d998b]';
}

function enrollmentLabel(worker: WorkerSummary) {
  return worker.biometric_enrollment_status === 'COMPLETED' ? 'Biometric enrolled' : 'Pending';
}

export default function WorkersPage() {
  const [data, setData] = useState<WorkerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const response = await listWorkers(token);
        setData(response);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError('Your session expired. Please sign in again.');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load workers.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const workers = data?.workers ?? [];
  const stats = data?.stats ?? { total_workers: 0, active: 0, pending_enrollment: 0, inactive: 0 };

  const cards = useMemo(
    () => [
      { label: 'Total workers', value: stats.total_workers, icon: UsersRound },
      { label: 'Active', value: stats.active, icon: ShieldCheck },
      { label: 'Pending enrollment', value: stats.pending_enrollment, icon: CalendarDays },
      { label: 'Inactive', value: stats.inactive, icon: UserRound },
    ],
    [stats]
  );

  return (
    <AppShell title="Workers" subtitle="Manage workforce identity and enrollment." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      <div className="flex items-start justify-between gap-4 border-b border-[rgba(183,196,170,0.12)] pb-5">
        <div>
          <p className="terra-kicker">Workers</p>
          <p className="mt-1 text-sm text-[#8d998b]">Manage workforce identity and enrollment.</p>
        </div>
        <Link
          href="/workers/new"
          className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]"
        >
          <Plus size={14} /> Add worker
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
              <div className="flex items-center justify-between text-[#8d998b]">
                <span className="text-[10px] uppercase tracking-[0.3em]">{card.label}</span>
                <Icon size={16} className="text-[#b7cc75]" />
              </div>
              <p className="mt-4 text-2xl font-light text-[#f5f1e8]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {error ? <div className="mt-6 rounded border border-[#6d3e2b]/40 bg-[#24150f] px-4 py-3 text-sm text-[#f1ba98]">{error}</div> : null}

      <div className="mt-6 overflow-hidden rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]">
        <div className="border-b border-[rgba(183,196,170,0.12)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-[#f5f1e8]">Worker roster</h2>
              <p className="mt-1 text-sm text-[#8d998b]">Real database records only.</p>
            </div>
            <span className="text-xs uppercase tracking-[0.25em] text-[#8d998b]">{stats.total_workers} records</span>
          </div>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-sm text-[#8d998b]">Loading workers…</div>
        ) : workers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-lg text-[#f5f1e8]">No workers enrolled yet.</p>
            <p className="mt-2 text-sm text-[#8d998b]">Add your first worker to begin attendance tracking.</p>
            <Link
              href="/workers/new"
              className="mt-5 inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]"
            >
              <Plus size={14} /> Add worker
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[rgba(183,196,170,0.08)] text-left text-sm">
              <thead className="bg-[#0c110c] text-[#8d998b]">
                <tr>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Worker</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Worker ID</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Worksite</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Status</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Enrollment</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Last updated</th>
                  <th className="px-5 py-3 font-normal uppercase tracking-[0.25em] text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(183,196,170,0.08)]">
                {workers.map((worker) => (
                  <tr key={worker.id} className="bg-[#0f140f]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#f5f1e8]">{worker.full_name}</div>
                      <div className="mt-1 text-xs text-[#8d998b]">{worker.role}</div>
                    </td>
                    <td className="px-5 py-4 text-[#dfeab1]">{worker.worker_code}</td>
                    <td className="px-5 py-4 text-[#a8b1a1]">{worker.worksite_name ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${statusPill(worker.status)}`}>
                        {worker.status.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#a8b1a1]">{enrollmentLabel(worker)}</td>
                    <td className="px-5 py-4 text-[#a8b1a1]">{formatDate(worker.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/workers/${worker.id}`} className="inline-flex items-center gap-1 rounded border border-[rgba(183,196,170,0.12)] bg-[#121812] px-3 py-1.5 text-xs text-[#dfeab1] transition hover:bg-[#182018]">
                          View <ArrowUpRight size={12} />
                        </Link>
                        <Link href={`/workers/${worker.id}`} className="inline-flex items-center gap-1 rounded border border-[rgba(183,196,170,0.12)] bg-[#121812] px-3 py-1.5 text-xs text-[#dfeab1] transition hover:bg-[#182018]">
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
