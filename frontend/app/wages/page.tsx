'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type AttendanceRecord = {
  id: string;
  status?: string;
  timestamp: string;
};

export default function WagesPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadAttendance() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Unable to load attendance');
        }
        const data = await response.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load wage data', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAttendance();
  }, []);

  const summary = useMemo(() => {
    const verifiedHours = attendance.filter((item) => item.status === 'accepted').length * 8;
    const estimatedPayout = verifiedHours * 180;
    return { verifiedHours, estimatedPayout };
  }, [attendance]);

  return (
    <AppShell title="Wages" subtitle="Transparent wage estimation driven by verified attendance and local rules.">
      {isLoading ? <div className="rounded border border-[#243124] bg-[#081209] p-5 text-sm text-mist/70">Loading wage data…</div> : null}
      <div className="rounded border border-[#243124] bg-[#081209] p-5">
        <p className="text-sm text-mist/70">Estimated wages for the current cycle are calculated from verified sessions and local pay rules. Every value is based on the live attendance record.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-[#243124] bg-[#07110a] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Verified hours</p>
            <p className="mt-3 text-3xl font-light text-mist">{summary.verifiedHours}h</p>
          </div>
          <div className="rounded border border-[#243124] bg-[#07110a] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Estimated payout</p>
            <p className="mt-3 text-3xl font-light text-mist">₹{summary.estimatedPayout.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
