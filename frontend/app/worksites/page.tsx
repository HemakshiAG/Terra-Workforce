import { AppShell } from '@/components/app-shell';

const worksites = [
  { name: 'Green Valley', radius: '300m', workers: 14, status: 'Active' },
  { name: 'North Ridge', radius: '250m', workers: 8, status: 'Active' },
  { name: 'River Bend', radius: '180m', workers: 6, status: 'Review' },
];

export default function WorksitesPage() {
  return (
    <AppShell title="Worksites" subtitle="Verified geofences and local attendance boundaries.">
      <div className="space-y-3">
        {worksites.map((site) => (
          <div key={site.name} className="flex flex-col gap-3 rounded border border-[#243124] bg-[#081209] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg text-mist">{site.name}</p>
              <p className="text-sm text-mist/60">Radius {site.radius} · {site.workers} assigned workers</p>
            </div>
            <div className="rounded border border-[#243124] px-3 py-2 text-sm text-mist/70">{site.status}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
