"use client";

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, Eye, RefreshCw, XCircle, 
  MapPin, Clock, HelpCircle, User, ShieldCheck, Check, Ban
} from 'lucide-react';
import { getReviews, processReview, PendingReview } from '@/lib/api/attendance';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type IntegrityAlert = {
  id: number;
  worker_id: string;
  worker_name: string;
  alert_type: string;
  message: string;
  severity: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
};

export default function IntegrityCenterPage() {
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'REVIEWS'>('ALERTS');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review override reasons state
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({});

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) {
      setError("Authorization required.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Integrity Alerts
      const alertsRes = await fetch(`${API_BASE_URL}/api/integrity/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!alertsRes.ok) throw new Error("Failed to load integrity alerts.");
      const alertsData: IntegrityAlert[] = await alertsRes.json();
      
      // Filter alerts on client by status if needed
      if (statusFilter) {
        setAlerts(alertsData.filter(a => a.status === statusFilter));
      } else {
        setAlerts(alertsData);
      }

      // 2. Fetch Pending Verification Reviews
      const reviewsData = await getReviews(token);
      setReviews(reviewsData);

    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateAlertStatus(alertId: number, newStatus: string) {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/integrity/alerts/${alertId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status.");
      
      // Reload alerts
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update alert state.");
    }
  }

  async function handleProcessReview(attemptId: number, decision: 'APPROVE' | 'REJECT' | 'RECAPTURE') {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) return;

    const reason = overrideReasons[attemptId] || `Supervisor manual override: ${decision}`;

    try {
      await processReview(token, attemptId, decision, reason);
      // Clean up inputs
      setOverrideReasons(prev => {
        const copy = { ...prev };
        delete copy[attemptId];
        return copy;
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to resolve review.");
    }
  }

  return (
    <AppShell 
      title="Integrity Center"
      subtitle="Deterministic fraud engine checks, geo-location anomalies, and supervisor overrides."
    >
      {error && (
        <div className="mb-6 rounded border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#243124] mb-6 gap-6 text-sm">
        <button 
          onClick={() => setActiveTab('ALERTS')}
          className={`pb-3 font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'ALERTS' ? 'text-lime border-b-2 border-lime' : 'text-mist/50 hover:text-mist'
          }`}
        >
          Anomalies & Fraud Alerts ({alerts.length})
        </button>
        <button 
          onClick={() => setActiveTab('REVIEWS')}
          className={`pb-3 font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'REVIEWS' ? 'text-lime border-b-2 border-lime' : 'text-mist/50 hover:text-mist'
          }`}
        >
          Manual Review Queue ({reviews.length})
        </button>
      </div>

      {isLoading ? (
        <div className="rounded border border-[#243124] bg-[#081209] p-8 text-center text-mist/50 animate-pulse">
          Analyzing integrity metrics...
        </div>
      ) : activeTab === 'ALERTS' ? (
        <div className="space-y-6">
          {/* Alerts Filter Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-mist/50 uppercase tracking-wider">Filter Lifecycle:</span>
            {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded text-xs border font-mono transition-all ${
                  statusFilter === st 
                    ? 'bg-lime/10 text-lime border-lime/30' 
                    : 'bg-[#081209] text-mist/50 border-[#243124] hover:text-mist'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {alerts.map(a => (
              <div 
                key={a.id} 
                className={`rounded border p-5 bg-[#081209] flex flex-col md:flex-row justify-between gap-4 items-start md:items-center transition-all ${
                  a.severity === 'HIGH' ? 'border-red-500/20 shadow-lg shadow-red-500/5' : 'border-[#243124]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                      a.severity === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      {a.severity}
                    </span>
                    <h4 className="text-base font-semibold text-mist uppercase tracking-wide">{a.alert_type}</h4>
                  </div>
                  <p className="text-sm text-mist/70 font-mono">{a.message}</p>
                  <p className="text-xs text-mist/40 flex items-center gap-2 pt-1">
                    <User size={12} /> Worker: <span className="text-mist/70">{a.worker_name} ({a.worker_id})</span>
                    <span>•</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  {a.status === 'OPEN' && (
                    <button 
                      onClick={() => handleUpdateAlertStatus(a.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 rounded border border-[#243124] bg-[#050b07] text-xs text-mist/70 hover:text-mist transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                    <>
                      <button 
                        onClick={() => handleUpdateAlertStatus(a.id, 'RESOLVED')}
                        className="px-3 py-1.5 rounded border border-lime/30 bg-lime/10 text-xs text-lime hover:bg-lime/20 transition-colors"
                      >
                        Resolve
                      </button>
                      <button 
                        onClick={() => handleUpdateAlertStatus(a.id, 'DISMISSED')}
                        className="px-3 py-1.5 rounded border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {a.status !== 'OPEN' && a.status !== 'ACKNOWLEDGED' && (
                    <span className="text-xs text-mist/40 italic font-mono">Status: {a.status}</span>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-12 text-mist/40 text-sm rounded border border-[#243124] bg-[#081209]">
                No fraud alerts match the selected filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4">
            {reviews.map(r => (
              <div key={r.id} className="rounded border border-[#243124] bg-[#081209] p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-[#243124] pb-3">
                  <div>
                    <h4 className="text-base font-semibold text-mist uppercase tracking-wide">
                      {r.worker_name} ({r.worker_code})
                    </h4>
                    <p className="text-xs text-mist/40 font-mono mt-0.5">Attempt ID: {r.id} • {new Date(r.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-mono">
                    {r.result}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3 text-xs text-mist/70">
                  <div className="space-y-1">
                    <p className="text-mist/40 uppercase tracking-wider">Face Quality & Match</p>
                    <p className="font-mono text-mist">Quality: {r.face_match_status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mist/40 uppercase tracking-wider">Liveness Check</p>
                    <p className="font-mono text-mist">Liveness: {r.liveness_status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-mist/40 uppercase tracking-wider">Geofence Location</p>
                    <p className="font-mono text-mist flex items-center gap-1">
                      <MapPin size={12} className="text-lime" /> {r.location_status} ({Math.round(r.distance_from_worksite || 0)}m)
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col md:flex-row gap-3 items-end justify-between">
                  <div className="w-full md:max-w-md">
                    <label className="block text-xs text-mist/40 uppercase mb-1">Override Reason (Required)</label>
                    <input 
                      type="text"
                      placeholder="Explain override decision details..."
                      value={overrideReasons[r.id] || ''}
                      onChange={e => setOverrideReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-full bg-[#050b07] border border-[#243124] rounded px-3 py-1.5 text-xs text-mist focus:outline-none focus:border-lime/40"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleProcessReview(r.id, 'APPROVE')}
                      className="px-3 py-1.5 rounded border border-lime/30 bg-lime/10 text-xs text-lime font-semibold flex items-center gap-1 hover:bg-lime/20"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button 
                      onClick={() => handleProcessReview(r.id, 'REJECT')}
                      className="px-3 py-1.5 rounded border border-red-500/30 bg-red-500/5 text-xs text-red-400 font-semibold flex items-center gap-1 hover:bg-red-500/10"
                    >
                      <Ban size={14} /> Reject
                    </button>
                    <button 
                      onClick={() => handleProcessReview(r.id, 'RECAPTURE')}
                      className="px-3 py-1.5 rounded border border-[#243124] bg-[#050b07] text-xs text-mist/70 font-semibold flex items-center gap-1 hover:text-mist"
                    >
                      <RefreshCw size={14} /> Recapture
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-center py-12 text-mist/40 text-sm rounded border border-[#243124] bg-[#081209]">
                Manual review queue is empty. No pending verification overrides.
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
