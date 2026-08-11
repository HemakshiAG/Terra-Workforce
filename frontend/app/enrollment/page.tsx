'use client';

import { AppShell } from '@/components/app-shell';
import { Camera, CheckCircle2, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export default function EnrollmentPage() {
  const [form, setForm] = useState({
    worker_id: 'W-205',
    name: 'Leela Nair',
    worksite_id: 'WS-001',
    latitude: '12.9716',
    longitude: '77.5946',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('terra-workforce-token');
      const response = await fetch(`${API_BASE_URL}/api/workers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          worker_id: form.worker_id,
          name: form.name,
          worksite_id: form.worksite_id,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail ?? 'Unable to register worker.');
      }

      setSuccess(`Worker ${form.worker_id} was registered successfully.`);
      setForm({
        worker_id: '',
        name: '',
        worksite_id: form.worksite_id,
        latitude: form.latitude,
        longitude: form.longitude,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register worker.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Enrollment" subtitle="Professional biometric enrollment with consent, quality checks, and duplicate detection.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded border border-[#243124] bg-[#081209] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-lime">Capture station</p>
              <h2 className="mt-1 text-xl text-mist">Multi-angle face capture</h2>
            </div>
            <div className="rounded border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime">Ready</div>
          </div>
          <div className="mt-4 flex min-h-[360px] items-center justify-center rounded border border-[#243124] bg-[#050b07]">
            <div className="flex h-64 w-64 items-center justify-center rounded-full border border-lime/30 bg-[#081209]">
              <Camera size={56} className="text-lime/70" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[#243124] bg-[#081209] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-lime">Workflow</p>
            <div className="mt-4 space-y-3 text-sm text-mist/70">
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><UserRound size={16} className="text-lime" /> Worker details</div>
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><Camera size={16} className="text-lime" /> Capture face samples</div>
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><CheckCircle2 size={16} className="text-lime" /> Consent and confirmation</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded border border-[#243124] bg-[#081209] p-5 text-sm text-mist/70">
            <p className="text-xs uppercase tracking-[0.3em] text-lime">Register worker</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist/45">Worker ID</span>
                <input value={form.worker_id} onChange={(event) => setForm((current) => ({ ...current, worker_id: event.target.value }))} className="w-full rounded border border-[#243124] bg-[#07110a] px-3 py-2 text-mist outline-none focus:border-lime/60" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist/45">Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-[#243124] bg-[#07110a] px-3 py-2 text-mist outline-none focus:border-lime/60" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist/45">Worksite ID</span>
                <input value={form.worksite_id} onChange={(event) => setForm((current) => ({ ...current, worksite_id: event.target.value }))} className="w-full rounded border border-[#243124] bg-[#07110a] px-3 py-2 text-mist outline-none focus:border-lime/60" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist/45">Latitude</span>
                  <input value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} className="w-full rounded border border-[#243124] bg-[#07110a] px-3 py-2 text-mist outline-none focus:border-lime/60" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist/45">Longitude</span>
                  <input value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} className="w-full rounded border border-[#243124] bg-[#07110a] px-3 py-2 text-mist outline-none focus:border-lime/60" />
                </label>
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
            {success ? <p className="mt-4 text-sm text-lime">{success}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime transition hover:bg-lime/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Registering...' : 'Register worker'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
