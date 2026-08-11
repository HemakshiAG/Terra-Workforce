import Link from 'next/link';
import { ArrowRight, Check, CircleArrowRight, CreditCard, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';

const metrics = [
  { label: 'Recognition confidence', value: '98%+', note: 'prototype benchmark' },
  { label: 'Offline operation', value: '24/7', note: 'local-first' },
  { label: 'Local verification', value: '<1 sec', note: 'edge-ready' },
  { label: 'Auditable changes', value: '100%', note: 'append-only' },
];

const features = [
  { title: 'Face Verification', detail: 'Trusted identity checks before attendance is accepted.' },
  { title: 'Liveness Protection', detail: 'Blocks spoofed or proxy attendance attempts on site.' },
  { title: 'Offline Attendance', detail: 'Records remain usable and sync when the signal returns.' },
  { title: 'Worksite Intelligence', detail: 'Matches workers to geofence and field operating rules.' },
  { title: 'Wage Transparency', detail: 'Turns verified hours into clear, auditable wage summaries.' },
  { title: 'Integrity Alerts', detail: 'Surfaces low-confidence and out-of-bounds events quickly.' },
];

const workflow = [
  'Worker arrives',
  'Face detected',
  'Liveness checked',
  'Location verified',
  'Attendance recorded',
  'Sync later',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0f0c] text-[#f5f1e8]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        <nav className="flex items-center justify-between rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/80 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#dfeab1]">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#b7cc75]" />
            terra.
          </div>

          <div className="hidden items-center gap-8 text-sm text-[#b8c0b0] md:flex">
            <a href="#platform" className="transition hover:text-[#f5f1e8]">Home</a>
            <a href="#platform" className="transition hover:text-[#f5f1e8]">Platform</a>
            <a href="#how-it-works" className="transition hover:text-[#f5f1e8]">How it works</a>
            <a href="#integrity" className="transition hover:text-[#f5f1e8]">Integrity</a>
            <a href="#resources" className="transition hover:text-[#f5f1e8]">Resources</a>
            <a href="#about" className="transition hover:text-[#f5f1e8]">About</a>
          </div>

          <Link href="/dashboard" className="terra-btn">
            Launch Dashboard <ArrowRight size={16} className="ml-2" />
          </Link>
        </nav>

        <section id="platform" className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="terra-panel p-7 lg:p-12">
            <p className="terra-kicker">AI FOR FAIRER WORK</p>
            <h1 className="mt-6 max-w-[680px] text-5xl font-light leading-[0.92] tracking-[-0.07em] text-[#f5f1e8] sm:text-6xl lg:text-[6rem]">
              Every worker.<br />
              Every day.<br />
              <span className="italic text-[#dfeab1]">Verified.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#b8c0b0]">
              Offline-first attendance intelligence for rural worksites — built to verify workers, prevent proxy attendance, and keep wage records transparent.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/attendance" className="terra-btn">
                Launch Platform <ArrowRight size={16} className="ml-2" />
              </Link>
              <a href="#how-it-works" className="terra-btn-ghost">
                See how it works
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {['Offline-first attendance with queued sync', 'Local liveness and face-quality checks', 'GPS geofence validation and manual review', 'Transparent wage and integrity reporting'].map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-3 text-sm leading-6 text-[#b8c0b0]">
                  <ShieldCheck size={16} className="mt-1 shrink-0 text-[#b7cc75]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded border border-[rgba(183,196,170,0.12)] bg-[#0d120e] p-4">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-65"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d120e] via-[#0d120e]/30 to-[#0d120e]/20" />

            <div className="relative flex min-h-[540px] flex-col justify-between">
              <div className="flex items-center justify-between rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f]/75 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#dfeab1] backdrop-blur-sm">
                <span className="flex items-center gap-2"><Sparkles size={14} className="text-[#b7cc75]" /> Verification overlay</span>
                <span className="flex items-center gap-2 text-[#dfeab1]"><WifiOff size={14} className="text-[#b7cc75]" /> Offline ready</span>
              </div>

              <div className="space-y-3">
                <div className="max-w-[260px] rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f]/75 p-4 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#b7cc75]">Worker verified</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-light text-[#f5f1e8]">Ravi Kumar</p>
                      <p className="mt-1 text-sm text-[#b8c0b0]">98.7% match • Liveness passed</p>
                    </div>
                    <div className="rounded border border-[#b7cc75]/30 bg-[#b7cc75]/10 px-2 py-1 text-xs text-[#dfeab1]">On site</div>
                  </div>
                </div>

                <div className="ml-auto max-w-[220px] rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f]/75 p-4 text-right backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#b7cc75]">Worksite</p>
                  <p className="mt-2 text-2xl font-light text-[#f5f1e8]">Green Valley</p>
                  <p className="text-sm text-[#b8c0b0]">42m from center</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="terra-panel p-4">
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#8d998b]">{metric.label}</p>
              <p className="mt-4 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">{metric.value}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8d998b]">{metric.note}</p>
            </div>
          ))}
        </section>

        <section id="how-it-works" className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="terra-panel p-6">
            <p className="terra-kicker">Everything you need,<br />to work fairer.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0e130f] p-4">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded border border-[#b7cc75]/25 bg-[#b7cc75]/10 text-[#dfeab1]">
                    <Check size={16} />
                  </div>
                  <p className="text-lg text-[#f5f1e8]">{feature.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#b8c0b0]">{feature.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="terra-panel p-6">
            <p className="terra-kicker">How it works</p>
            <div className="mt-6 space-y-3">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b7cc75]/25 bg-[#b7cc75]/10 text-xs font-medium text-[#dfeab1]">{index + 1}</div>
                  <span className="text-[#f5f1e8]">{step}</span>
                  {index < workflow.length - 1 ? <CircleArrowRight size={16} className="ml-auto text-[#8d998b]" /> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f]/90 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="terra-kicker">Operations overview</p>
              <h2 className="mt-2 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">Operational clarity at a glance.</h2>
            </div>
            <Link href="/dashboard" className="terra-btn-ghost">Open dashboard</Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#8d998b]">Attendance pulse</p>
                  <p className="mt-2 text-2xl font-light text-[#f5f1e8]">87% verified today</p>
                </div>
                <div className="rounded border border-[#b7cc75]/25 bg-[#b7cc75]/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#dfeab1]">Live</div>
              </div>
              <div className="mt-6 h-40 rounded border border-[rgba(183,196,170,0.12)] bg-[linear-gradient(180deg,rgba(183,204,117,0.10),rgba(183,204,117,0.02))] p-4">
                <div className="flex h-full items-end gap-3">
                  {[40, 52, 64, 57, 74, 81, 87].map((height, idx) => (
                    <div key={height} className="flex-1 rounded-t-md bg-[linear-gradient(180deg,#dfeab1_0%,#b7cc75_100%)] opacity-90" style={{ height: `${height}%`, marginLeft: idx === 0 ? '0' : '0.25rem' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#8d998b]">Integrity</p>
                <p className="mt-4 text-3xl font-light text-[#f5f1e8]">4</p>
                <p className="mt-1 text-sm text-[#b8c0b0]">Pending review</p>
              </div>
              <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#8d998b]">Wage estimate</p>
                <p className="mt-4 text-3xl font-light text-[#f5f1e8]">₹84,320</p>
                <p className="mt-1 text-sm text-[#b8c0b0]">Current cycle</p>
              </div>
            </div>
          </div>
        </section>

        <section id="integrity" className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="terra-panel p-6">
            <p className="terra-kicker">Integrity</p>
            <h3 className="mt-3 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">Alert clarity built for supervisors.</h3>
            <div className="mt-6 space-y-3">
              {[
                { title: 'Geofence violation', detail: 'Ravi Kumar • Attendance recorded 184m outside Green Valley radius.' },
                { title: 'Repeated low-confidence attempts', detail: '3 attempts in the last 2 days • verify with supervisor.' },
              ].map((alert) => (
                <div key={alert.title} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#0e130f] p-4">
                  <p className="text-lg text-[#f5f1e8]">{alert.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#b8c0b0]">{alert.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="terra-panel p-6" id="resources">
            <p className="terra-kicker">Wage transparency</p>
            <h3 className="mt-3 text-3xl font-light tracking-[-0.05em] text-[#f5f1e8]">Immediate, explainable pay insight.</h3>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Worker', value: 'Ravi Kumar' },
                { label: 'Days', value: '14' },
                { label: 'Hours', value: '108h' },
                { label: 'Rate', value: '₹180/h' },
                { label: 'Estimated wage', value: '₹19,440' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded border border-[rgba(183,196,170,0.12)] bg-[#0e130f] px-4 py-3 text-sm text-[#b8c0b0]">
                  <span>{item.label}</span>
                  <span className="text-[#f5f1e8]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded border border-[rgba(183,196,170,0.12)] bg-[#0f140f] p-8 text-center">
          <p className="terra-kicker">Built for rural operations.</p>
          <h3 className="mt-3 text-4xl font-light tracking-[-0.05em] text-[#f5f1e8]">Act with more trust, less friction.</h3>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="terra-btn">Create account</Link>
            <Link href="/dashboard" className="terra-btn-ghost">Launch dashboard</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
