'use client';

import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Plus } from 'lucide-react';
import { ApiError } from '@/lib/api/http';
import { listWorkers, type WorkerSummary } from '@/lib/api/workers';

export default function EnrollmentPage() {
  const [pendingWorkers, setPendingWorkers] = useState<WorkerSummary[]>([]);
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
        const response = await listWorkers(token);
        setPendingWorkers(response.workers.filter((worker) => worker.biometric_enrollment_status !== 'COMPLETED'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load enrollment queue.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AppShell title="Enrollment" subtitle="Launch and monitor worker identity, consent, and biometric enrollment." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5 md:col-span-2">
          <div className="flex items-center gap-2 text-[#dfeab1]"><Camera size={16} className="text-[#b7cc75]" /> Enrollment station</div>
          <h2 className="mt-3 text-2xl font-light text-[#f5f1e8]">Camera-first worker enrollment</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#a8b1a1]">Use the guided worker wizard to create the record, record manual identity verification, capture consent, and open the biometric enrollment station for capture and liveness.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/workers/new" className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]"><Plus size={14} /> Add worker</Link>
            <Link href="/workers" className="inline-flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#141a14]">Workers</Link>
          </div>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
          <div className="flex items-center gap-2 text-[#dfeab1]"><BadgeCheck size={16} className="text-[#b7cc75]" /> Enrollment queue</div>
          <p className="mt-3 text-2xl font-light text-[#f5f1e8]">{pendingWorkers.length}</p>
          <p className="mt-1 text-sm text-[#8d998b]">Workers pending biometric completion</p>
        </div>
      </div>

      {error ? <div className="mt-6 rounded border border-[#6d3e2b]/40 bg-[#24150f] px-4 py-3 text-sm text-[#f1ba98]">{error}</div> : null}

      <div className="mt-6 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]">
        <div className="border-b border-[rgba(183,196,170,0.12)] px-5 py-4">
          <h3 className="text-lg font-medium text-[#f5f1e8]">Pending enrollment</h3>
          <p className="mt-1 text-sm text-[#8d998b]">Real records only.</p>
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-sm text-[#8d998b]">Loading enrollment queue…</div>
        ) : pendingWorkers.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#8d998b]">No workers require enrollment right now.</div>
        ) : (
          <div className="divide-y divide-[rgba(183,196,170,0.08)]">
            {pendingWorkers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <div className="text-[#f5f1e8]">{worker.full_name}</div>
                  <div className="mt-1 text-sm text-[#8d998b]">{worker.worker_code} • {worker.worksite_name ?? 'No worksite'}</div>
                </div>
                <Link href={`/workers/${worker.id}/enrollment`} className="rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]">Open station</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
