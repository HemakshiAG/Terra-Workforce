'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Activity, BadgeCheck, Camera, FileText, Home, MapPinned, MonitorCheck, ScrollText, Settings, ShieldCheck, Users, Wallet, Wifi } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/attendance', label: 'Attendance', icon: Camera },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/worksites', label: 'Worksites', icon: MapPinned },
  { href: '/integrity', label: 'Integrity', icon: ShieldCheck },
  { href: '/wages', label: 'Wages', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/audit', label: 'Audit', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-night text-mist">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row lg:px-10">
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

        <section className="flex-1 rounded border border-[#243124] bg-[#07110a]/90 p-6">
          <div className="flex flex-col gap-4 border-b border-[#243124] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-lime">Terra Workforce</p>
              <h1 className="mt-2 text-3xl font-light text-mist">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-mist/65">{subtitle}</p> : null}
            </div>
            <div className="rounded border border-[#243124] bg-[#081209] px-4 py-3 text-sm text-mist/70">
              <div className="flex items-center gap-2 text-lime"><MonitorCheck size={14} /> Offline state</div>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-mist/45">12 records waiting to sync</p>
            </div>
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
