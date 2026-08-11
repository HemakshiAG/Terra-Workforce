import Link from 'next/link';
import { ArrowRight, ScanLine, ShieldCheck, WifiOff } from 'lucide-react';

const metrics = [
  { label: 'Recognition confidence', value: '94.8% demo' },
  { label: 'Offline availability', value: '100% local' },
  { label: 'Verification speed', value: '< 8s' },
  { label: 'Auditability', value: 'Append-only' },
];

const features = [
  'Offline-first attendance with queued sync',
  'Local liveness and face-quality checks',
  'GPS geofence validation and manual review',
  'Transparent wage and integrity reporting',
];

const workflow = [
  { title: 'Capture', detail: 'Face quality and liveness checks happen before any attendance decision.' },
  { title: 'Review', detail: 'Low-confidence and geofence events route to a supervisor queue.' },
  { title: 'Sync', detail: 'Records remain local first and sync once the connection is restored.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-night text-mist">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
        <nav className="flex items-center justify-between border border-[#243124] bg-[#07110a]/80 px-6 py-4">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-mist/80">
            <div className="h-2 w-2 rounded-full bg-lime" />
            terra.
          </div>
          <div className="hidden items-center gap-8 text-sm text-mist/70 md:flex">
            <a href="#platform" className="hover:text-lime">Platform</a>
            <a href="#integrity" className="hover:text-lime">Integrity</a>
            <a href="#about" className="hover:text-lime">About</a>
          </div>
          <Link href="/dashboard" className="rounded border border-[#3b4b33] bg-[#0e1a11] px-4 py-2 text-sm text-lime transition hover:bg-[#132116]">
            Launch Dashboard <span className="ml-2">→</span>
          </Link>
        </nav>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]" id="platform">
          <div className="rounded border border-[#243124] bg-[#07110a]/90 p-8 lg:p-12">
            <p className="text-xs uppercase tracking-[0.4em] text-lime">AI FOR FAIRER WORK</p>
            <h1 className="mt-6 text-5xl font-light leading-[0.95] sm:text-6xl lg:text-7xl">
              Every worker.<br />
              Every day.<br />
              <span className="italic text-[#dce8a4]">Verified.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-mist/70">
              Offline-first attendance intelligence for rural worksites — built to verify workers, prevent proxy attendance, and keep wage records transparent.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/attendance" className="flex items-center gap-2 rounded border border-lime/40 bg-lime/15 px-5 py-3 text-sm font-medium text-lime transition hover:bg-lime/20">
                Launch Platform <ArrowRight size={16} />
              </Link>
              <a href="#integrity" className="rounded border border-[#243124] px-5 py-3 text-sm text-mist/70 transition hover:text-mist">
                See how it works
              </a>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded border border-[#1d2b1e] bg-[#081209] p-3 text-sm text-mist/70">
                  <ShieldCheck size={16} className="mt-0.5 text-lime" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded border border-[#243124] bg-[#081209] p-6">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050b07] to-transparent" />
            <div className="relative flex h-full min-h-[520px] flex-col justify-between">
              <div className="flex items-center justify-between rounded border border-[#28402a] bg-[#081209]/70 px-4 py-3 text-sm text-mist/80 backdrop-blur">
                <span className="flex items-center gap-2"><ScanLine size={16} className="text-lime" /> Verification overlay</span>
                <span className="flex items-center gap-2 text-lime"><WifiOff size={14} /> Offline ready</span>
              </div>
              <div className="space-y-3 rounded border border-[#28402a] bg-[#081209]/80 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-lime">Worker Verified</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-medium text-mist">Ravi Kumar</p>
                    <p className="text-sm text-mist/60">98.7% match · Liveness passed</p>
                  </div>
                  <div className="rounded border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime">On site</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded border border-[#243124] bg-[#07110a]/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-mist/45">{metric.label}</p>
              <p className="mt-3 text-xl text-mist">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.8fr]" id="integrity">
          <div className="rounded border border-[#243124] bg-[#07110a]/90 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-lime">Workflow</p>
            <h2 className="mt-2 text-2xl text-mist">From capture to synchronized audit trail</h2>
            <div className="mt-6 grid gap-3">
              {workflow.map((item) => (
                <div key={item.title} className="rounded border border-[#243124] bg-[#081209] p-4">
                  <p className="text-lg text-mist">{item.title}</p>
                  <p className="mt-1 text-sm text-mist/65">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-[#243124] bg-[#081209] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-lime">Integrity preview</p>
            <div className="mt-4 space-y-3">
              <div className="rounded border border-[#243124] bg-[#07110a] p-4">
                <p className="text-mist">LOW CONFIDENCE MATCH</p>
                <p className="mt-1 text-sm text-mist/65">Ravi Kumar · 89.2% · 2 minutes ago</p>
              </div>
              <div className="rounded border border-[#243124] bg-[#07110a] p-4">
                <p className="text-mist">GEOFENCE VIOLATION</p>
                <p className="mt-1 text-sm text-mist/65">Worker ID W-104 · Outside worksite by 430m</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
