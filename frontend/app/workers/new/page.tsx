'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import { ApiError } from '@/lib/api/http';
import { captureEnrollmentSample, completeEnrollment, startEnrollment } from '@/lib/api/enrollment';
import { createWorker, recordWorkerConsent, updateWorkerIdentity, type IdentityVerificationStatus, type WorkerCreateRequest, type WorkerSummary } from '@/lib/api/workers';
import { listWorksites, type WorksiteRecord } from '@/lib/api/worksites';

const STORAGE_KEY = 'terra-worker-draft-v2';
const CONSENT_VERSION = 'v1';

type DraftState = {
  step: number;
  full_name: string;
  worker_code: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  phone: string;
  address: string;
  emergency_contact: string;
  worksite_id: string;
  role: string;
  identity_type: 'AADHAAR' | 'VOTER_ID' | 'OTHER';
  identity_number: string;
  identity_verification_status: IdentityVerificationStatus;
  consent_given: boolean;
};

type WizardWorker = WorkerSummary | null;

const defaultDraft: DraftState = {
  step: 1,
  full_name: '',
  worker_code: '',
  date_of_birth: '',
  gender: 'UNSPECIFIED',
  phone: '',
  address: '',
  emergency_contact: '',
  worksite_id: '',
  role: 'WORKER',
  identity_type: 'AADHAAR',
  identity_number: '',
  identity_verification_status: 'PENDING',
  consent_given: false,
};

function readDraft(): DraftState {
  if (typeof window === 'undefined') return defaultDraft;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return defaultDraft;
    return { ...defaultDraft, ...JSON.parse(value) };
  } catch {
    return defaultDraft;
  }
}

