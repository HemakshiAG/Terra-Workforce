'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization_name: '',
    admin_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail ?? 'Unable to create your workspace.');
      }

      setSuccess('Workspace created. Redirecting to sign in…');
      setTimeout(() => router.push('/login'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your workspace.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="relative overflow-hidden rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-6 lg:p-8">
          <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464226184884-fa52ac9a4a98?auto=format&fit=crop&w=1200&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f0c] via-[#0b0f0c]/40 to-[#0b0f0c]/10" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#dfeab1]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#b7cc75]" />
              terra workforce
            </div>

            <div className="max-w-md">
              <p className="terra-kicker">Professional accountability</p>
              <h1 className="mt-4 text-4xl font-light tracking-[-0.06em] text-[#f5f1e8] md:text-5xl">
                Create your workspace.
              </h1>
              <p className="mt-4 text-base leading-7 text-[#c5cdb9]">
                Launch a secure workspace for your organization, supervisors, and workforce operations.
              </p>
            </div>

            <div className="rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f]/70 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-[#dfeab1]">
                <CheckCircle2 size={18} className="text-[#b7cc75]" />
                <span className="text-sm">Create the admin account and secure the organization workspace.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/90 p-6 lg:p-8">
          <div className="flex items-center gap-2 text-[#dfeab1]">
            <ShieldCheck size={16} className="text-[#b7cc75]" />
            <span className="text-[11px] uppercase tracking-[0.38em]">Create workspace</span>
          </div>

          <h2 className="mt-5 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">Set up your organization.</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Organization name</span>
              <input
                value={form.organization_name}
                onChange={(event) => setForm((current) => ({ ...current, organization_name: event.target.value }))}
                className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                placeholder="Green Valley Farms"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Your name</span>
                <input
                  value={form.admin_name}
                  onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                  placeholder="Test Admin"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Phone (optional)</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                  placeholder="+91 98765 43210"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Email</span>
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                placeholder="admin@workspace.com"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Password</span>
                <input
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  type="password"
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                  placeholder="••••••••"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Confirm password</span>
                <input
                  value={form.confirm_password}
                  onChange={(event) => setForm((current) => ({ ...current, confirm_password: event.target.value }))}
                  type="password"
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                  placeholder="••••••••"
                  required
                />
              </label>
            </div>

            {error ? <p className="text-sm text-[#f39d7b]">{error}</p> : null}
            {success ? <p className="text-sm text-[#dfeab1]">{success}</p> : null}

            <button type="submit" disabled={isSubmitting} className="terra-btn w-full justify-center">
              {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
              <ArrowRight size={16} className="ml-2" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-[#b8c0b0]">
            <span>Already have an account?</span>
            <Link href="/login" className="text-[#dfeab1] transition hover:text-[#f5f1e8]">Sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
