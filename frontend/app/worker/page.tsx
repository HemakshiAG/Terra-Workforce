import { AppShell } from '@/components/app-shell';

export default function WorkerPortalPage() {
  return (
    <AppShell title="My work record" subtitle="A worker-focused view of attendance, hours, wage estimate, and corrections.">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Attendance</p>
          <p className="mt-3 text-3xl font-light text-mist">12</p>
          <p className="mt-2 text-sm text-mist/60">Verified sessions this month</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Hours</p>
          <p className="mt-3 text-3xl font-light text-mist">96h</p>
          <p className="mt-2 text-sm text-mist/60">Current payable hours</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Wage estimate</p>
          <p className="mt-3 text-3xl font-light text-mist">₹14,400</p>
          <p className="mt-2 text-sm text-mist/60">Based on local wage rules</p>
        </div>
      </div>
    </AppShell>
  );
}