function saveDraft(draft: DraftState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function stepLabel(step: number) {
  return step.toString().padStart(2, '0');
}

function StepChip({ step, current, label }: { step: number; current: number; label: string }) {
  const active = step === current;
  const done = step < current;
  return (
    <div className={`flex items-center gap-3 rounded border px-3 py-2 text-xs uppercase tracking-[0.25em] ${active ? 'border-[#b7cc75]/35 bg-[#141d14] text-[#f5f1e8]' : done ? 'border-[rgba(183,196,170,0.16)] bg-[#101610] text-[#dfeab1]' : 'border-[rgba(183,196,170,0.08)] bg-[#0f140f] text-[#8d998b]'}`}>
      <span className="text-[10px]">{stepLabel(step)}</span>
      <span>{label}</span>
    </div>
  );
}

export default function NewWorkerPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [worksites, setWorksites] = useState<WorksiteRecord[]>([]);
  const [worker, setWorker] = useState<WizardWorker>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadWorksites() {
      try {
        const response = await listWorksites(token);
        setWorksites(response.filter((site) => site.active));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load worksites.');
      } finally {
        setIsLoading(false);
      }
    }

    loadWorksites();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveDraft(draft);
    }
  }, [draft]);

  const currentWorksite = useMemo(() => worksites.find((site) => String(site.id) === draft.worksite_id) ?? null, [draft.worksite_id, worksites]);

  function token() {
    return localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
  }

  function updateDraft(patch: Partial<DraftState>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function validateStepOne() {
    if (!draft.full_name.trim()) return 'Full name is required.';
    if (!draft.worksite_id) return 'Worksite is required.';
    if (draft.phone && !/^\+?[0-9\s()-]{7,}$/.test(draft.phone.trim())) return 'Enter a valid phone number.';
    if (draft.date_of_birth && Number.isNaN(Date.parse(draft.date_of_birth))) return 'Enter a valid date of birth.';
    return '';
  }

  async function handleStepOne() {
    const validationError = validateStepOne();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      let created: any = null;
      try {
        created = await createWorker(token(), {
          full_name: draft.full_name.trim(),
          worker_code: draft.worker_code.trim() || undefined,
          date_of_birth: draft.date_of_birth || undefined,
          gender: draft.gender,
          phone: draft.phone.trim() || undefined,
          address: draft.address.trim() || undefined,
          emergency_contact: draft.emergency_contact.trim() || undefined,
          worksite_id: Number(draft.worksite_id),
          role: draft.role,
        } as WorkerCreateRequest);
      } catch (netErr: any) {
        // Offline Fallback for Worker Creation
        const { db } = await import('@/lib/db');
        const { syncEngine } = await import('@/lib/offline/syncEngine');
        const localId = `LOC-W-${Date.now()}`;
        const wCode = draft.worker_code.trim() || `W-${Math.floor(Math.random() * 9000) + 1000}`;
        const now = new Date().toISOString();

        created = {
          id: Math.floor(Math.random() * 10000) + 500,
          local_id: localId,
          worker_id: localId,
          worker_code: wCode,
          name: draft.full_name.trim(),
          full_name: draft.full_name.trim(),
          role: draft.role,
          status: 'PENDING_ENROLLMENT',
          worksite_id: Number(draft.worksite_id),
          organization_id: 1,
          biometric_enrollment_status: 'NOT_STARTED',
          sync_status: 'PENDING',
          created_at: now,
          updated_at: now
        };

        await db.workers.add(created);
        await syncEngine.enqueue('WORKER', 'CREATE', localId, created);
      }

      setWorker(created);
      updateDraft({ step: 2, worker_code: created.worker_code });
      setInfo(`Worker recorded locally as ${created.worker_code}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create worker.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleIdentityVerification() {
    if (!worker) return;
    if (!draft.identity_number.trim()) {
      setError('Identity number is required.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await updateWorkerIdentity(token(), worker.id, {
        identity_type: draft.identity_type,
        identity_number: draft.identity_number.trim(),
        verification_status: identityVerified ? 'VERIFIED' : 'PENDING',
        manual_review_reason: 'Demo / manual verification',
      });
      updateDraft({ step: 3 });
      setInfo('Identity information saved. Use the manual verification action before biometric enrollment.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save identity information.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConsent() {
    if (!worker) return;
    if (!draft.consent_given) {
      setError('Biometric consent must be selected before continuing.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await recordWorkerConsent(token(), worker.id, { consent_given: true, consent_version: CONSENT_VERSION });
      updateDraft({ step: 4 });
      setInfo('Consent recorded. Continue to biometric enrollment.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record consent.');
    } finally {
      setIsSaving(false);
    }
  }

  async function beginBiometricEnrollment() {
    if (!worker) return;
    setEnrollmentLoading(true);
    setError('');
    try {
      const enrollment = await startEnrollment(token(), worker.id, CONSENT_VERSION);
      setInfo(`Biometric enrollment started: ${enrollment.status}.`);
      router.push(`/workers/${worker.id}/enrollment`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start biometric enrollment.');
    } finally {
      setEnrollmentLoading(false);
    }
  }

  async function finishWizard() {
    if (!worker) return;
    setIsSaving(true);
    setError('');
    try {
      const current = await completeEnrollment(token(), worker.id);
      setWorker(current.worker);
      updateDraft({ step: 5 });
      setInfo('Enrollment complete.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to finish enrollment.');
    } finally {
      setIsSaving(false);
    }
  }

  function cancelWizard() {
    window.localStorage.removeItem(STORAGE_KEY);
    router.push('/workers');
  }

  return (
    <AppShell title="Add worker" subtitle="Structured worker onboarding with identity, consent, and biometric enrollment." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
        <StepChip step={1} current={draft.step} label="Details" />
        <StepChip step={2} current={draft.step} label="Identity" />
        <StepChip step={3} current={draft.step} label="Consent" />
        <StepChip step={4} current={draft.step} label="Biometric" />
        <StepChip step={5} current={draft.step} label="Complete" />
      </div>

      {error ? <div className="mb-4 rounded border border-[#6d3e2b]/40 bg-[#24150f] px-4 py-3 text-sm text-[#f1ba98]">{error}</div> : null}
      {info ? <div className="mb-4 rounded border border-[#3e5f2d]/40 bg-[#111a0f] px-4 py-3 text-sm text-[#dfeab1]">{info}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-5">
          <div className="flex items-center justify-between gap-4 border-b border-[rgba(183,196,170,0.12)] pb-4">
            <div>
              <p className="terra-kicker">Worker enrollment</p>
              <h2 className="mt-1 text-2xl font-light text-[#f5f1e8]">
                {draft.step === 1 ? 'Worker details' : draft.step === 2 ? 'Identity verification' : draft.step === 3 ? 'Biometric consent' : draft.step === 4 ? 'Biometric enrollment' : 'Enrollment complete'}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] px-3 py-2 text-xs uppercase tracking-[0.25em] text-[#8d998b]">
              <BadgeCheck size={14} className="text-[#b7cc75]" />
              Persistent workflow
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {draft.step === 1 ? (
              <>
                <p className="text-sm text-[#8d998b]">Full name is required. Worksite must be selected from your organization.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Full name *</span>
                    <input value={draft.full_name} onChange={(event) => updateDraft({ full_name: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="Ravi Kumar" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Worker ID / code</span>
                    <input value={draft.worker_code} onChange={(event) => updateDraft({ worker_code: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="TW-W-0001" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Date of birth</span>
                    <input type="date" value={draft.date_of_birth} onChange={(event) => updateDraft({ date_of_birth: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Gender</span>
                    <select value={draft.gender} onChange={(event) => updateDraft({ gender: event.target.value as DraftState['gender'] })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45">
                      <option value="UNSPECIFIED">Unspecified</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Phone number</span>
                    <input value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="+91 98765 43210" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Address</span>
                    <textarea value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} rows={3} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="Village, district, state" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Emergency contact</span>
                    <input value={draft.emergency_contact} onChange={(event) => updateDraft({ emergency_contact: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="Relative name" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Role</span>
                    <input value={draft.role} onChange={(event) => updateDraft({ role: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="WORKER" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Worksite *</span>
                    <select value={draft.worksite_id} onChange={(event) => updateDraft({ worksite_id: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45">
                      <option value="">Select a worksite</option>
                      {worksites.map((site) => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : null}

            {draft.step === 2 ? (
              <>
                <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#a8b1a1]">
                  <p className="text-[#f5f1e8] font-medium">Identity information</p>
                  <p className="mt-1">This is a demo/manual verification flow. No external Aadhaar or government API is integrated here.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Identity type</span>
                    <select value={draft.identity_type} onChange={(event) => updateDraft({ identity_type: event.target.value as DraftState['identity_type'] })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45">
                      <option value="AADHAAR">Aadhaar</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Identity number</span>
                    <input value={draft.identity_number} onChange={(event) => updateDraft({ identity_number: event.target.value })} className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45" placeholder="XXXX XXXX 4821" />
                  </label>
                </div>
                <div className="flex items-center gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                  <button
                    type="button"
                    onClick={() => setIdentityVerified(true)}
                    className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs uppercase tracking-[0.22em] transition ${identityVerified ? 'border-[#b7cc75]/35 bg-[#141d14] text-[#dfeab1]' : 'border-[rgba(183,196,170,0.12)] bg-[#0f140f] text-[#f5f1e8]'}`}
                  >
                    <ShieldCheck size={14} /> Mark identity as verified
                  </button>
                  <span className="text-sm text-[#8d998b]">Status: {identityVerified ? 'Verified' : 'Pending'}</span>
                </div>
              </>
            ) : null}

            {draft.step === 3 ? (
              <>
                <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#a8b1a1] leading-relaxed">
                  <p className="text-[#f5f1e8] font-medium">Biometric consent</p>
                  <p className="mt-2">Terra Workforce uses biometric verification to help prevent attendance fraud and ensure attendance is associated with the correct worker.</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    <li>Face images/templates required for enrollment</li>
                    <li>Liveness verification data</li>
                    <li>Authorized supervisors and admins only</li>
                  </ul>
                </div>
                <label className="flex items-center gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-4 text-sm text-[#f5f1e8]">
                  <input type="checkbox" checked={draft.consent_given} onChange={(event) => updateDraft({ consent_given: event.target.checked })} />
                  <span>Worker has provided consent for biometric attendance.</span>
                </label>
              </>
            ) : null}

            {draft.step === 4 ? (
              <>
                <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0c110c] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#8d998b]">Biometric enrollment</p>
                    <h3 className="mt-2 text-xl font-light text-[#f5f1e8]">{(worker?.full_name ?? draft.full_name) || 'Worker'}</h3>
                    <p className="mt-1 text-sm text-[#a8b1a1]">Worker ID: {(worker?.worker_code ?? draft.worker_code) || 'Pending'}</p>
                    <div className="mt-4 space-y-2 text-sm text-[#a8b1a1]">
                      <p>Enrollment status: {worker?.biometric_enrollment_status ?? 'NOT_STARTED'}</p>
                      <p>Consent: {draft.consent_given ? 'Recorded' : 'Pending'}</p>
                      <p>Identity: {identityVerified ? 'Manual verification complete' : 'Pending review'}</p>
                    </div>
                  </div>
                  <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#8d998b]">Launch camera station</p>
                    <div className="mt-4 flex h-40 items-center justify-center rounded border border-dashed border-[rgba(183,196,170,0.12)] bg-[#0b100c] text-[#8d998b]">
                      <Camera size={42} className="text-[#b7cc75]" />
                    </div>
                    <p className="mt-3 text-sm text-[#a8b1a1]">Open the biometric enrollment route to capture center, left, right, neutral, smile, and liveness samples.</p>
                  </div>
                </div>
              </>
            ) : null}

            {draft.step === 5 ? (
              <>
                <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8d998b]">Enrollment complete</p>
                  <h3 className="mt-2 text-2xl font-light text-[#f5f1e8]">{worker?.full_name ?? draft.full_name}</h3>
                  <div className="mt-4 grid gap-3 text-sm text-[#a8b1a1] md:grid-cols-2">
                    <p>Worker ID: {(worker?.worker_code ?? draft.worker_code) || 'TW-W-0001'}</p>
                    <p>Identity: {identityVerified ? 'Verified / Manual verification' : 'Pending'}</p>
                    <p>Consent: {draft.consent_given ? 'Recorded' : 'Pending'}</p>
                    <p>Biometric enrollment: {worker?.biometric_enrollment_status ?? 'NOT_STARTED'}</p>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(183,196,170,0.12)] pt-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={cancelWizard} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]">Cancel</button>
                {draft.step > 1 ? (
                  <button
                    type="button"
                    onClick={() => updateDraft({ step: draft.step - 1 })}
                    className="inline-flex items-center gap-2 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {draft.step === 1 ? (
                  <button type="button" onClick={handleStepOne} disabled={isSaving || isLoading} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Continue <ArrowRight size={14} /></button>
                ) : null}
                {draft.step === 2 ? (
                  <button type="button" onClick={handleIdentityVerification} disabled={isSaving} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Continue <ArrowRight size={14} /></button>
                ) : null}
                {draft.step === 3 ? (
                  <button type="button" onClick={handleConsent} disabled={isSaving} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Continue <ArrowRight size={14} /></button>
                ) : null}
                {draft.step === 4 ? (
                  <>
                    <button type="button" onClick={beginBiometricEnrollment} disabled={enrollmentLoading || !worker} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Open biometric station <ArrowRight size={14} /></button>
                    <button type="button" onClick={() => updateDraft({ step: 5 })} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#141a14]">Skip preview</button>
                  </>
                ) : null}
                {draft.step === 5 ? (
                  <button type="button" onClick={finishWizard} disabled={isSaving || !worker} className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-sm text-[#dfeab1] transition hover:bg-[#1a261a] disabled:opacity-60">Finish <CheckCircle2 size={14} /></button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[#8d998b]">Current record</p>
            <div className="mt-3 space-y-2 text-sm text-[#a8b1a1]">
              <p><span className="text-[#f5f1e8]">Worker:</span> {(worker?.full_name ?? draft.full_name) || '—'}</p>
              <p><span className="text-[#f5f1e8]">Worker ID:</span> {(worker?.worker_code ?? draft.worker_code) || '—'}</p>
              <p><span className="text-[#f5f1e8]">Worksite:</span> {currentWorksite?.name ?? '—'}</p>
              <p><span className="text-[#f5f1e8]">Identity:</span> {worker?.identity_verification_status ?? (identityVerified ? 'VERIFIED' : 'PENDING')}</p>
              <p><span className="text-[#f5f1e8]">Consent:</span> {draft.consent_given ? 'Recorded' : 'Pending'}</p>
            </div>
          </div>

          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
            <div className="flex items-center gap-2 text-[#dfeab1]"><UserRound size={16} className="text-[#b7cc75]" /> Enrollment checklist</div>
            <ul className="mt-4 space-y-2 text-sm text-[#a8b1a1]">
              <li>01 Worker details</li>
              <li>02 Identity information</li>
              <li>03 Biometric consent</li>
              <li>04 Biometric station</li>
              <li>05 Complete and activate</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
