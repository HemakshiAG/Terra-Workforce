'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type AttendanceRecord = {
  id: string;
  worker_id: string;
  status?: string;
  timestamp: string;
  review_reasons?: string[];
};

export default function ReportsPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const token = localStorage.getItem('terra-workforce-token');
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/attendance/today`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setAttendance(Array.isArray(data) ? data : []);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load report data from cloud', error);
      }

      // Offline Fallback: Read from Dexie
      try {
        const { db } = await import('@/lib/db');
        const localRecords = await db.attendance_records.toArray();
        setAttendance(localRecords.map(r => ({
          id: String(r.id || r.local_id),
          worker_id: r.worker_code || r.worker_name || 'W-101',
          status: r.status === 'PRESENT' ? 'accepted' : r.status.toLowerCase(),
          timestamp: r.check_in_at || new Date().toISOString()
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  const handleExportCSV = async () => {
    const { db } = await import('@/lib/db');
    const records = await db.attendance_records.toArray();
    const headers = ['ID', 'Worker Code', 'Worker Name', 'Status', 'Verification Method', 'Check-In Time', 'Sync Status'];
    const rows = records.map(r => [
      r.id || r.local_id,
      r.worker_code || 'W-101',
      r.worker_name || 'Worker',
      r.status,
      r.verification_method,
      r.check_in_at || '',
      r.sync_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `terra_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = useMemo(() => {
    const verified = attendance.filter((item) => item.status === 'accepted' || item.status === 'PRESENT').length;
    const review = attendance.filter((item) => item.status === 'manual_review' || item.status === 'rejected' || item.status === 'PENDING_REVIEW').length;
    const total = attendance.length || 1;
    const hours = verified * 8;
    const payout = verified * 8 * 180;
    return { verified, review, total, hours, payout };
  }, [attendance]);

  const alerts = useMemo(
    () =>
      attendance
        .filter((item) => item.status === 'manual_review' || item.status === 'rejected' || item.status === 'PENDING_REVIEW')
        .slice(0, 3)
        .map((item) => ({
          title: item.status === 'rejected' ? 'Liveness or identity check failed' : 'Manual review requested',
          detail: `${item.worker_id} · ${item.review_reasons?.join(', ') || 'needs supervisor review'}`,
        })),
    [attendance],
  );

  return (
    <AppShell title="Reports" subtitle="Operational and integrity reporting for supervisors and admins.">
      <div className="flex justify-between items-center mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[#dfeab1]">Export & Analytics</p>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-[#b7cc75] text-[#0b0f0c] rounded text-xs font-bold hover:bg-[#cbe089] transition shadow-md"
        >
          Export CSV (Offline Supported)
        </button>
      </div>

      {isLoading ? <div className="rounded border border-[#243124] bg-[#081209] p-5 text-sm text-mist/70">Loading reports…</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Total checks</p>
          <p className="mt-4 text-3xl font-light text-mist">{summary.total}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Verified</p>
          <p className="mt-4 text-3xl font-light text-mist">{summary.verified}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Review</p>
          <p className="mt-4 text-3xl font-light text-mist">{summary.review}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Wage estimate</p>
          <p className="mt-4 text-3xl font-light text-mist">₹{summary.payout.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded border border-[#243124] bg-[#081209] p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-lime">Operational summary</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-[#243124] bg-[#07110a] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/45">Verified hours</p>
              <p className="mt-3 text-2xl text-mist">{summary.hours}h</p>
            </div>
            <div className="rounded border border-[#243124] bg-[#07110a] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/45">Avg. yield</p>
              <p className="mt-3 text-2xl text-mist">{summary.total ? Math.round((summary.verified / summary.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="rounded border border-[#243124] bg-[#081209] p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-lime">Integrity alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded border border-[#243124] bg-[#07110a] p-3 text-sm text-mist/70">No integrity issues in the current window.</div>
            ) : (
              alerts.map((alert) => (
                <div key={`${alert.title}-${alert.detail}`} className="rounded border border-[#243124] bg-[#07110a] p-3 text-sm text-mist/70">
                  <p className="text-mist">{alert.title}</p>
                  <p className="mt-1">{alert.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
