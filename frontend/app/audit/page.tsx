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

export default function AuditPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadAudit() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Unable to load audit log');
        }
        const data = await response.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load audit data', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAudit();
  }, []);

  const auditEvents = useMemo(
    () =>
      attendance.map((item) => ({
        event: item.status === 'manual_review' ? 'Manual review triggered' : item.status === 'rejected' ? 'Identity integrity alert' : 'Attendance created',
        actor: item.worker_id,
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
    [attendance],
  );

  return (
    <AppShell title="Audit" subtitle="Append-only review trail for every attendance and correction event." allowedRoles={['ADMIN']}>
      {isLoading ? <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b] animate-pulse">Loading audit trail…</div> : null}
      <div className="space-y-3">
        {auditEvents.length === 0 ? (
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b]">No audit events recorded yet.</div>
        ) : (
          auditEvents.map((item, index) => (
            <div key={`${item.event}-${item.actor}-${item.time}-${index}`} className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b]">
              <p className="text-[#f5f1e8] font-medium">{item.event}</p>
              <p className="mt-1">{item.actor} · {item.time}</p>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
