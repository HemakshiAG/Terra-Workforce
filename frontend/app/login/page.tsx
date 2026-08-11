'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? 'Email or password is incorrect.');
      }

      const token = data.token;
      const role = (data.role ?? 'ADMIN').toUpperCase();
      localStorage.setItem('terra-session-token', token);
      localStorage.setItem('terra-workforce-token', token);
      localStorage.setItem('terra-workforce-role', role);
      localStorage.setItem('terra-workforce-user', data.user?.email ?? email);

      router.push(role === 'WORKER' ? '/worker' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email or password is incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="relative overflow-hidden rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-6 lg:p-8">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f0c] via-[#0b0f0c]/35 to-[#0b0f0c]/10" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#dfeab1]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#b7cc75]" />
              terra workforce
            </div>

            <div className="max-w-md">
              <p className="terra-kicker">Secure operations</p>
              <h1 className="mt-4 text-4xl font-light tracking-[-0.06em] text-[#f5f1e8] md:text-5xl">
                Work starts here.
              </h1>
              <p className="mt-4 text-base leading-7 text-[#c5cdb9]">
                Secure workforce attendance for the people who keep the field moving.
              </p>
            </div>

            <div className="rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f]/70 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-[#dfeab1]">
                <CheckCircle2 size={18} className="text-[#b7cc75]" />
                <span className="text-sm">Role-based access and protected workspace data.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/90 p-6 lg:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[#dfeab1]">
            <ShieldCheck size={16} className="text-[#b7cc75]" />
            <span className="text-[11px] uppercase tracking-[0.38em]">Sign in</span>
          </div>

          <h2 className="mt-5 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">Welcome back.</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                placeholder="name@company.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2.5 text-[#f5f1e8] outline-none transition focus:border-[#b7cc75]/45"
                placeholder="••••••••"
                required
              />
            </label>

            {error ? <p className="text-sm text-[#f39d7b]">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="terra-btn w-full justify-center"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              <ArrowRight size={16} className="ml-2" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-[#b8c0b0]">
            <span>New organization?</span>
            <Link href="/register" className="text-[#dfeab1] transition hover:text-[#f5f1e8]">Create one</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
