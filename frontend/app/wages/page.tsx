import { AppShell } from '@/components/app-shell';

export default function WagesPage() {
  return (
    <AppShell title="Wages" subtitle="Transparent wage estimation driven by verified attendance and local rules.">
      <div className="rounded border border-[#243124] bg-[#081209] p-5">
        <p className="text-sm text-mist/70">Estimated wages for the current month are displayed from verified sessions and local pay rules. The interface is designed to make every calculation auditable.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#243124] bg-[#07110a] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Verified hours</p>
            <p className="mt-3 text-3xl font-light text-mist">176h</p>
          </div>
          <div className="rounded border border-[#243124] bg-[#07110a] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Estimated payout</p>
            <p className="mt-3 text-3xl font-light text-mist">₹1,05,600</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
