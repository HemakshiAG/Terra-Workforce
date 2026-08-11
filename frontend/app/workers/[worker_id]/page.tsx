'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, RefreshCcw, Shield, UserCog, UserX } from 'lucide-react';
import { ApiError } from '@/lib/api/http';
import { deactivateWorker, getWorker, updateWorker, type WorkerSummary } from '@/lib/api/workers';
import { listWorksites, type WorksiteRecord } from '@/lib/api/worksites';

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return '—';
  }
}

export default function WorkerDetailPage() {
  const router = useRouter();
  const params = useParams<{ worker_id: string }>();
  const searchParams = useSearchParams();
  const workerId = Number(params.worker_id);

  const [worker, setWorker] = useState<WorkerSummary | null>(null);
  const [worksites, setWorksites] = useState<WorksiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(searchParams.get('enrollment') === 'complete' ? 'Enrollment complete.' : '');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    emergency_contact: '',
    worksite_id: '',
    role: '',
    status: 'ACTIVE',
  });

  const token = typeof window !== 'undefined' ? (localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '') : '';

  useEffect(() => {
    const authToken = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const [workerRecord, worksiteRecords] = await Promise.all([getWorker(authToken, workerId), listWorksites(authToken)]);
        setWorker(workerRecord);
        setWorksites(worksiteRecords);
        setForm({
          full_name: workerRecord.full_name,
          phone: workerRecord.phone ?? '',
          address: workerRecord.address ?? '',
          emergency_contact: workerRecord.emergency_contact ?? '',
          worksite_id: workerRecord.worksite_id ? String(workerRecord.worksite_id) : '',
          role: workerRecord.role,
          status: workerRecord.status,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load worker.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [workerId]);

  const worksiteName = useMemo(() => worksites.find((site) => site.id === worker?.worksite_id)?.name ?? worker?.worksite_name ?? '—', [worker?.worksite_id, worker?.worksite_name, worksites]);
  const biometricEnrollmentState = worker?.biometric_enrollment_status ?? 'NOT_STARTED';
  const biometricEnrollmentAction = biometricEnrollmentState === 'COMPLETED'
    ? 'Re-enroll biometrics'
    : biometricEnrollmentState === 'IN_PROGRESS'
      ? 'Resume biometric station'
      : 'Start biometric enrollment';
  const biometricEnrollmentHint = biometricEnrollmentState === 'COMPLETED'
    ? 'Use this when the worker needs a fresh capture set.'
    : biometricEnrollmentState === 'IN_PROGRESS'
      ? 'Continue the current capture sequence from the station.'
      : 'Start the camera-first station after identity and consent are recorded.';

  async function saveWorker() {
    if (!worker) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateWorker(token, worker.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        worksite_id: form.worksite_id ? Number(form.worksite_id) : undefined,
        role: form.role,
        status: form.status as 'ACTIVE' | 'INACTIVE' | 'PENDING_ENROLLMENT',
      });
      setWorker(updated);
      setEditing(false);
      setNotice('Worker updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update worker.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!worker) return;
    if (!window.confirm('Deactivate this worker?')) return;
    setIsSaving(true);
    setError('');
    try {
      await deactivateWorker(token, worker.id);
      const updated = await getWorker(token, worker.id);
      setWorker(updated);
      setNotice('Worker deactivated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to deactivate worker.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell title="Worker profile" subtitle="Personal information, consent, identity status, and biometric enrollment." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/workers" className="inline-flex items-center gap-2 text-sm text-[#dfeab1] transition hover:text-[#f5f1e8]"><ArrowLeft size={14} /> Back to workers</Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push(`/workers/${workerId}/enrollment`)} className="rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]">Re-enroll biometrics</button>
          <button type="button" onClick={handleDeactivate} disabled={isSaving} className="inline-flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#141a14] disabled:opacity-60"><UserX size={14} /> Deactivate worker</button>
        </div>
      </div>

      {notice ? <div className="mb-4 rounded border border-[#3e5f2d]/40 bg-[#111a0f] px-4 py-3 text-sm text-[#dfeab1]">{notice}</div> : null}
      {error ? <div className="mb-4 rounded border border-[#6d3e2b]/40 bg-[#24150f] px-4 py-3 text-sm text-[#f1ba98]">{error}</div> : null}

      {isLoading ? (
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b]">Loading worker…</div>
      ) : worker ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="terra-kicker">Worker profile</p>
                  <h2 className="mt-1 text-3xl font-light text-[#f5f1e8]">{worker.full_name}</h2>
                  <p className="mt-1 text-sm text-[#8d998b]">Worker ID {worker.worker_code}</p>
                </div>
                <div className="flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-3 py-2 text-xs uppercase tracking-[0.25em] text-[#8d998b]"><Shield size={14} className="text-[#b7cc75]" /> {worker.status.replaceAll('_', ' ').toLowerCase()}</div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8d998b]">Identity verification</p>
                  <p className="mt-2 text-lg text-[#f5f1e8]">{worker.identity_verification_status.replaceAll('_', ' ').toLowerCase()}</p>
                  <p className="mt-1 text-sm text-[#a8b1a1]">{worker.identity_number_masked ?? 'No identity recorded'}</p>
                </div>
                <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8d998b]">Biometric enrollment</p>
                  <p className="mt-2 text-lg text-[#f5f1e8]">{worker.biometric_enrollment_status.replaceAll('_', ' ').toLowerCase()}</p>
                  <p className="mt-1 text-sm text-[#a8b1a1]">Samples: {worker.samples_count ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-5">
              <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.12)] pb-4">
                <div>
                  <p className="terra-kicker">Personal information</p>
                  <p className="mt-1 text-sm text-[#8d998b]">Non-sensitive worker information can be updated here.</p>
                </div>
                <button type="button" onClick={() => setEditing((current) => !current)} className="inline-flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]"><UserCog size={14} /> {editing ? 'Stop editing' : 'Edit worker'}</button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Full name</span>
                  <input disabled={!editing} value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Phone</span>
                  <input disabled={!editing} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Worksite</span>
                  <select disabled={!editing} value={form.worksite_id} onChange={(event) => setForm((current) => ({ ...current, worksite_id: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70">
                    <option value="">Select worksite</option>
                    {worksites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Address</span>
                  <textarea disabled={!editing} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={3} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Emergency contact</span>
                  <input disabled={!editing} value={form.emergency_contact} onChange={(event) => setForm((current) => ({ ...current, emergency_contact: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Role</span>
                  <input disabled={!editing} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Status</span>
                  <select disabled={!editing} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none disabled:opacity-70">
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING_ENROLLMENT">Pending enrollment</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              </div>

              {editing ? (
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditing(false)} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]">Cancel</button>
                  <button type="button" onClick={saveWorker} disabled={isSaving} className="rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Save changes</button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
              <div className="flex items-center gap-2 text-[#dfeab1]"><BadgeCheck size={16} className="text-[#b7cc75]" /> Enrollment summary</div>
              <div className="mt-4 space-y-2 text-sm text-[#a8b1a1]">
                <p>Worksite: {worksiteName}</p>
                <p>Created: {formatDate(worker.created_at)}</p>
                <p>Updated: {formatDate(worker.updated_at)}</p>
                <p>Consent: {worker.consent_given ? `Recorded (${worker.consent_version ?? 'v1'})` : 'Pending'}</p>
              </div>
            </div>

            <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
              <div className="flex items-center gap-2 text-[#dfeab1]"><RefreshCcw size={16} className="text-[#b7cc75]" /> Actions</div>
              <div className="mt-4 space-y-3 text-sm text-[#a8b1a1]">
                <p>{biometricEnrollmentHint}</p>
                <p>Do not expose raw identity numbers or biometric samples here.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/workers/${worker.id}/enrollment`} className="rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]">{biometricEnrollmentAction}</Link>
                <button type="button" onClick={() => router.refresh()} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#141a14]">Refresh</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
