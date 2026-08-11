import { AppShell } from '@/components/app-shell';

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Security, consent, and demo controls for the local workforce workflow.">
      <div className="space-y-3">
        {[
          { title: 'Offline mode', detail: 'Simulate offline attendance and queued sync.' },
          { title: 'Demo controls', detail: 'Toggle liveness failure, low confidence, and duplicate identity alerts.' },
          { title: 'Biometric consent', detail: 'Enrollment and revocation are handled with explicit consent states.' },
        ].map((item) => (
          <div key={item.title} className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">
            <p className="text-mist">{item.title}</p>
            <p className="mt-1">{item.detail}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
