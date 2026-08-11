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
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadReports() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Unable to load attendance reports');
        }
        const data = await response.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load report data', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  const summary = useMemo(() => {
    const verified = attendance.filter((item) => item.status === 'accepted').length;
    const review = attendance.filter((item) => item.status === 'manual_review' || item.status === 'rejected').length;
    const total = attendance.length;
    const hours = verified * 8;
    const payout = verified * 8 * 180;
    return { verified, review, total, hours, payout };
  }, [attendance]);

  const alerts = useMemo(
    () =>
      attendance
        .filter((item) => item.status === 'manual_review' || item.status === 'rejected')
        .slice(0, 3)
        .map((item) => ({
          title: item.status === 'rejected' ? 'Liveness or identity check failed' : 'Manual review requested',
          detail: `${item.worker_id} · ${item.review_reasons?.join(', ') || 'needs supervisor review'}`,
        })),
    [attendance],
  );

  return (
    <AppShell title="Reports" subtitle="Operational and integrity reporting for supervisors and admins.">
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
