import { AppShell } from '@/components/app-shell';

export default function AuditPage() {
  return (
    <AppShell title="Audit" subtitle="Append-only review trail for every attendance and correction event.">
      <div className="space-y-3">
        {[
          { event: 'Attendance created', actor: 'Supervisor Ananya', time: '09:04' },
          { event: 'Manual correction applied', actor: 'Admin Rahul', time: '10:12' },
          { event: 'Sync queued', actor: 'Device 04', time: '10:18' },
        ].map((item) => (
          <div key={item.event} className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">
            <p className="text-mist">{item.event}</p>
            <p className="mt-1">{item.actor} · {item.time}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
