import { AppShell } from '@/components/app-shell';
import { AlertTriangle, Clock3, ShieldCheck, Wifi } from 'lucide-react';

const cards = [
  { title: 'Worksite', value: 'Green Valley', detail: '42m from center • active' },
  { title: 'Attendance', value: '18', detail: '12 present • 6 review' },
  { title: 'Workers present', value: '24', detail: '2 pending sync' },
  { title: 'Estimated wages', value: '₹84,320', detail: 'Updated offline' },
];

const alerts = [
  { title: 'Low confidence match', reason: 'Ravi Kumar reached 89.2% confidence and requires review' },
  { title: 'Geofence boundary breach', reason: 'Worker ID W-104 was detected 430m outside the worksite' },
];

export default function DashboardPage() {
  return (
    <AppShell title="Good morning, Ananya." subtitle="Here’s what’s happening at your worksite today.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded border border-[#243124] bg-[#081209] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">{card.title}</p>
            <p className="mt-4 text-3xl font-light text-mist">{card.value}</p>
            <p className="mt-2 text-sm text-mist/60">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded border border-[#243124] bg-[#081209] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-lime">Attendance pulse</p>
              <h2 className="mt-1 text-xl text-mist">Live verification stream</h2>
            </div>
            <div className="rounded border border-lime/20 bg-lime/10 px-3 py-2 text-sm text-lime">Offline aware</div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { name: 'Ravi Kumar', state: 'Accepted', time: '09:04' },
              { name: 'Asha Devi', state: 'Manual review', time: '09:02' },
              { name: 'Nirmal Singh', state: 'Liveness failed', time: '08:58' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded border border-[#243124] bg-[#07110a] px-3 py-3 text-sm">
                <div>
                  <p className="text-mist">{item.name}</p>
                  <p className="text-mist/55">{item.state}</p>
                </div>
                <span className="text-mist/60">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[#243124] bg-[#081209] p-5">
            <div className="flex items-center gap-2 text-lime"><AlertTriangle size={16} /> Integrity alerts</div>
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded border border-[#243124] bg-[#07110a] p-3 text-sm text-mist/70">
                  <p className="font-medium text-mist">{alert.title}</p>
                  <p className="mt-1">{alert.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-[#243124] bg-[#081209] p-5">
            <div className="flex items-center gap-2 text-lime"><Clock3 size={16} /> Wage estimate</div>
            <p className="mt-4 text-3xl font-light text-mist">₹84,320</p>
            <p className="mt-2 text-sm text-mist/60">Based on current verified sessions and local rules.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
