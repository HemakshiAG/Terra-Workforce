import Link from 'next/link';
import { UserRound } from 'lucide-react';

const workers = [
  { name: 'Ravi Kumar', id: 'W-101', site: 'Green Valley', status: 'Verified' },
  { name: 'Asha Devi', id: 'W-102', site: 'Green Valley', status: 'Review' },
  { name: 'Nirmal Singh', id: 'W-103', site: 'North Ridge', status: 'Pending' },
];

export default function WorkersPage() {
  return (
    <main className="min-h-screen bg-night text-mist">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
        <div className="rounded border border-[#243124] bg-[#07110a]/90 p-6">
          <div className="flex items-end justify-between border-b border-[#243124] pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-lime">Workers</p>
              <h1 className="mt-2 text-3xl font-light text-mist">Verified workforce roster</h1>
            </div>
            <Link href="/enrollment" className="rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime">Enroll worker</Link>
          </div>

          <div className="mt-6 grid gap-3">
            {workers.map((worker) => (
              <div key={worker.id} className="flex flex-col gap-3 rounded border border-[#243124] bg-[#081209] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-lime/20 bg-lime/10 p-2">
                    <UserRound size={16} className="text-lime" />
                  </div>
                  <div>
                    <p className="text-lg text-mist">{worker.name}</p>
                    <p className="text-sm text-mist/60">{worker.id} · {worker.site}</p>
                  </div>
                </div>
                <div className="rounded border border-[#243124] px-3 py-2 text-sm text-mist/70">{worker.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
