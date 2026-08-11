'use client';

import { AppShell } from '@/components/app-shell';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type IntegrityAlert = {
  id: string;
  worker_id: string;
  status: string;
  severity: 'critical' | 'review';
  title: string;
  detail: string;
  timestamp: string;
  reasons: string[];
};

export default function IntegrityPage() {
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadAlerts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/integrity/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Unable to load integrity alerts');
        }
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load integrity alerts', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
  }, []);

  const summary = useMemo(() => ({
    critical: alerts.filter((item) => item.severity === 'critical').length,
    review: alerts.filter((item) => item.severity === 'review').length,
    suspicious: alerts.length,
  }), [alerts]);

  return (
    <AppShell title="Workforce Integrity" subtitle="Review queue, suspicious attempts, and correction trail.">
      {isLoading ? <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">Loading integrity feed…</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Critical</p>
          <p className="mt-3 text-3xl font-light text-mist">{summary.critical}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Review</p>
          <p className="mt-3 text-3xl font-light text-mist">{summary.review}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Suspicious attempts</p>
          <p className="mt-3 text-3xl font-light text-mist">{summary.suspicious}</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Corrections</p>
          <p className="mt-3 text-3xl font-light text-mist">{alerts.length}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">No integrity alerts in the current queue.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 rounded border border-[#243124] bg-[#081209] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-1 rounded p-2 ${alert.severity === 'critical' ? 'bg-[#2d1d1d] text-[#f08e72]' : 'bg-[#1a2217] text-lime'}`}>
                  {alert.severity === 'critical' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                  <p className="text-lg text-mist">{alert.title}</p>
                  <p className="mt-1 text-sm text-mist/65">{alert.detail} · {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="rounded border border-[#243124] px-3 py-2 text-sm text-mist/70">{alert.severity === 'critical' ? 'Critical' : 'Review'}</div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
