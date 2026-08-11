import { AppShell } from '@/components/app-shell';
import { Camera, CheckCircle2, UserRound } from 'lucide-react';

export default function EnrollmentPage() {
  return (
    <AppShell title="Enrollment" subtitle="Professional biometric enrollment with consent, quality checks, and duplicate detection.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded border border-[#243124] bg-[#081209] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-lime">Capture station</p>
              <h2 className="mt-1 text-xl text-mist">Multi-angle face capture</h2>
            </div>
            <div className="rounded border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime">Ready</div>
          </div>
          <div className="mt-4 flex min-h-[360px] items-center justify-center rounded border border-[#243124] bg-[#050b07]">
            <div className="flex h-64 w-64 items-center justify-center rounded-full border border-lime/30 bg-[#081209]">
              <Camera size={56} className="text-lime/70" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[#243124] bg-[#081209] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-lime">Workflow</p>
            <div className="mt-4 space-y-3 text-sm text-mist/70">
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><UserRound size={16} className="text-lime" /> Worker details</div>
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><Camera size={16} className="text-lime" /> Capture face samples</div>
              <div className="flex items-center gap-3 rounded border border-[#243124] bg-[#07110a] p-3"><CheckCircle2 size={16} className="text-lime" /> Consent and confirmation</div>
            </div>
          </div>
          <div className="rounded border border-[#243124] bg-[#081209] p-5 text-sm text-mist/70">
            The enrollment flow stores only encrypted templates locally and supports revocation without exposing raw biometric data.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
