'use client';

import { AppShell } from '@/components/app-shell';
import { Clock, Wallet, CheckCircle, ShieldX } from 'lucide-react';

export default function WorkerPortalPage() {
  return (
    <AppShell
      title="My Work"
      subtitle="Personal attendance, hours, wage estimates, and biometric enrollment status."
      allowedRoles={['WORKER']}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
          <div className="flex items-center justify-between text-[#8d998b]">
            <span className="text-[10px] uppercase tracking-[0.3em]">Attendance</span>
            <CheckCircle size={16} className="text-[#b7cc75]" />
          </div>
          <p className="mt-4 text-2xl font-light text-[#f5f1e8]">0</p>
          <p className="mt-2 text-xs text-[#8d998b]">No attendance records yet.</p>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
          <div className="flex items-center justify-between text-[#8d998b]">
            <span className="text-[10px] uppercase tracking-[0.3em]">Hours</span>
            <Clock size={16} className="text-[#b7cc75]" />
          </div>
          <p className="mt-4 text-2xl font-light text-[#f5f1e8]">0h</p>
          <p className="mt-2 text-xs text-[#8d998b]">No hours recorded yet.</p>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
          <div className="flex items-center justify-between text-[#8d998b]">
            <span className="text-[10px] uppercase tracking-[0.3em]">Estimated Wages</span>
            <Wallet size={16} className="text-[#b7cc75]" />
          </div>
          <p className="mt-4 text-2xl font-light text-[#f5f1e8]">₹0</p>
          <p className="mt-2 text-xs text-[#8d998b]">No wage records yet.</p>
        </div>

        <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4">
          <div className="flex items-center justify-between text-[#8d998b]">
            <span className="text-[10px] uppercase tracking-[0.3em]">Biometrics</span>
            <ShieldX size={16} className="text-[#8d998b]" />
          </div>
          <p className="mt-4 text-xl font-light text-[#f5f1e8]">Not Enrolled</p>
          <p className="mt-2 text-xs text-[#8d998b]">Biometric template not registered.</p>
        </div>
      </div>

      <div className="mt-6 rounded border border-dashed border-[rgba(183,196,170,0.18)] bg-[#0c110c] p-6 text-sm text-[#8d998b]">
        <h3 className="text-base font-medium text-[#f5f1e8]">Worker Activity Stream</h3>
        <p className="mt-2 text-sm text-[#a8b1a1] leading-relaxed">
          Welcome to your personal work portal. Once your biometric enrollment is completed by your worksite supervisor and daily attendance is verified, your working hours and estimated wages will appear here automatically.
        </p>
      </div>
    </AppShell>
  );
}
