import { AppShell } from '@/components/app-shell';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const alerts = [
  { title: 'Low confidence match', detail: 'Ravi Kumar · 89.2% · 2 minutes ago', severity: 'review' },
  { title: 'Geofence violation', detail: 'Worker ID W-104 · Outside worksite by 430m', severity: 'critical' },
  { title: 'Duplicate identity', detail: 'Enrollment attempt matched an existing worker template', severity: 'review' },
];

export default function IntegrityPage() {
  return (
    <AppShell title="Workforce Integrity" subtitle="Review queue, suspicious attempts, and correction trail.">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Critical</p>
          <p className="mt-3 text-3xl font-light text-mist">2</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Review</p>
          <p className="mt-3 text-3xl font-light text-mist">4</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Suspicious attempts</p>
          <p className="mt-3 text-3xl font-light text-mist">7</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Corrections</p>
          <p className="mt-3 text-3xl font-light text-mist">3</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {alerts.map((alert) => (
          <div key={alert.title} className="flex flex-col gap-3 rounded border border-[#243124] bg-[#081209] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-1 rounded p-2 ${alert.severity === 'critical' ? 'bg-[#2d1d1d] text-[#f08e72]' : 'bg-[#1a2217] text-lime'}`}>
                {alert.severity === 'critical' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
              </div>
              <div>
                <p className="text-lg text-mist">{alert.title}</p>
                <p className="mt-1 text-sm text-mist/65">{alert.detail}</p>
              </div>
            </div>
            <div className="rounded border border-[#243124] px-3 py-2 text-sm text-mist/70">Review</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
