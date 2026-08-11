import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, BadgeCheck, Camera, CheckCircle2, ChevronRight, Clock3, MapPin, MonitorCheck, ScanLine, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export function SidebarNav({ pathname }: { pathname: string }) {
  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Activity },
    { href: '/attendance', label: 'Attendance', icon: Camera },
    { href: '/workers', label: 'Workers', icon: BadgeCheck },
    { href: '/worksites', label: 'Worksites', icon: MapPin },
    { href: '/integrity', label: 'Integrity', icon: ShieldCheck },
    { href: '/wages', label: 'Wages', icon: Clock3 },
    { href: '/reports', label: 'Reports', icon: MonitorCheck },
    { href: '/audit', label: 'Audit', icon: AlertTriangle },
    { href: '/settings', label: 'Settings', icon: ShieldCheck },
  ];

  return (
    <aside className="w-full shrink-0 rounded border border-[#243124] bg-[#07110a]/90 p-5 lg:w-64">
      <Link href="/" className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-lime">
        <BadgeCheck size={16} />
        terra.
      </Link>
      <nav className="mt-8 space-y-2 text-sm text-mist/70">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded border px-3 py-2 transition ${active ? 'border-lime/40 bg-[#0d180f] text-mist' : 'border-transparent hover:border-[#2c3b2a] hover:bg-[#0c170f] hover:text-mist'}`}>
              <Icon size={16} className={active ? 'text-lime' : 'text-mist/60'} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 rounded border border-[#243124] bg-[#081209] p-3 text-sm text-mist/70">
        <div className="flex items-center gap-2 text-lime">
          <Wifi size={14} /> Online
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-mist/45">Core features available</p>
      </div>
    </aside>
  );
}

export function Topbar({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#243124] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-lime">Terra Workforce</p>
        <h1 className="mt-2 text-3xl font-light text-mist">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-mist/65">{subtitle}</p> : null}
      </div>
      {badge ? (
        <div className="rounded border border-[#243124] bg-[#081209] px-4 py-3 text-sm text-mist/70">
          <div className="flex items-center gap-2 text-lime"><MonitorCheck size={14} /> {badge}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#243124] bg-[#07110a]/80 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-mist/45">{label}</p>
      <p className="mt-3 text-xl text-mist">{value}</p>
    </div>
  );
}

export function StatusBadge({ tone, label }: { tone: 'lime' | 'amber' | 'slate'; label: string }) {
  const tones = {
    lime: 'border-lime/30 bg-lime/10 text-lime',
    amber: 'border-[#4f3c16] bg-[#241909] text-[#f6c76e]',
    slate: 'border-[#243124] bg-[#081209] text-mist/70',
  };

  return <div className={`inline-flex items-center rounded border px-3 py-2 text-sm ${tones[tone]}`}>{label}</div>;
}

export function VerificationCard({ outcome, title, detail, meta }: { outcome: 'accepted' | 'review' | 'failed'; title: string; detail: string; meta: string }) {
  const base = outcome === 'accepted' ? 'border-lime/30 bg-[#0c1a11] text-lime' : outcome === 'review' ? 'border-[#4f3c16] bg-[#241909] text-[#f6c76e]' : 'border-[#4b2525] bg-[#1f1313] text-[#f08e72]';
  return (
    <div className={`rounded border p-5 ${base}`}>
      <div className="flex items-center gap-3">
        {outcome === 'accepted' ? <CheckCircle2 size={18} /> : outcome === 'review' ? <AlertTriangle size={18} /> : <AlertTriangle size={18} />}
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">{title}</p>
          <p className="mt-1 text-lg text-mist">{detail}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-mist/70">{meta}</p>
    </div>
  );
}

export function AttendanceTable({ rows }: { rows: Array<{ name: string; state: string; time: string; confidence?: string }> }) {
  return (
    <div className="overflow-hidden rounded border border-[#243124] bg-[#081209]">
      <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr] border-b border-[#243124] bg-[#07110a] px-4 py-3 text-xs uppercase tracking-[0.3em] text-mist/45">
        <span>Worker</span>
        <span>Status</span>
        <span>Time</span>
      </div>
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[1.2fr_0.8fr_0.5fr] items-center border-b border-[#1a241d] px-4 py-3 text-sm last:border-b-0">
          <div>
            <p className="text-mist">{row.name}</p>
            {row.confidence ? <p className="text-xs text-mist/55">{row.confidence}</p> : null}
          </div>
          <span className="text-mist/70">{row.state}</span>
          <span className="text-mist/60">{row.time}</span>
        </div>
      ))}
    </div>
  );
}

export function AlertCard({ title, detail, tone }: { title: string; detail: string; tone: 'review' | 'critical' }) {
  return (
    <div className={`rounded border p-4 ${tone === 'critical' ? 'border-[#4b2525] bg-[#1f1313]' : 'border-[#243124] bg-[#081209]'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 rounded p-2 ${tone === 'critical' ? 'bg-[#2d1d1d] text-[#f08e72]' : 'bg-[#1a2217] text-lime'}`}>
          <AlertTriangle size={16} />
        </div>
        <div>
          <p className="text-lg text-mist">{title}</p>
          <p className="mt-1 text-sm text-mist/65">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-[#243124] bg-[#081209] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-lime">{title}</p>
          <h2 className="mt-1 text-xl text-mist">{subtitle}</h2>
        </div>
        <StatusBadge tone="slate" label="Offline aware" />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function CameraPanel({ title, status, detail, showScan = false }: { title: string; status: string; detail: string; showScan?: boolean }) {
  return (
    <div className="rounded border border-[#243124] bg-[#081209] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-lime">Verification station</p>
          <h2 className="mt-1 text-xl text-mist">{title}</h2>
        </div>
        <StatusBadge tone="lime" label={status} />
      </div>
      <div className="mt-4 flex min-h-[360px] items-center justify-center rounded border border-[#243124] bg-[#050b07] p-4">
        <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-lime/30 bg-[#081209]">
          {showScan ? <div className="absolute inset-0 overflow-hidden rounded-full"><div className="h-1/4 w-full animate-pulse bg-gradient-to-b from-lime/20 to-transparent" /></div> : null}
          <div className="absolute inset-4 rounded-full border border-dashed border-lime/20" />
          <Camera size={56} className="text-lime/70" />
        </div>
      </div>
      <p className="mt-4 text-sm text-mist/70">{detail}</p>
    </div>
  );
}

export function OfflineIndicator({ state }: { state: 'online' | 'offline' | 'reconnecting' | 'synced' }) {
  const content = {
    online: { label: 'Online', detail: 'Core features available', icon: Wifi },
    offline: { label: 'Offline', detail: '12 records waiting to sync', icon: WifiOff },
    reconnecting: { label: 'Connection restored', detail: 'Syncing 12 records...', icon: ScanLine },
    synced: { label: 'All records synchronized', detail: 'Offline queue cleared', icon: CheckCircle2 },
  };
  const current = content[state];
  const Icon = current.icon;
  return (
    <div className="rounded border border-[#243124] bg-[#081209] px-4 py-3 text-sm text-mist/70">
      <div className="flex items-center gap-2 text-lime"><Icon size={14} /> {current.label}</div>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-mist/45">{current.detail}</p>
    </div>
  );
}
