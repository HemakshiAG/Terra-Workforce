'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 mb-4">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-2xl font-light tracking-[-0.04em] text-[#f5f1e8]">403 — Access Denied</h1>
        <p className="mt-3 text-sm text-[#a8b1a1] leading-relaxed">
          You do not have permission to access this section. Please contact your workspace administrator if you believe this is an error.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded border border-[rgba(183,196,170,0.18)] bg-[#101610] px-4 py-2.5 text-sm text-[#dfeab1] transition hover:bg-[#151f15] hover:text-[#f5f1e8]"
          >
            <ArrowLeft size={16} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
