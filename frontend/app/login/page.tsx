import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-6 py-12 text-mist">
      <div className="w-full max-w-2xl rounded border border-[#243124] bg-[#07110a]/90 p-8 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-lime">
          <ShieldCheck size={16} /> terra workforce
        </div>
        <h1 className="mt-6 text-4xl font-light text-mist">Secure sign-in</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-mist/70">Access the offline-first attendance platform with role-based controls and audit resilience.</p>
        <div className="mt-8 rounded border border-[#243124] bg-[#081209] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-[#243124] bg-[#07110a] p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Demo credentials</p>
              <p className="mt-3 text-sm text-mist/70">Username: ananya</p>
              <p className="mt-1 text-sm text-mist/70">Password: terra-2026</p>
            </div>
            <div className="rounded border border-[#243124] bg-[#07110a] p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Role access</p>
              <p className="mt-3 text-sm text-mist/70">Supervisor and admin workflows available.</p>
            </div>
          </div>
          <Link href="/dashboard" className="mt-6 inline-flex items-center rounded border border-lime/40 bg-lime/15 px-4 py-2 text-sm text-lime transition hover:bg-lime/20">Launch platform</Link>
        </div>
      </div>
    </main>
  );
}
