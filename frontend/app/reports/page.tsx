import { AppShell } from '@/components/app-shell';

export default function ReportsPage() {
  return (
    <AppShell title="Reports" subtitle="Operational and integrity reporting for supervisors and admins.">
      <div className="rounded border border-[#243124] bg-[#081209] p-5">
        <p className="text-sm text-mist/70">Attendance trends, wage summaries, and integrity indicators are surfaced here with offline-safe summaries that remain available when the connection drops.</p>
      </div>
    </AppShell>
  );
}
