'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';
import { ScrollText, ShieldCheck, Download, Filter } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type AuditLogItem = {
  id: number;
  who: string;
  actor_role: string;
  what: string;
  action: string;
  target_type?: string;
  target_id?: string;
  where_device: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  when: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setIsLoading(true);
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Failed to load audit data from backend', error);
    }

    // Offline Fallback: Read from Dexie
    try {
      const { db } = await import('@/lib/db');
      const localLogs = await db.audit_logs.toArray();
      setLogs(
        localLogs.map((l, idx) => ({
          id: l.id || idx + 1,
          who: 'Local User',
          actor_role: 'SUPERVISOR',
          what: l.action,
          action: l.action,
          target_type: l.target_type || 'SYSTEM',
          target_id: l.target_id || 'LOCAL',
          where_device: 'Web Browser Terminal (Offline)',
          old_value: '',
          new_value: l.details_json || '',
          reason: 'Offline audit action logged',
          when: l.created_at || new Date().toISOString(),
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExportAuditCSV = () => {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (token) {
      window.open(`${API_BASE_URL}/api/reports/export/csv?type=audit_report`, '_blank');
      return;
    }

    // Local CSV Fallback
    const headers = ['ID', 'Who (Actor)', 'Role', 'What (Action)', 'Target Type', 'Target ID', 'Where/Device', 'Old Value', 'New Value', 'Reason', 'When'];
    const rows = logs.map((l) => [
      l.id,
      l.who,
      l.actor_role,
      l.action,
      l.target_type || '',
      l.target_id || '',
      l.where_device,
      l.old_value || '',
      l.new_value || '',
      l.reason || '',
      l.when,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `terra_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction === 'ALL') return true;
    return l.action.toUpperCase() === filterAction;
  });

  return (
    <AppShell title="Audit Trail" subtitle="Append-only immutable audit trail tracking who, what, when, where, old/new values, and reasons." allowedRoles={['ADMIN']}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-[#dfeab1]">Append-Only Log</span>
          <div className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> IMMUTABLE
          </div>
        </div>

        <button
          onClick={handleExportAuditCSV}
          className="px-4 py-2 bg-[#b7cc75] hover:bg-[#cbe089] text-[#0b0f0c] rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Export Audit CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#8d998b] flex items-center gap-1 mr-2"><Filter className="w-3 h-3" /> Filter:</span>
        {['ALL', 'WORKER_CREATED', 'WORKER_DEACTIVATED', 'BIOMETRIC_ENROLLED', 'ATTENDANCE_EDITED', 'REPORT_EXPORTED', 'SYNC_CONFLICT_RESOLVED'].map((act) => (
          <button
            key={act}
            onClick={() => setFilterAction(act)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
              filterAction === act ? 'bg-[#b7cc75] text-[#0b0f0c]' : 'bg-[#101610] text-[#8d998b] hover:text-[#f5f1e8] border border-[rgba(183,196,170,0.12)]'
            }`}
          >
            {act.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-[rgba(183,196,170,0.12)] bg-[#0f140f] overflow-hidden">
        <div className="p-4 border-b border-[rgba(183,196,170,0.12)] flex justify-between items-center">
          <h3 className="font-semibold text-sm text-[#f5f1e8] flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#b7cc75]" /> System Audit Trail Records
          </h3>
          <span className="text-xs text-[#8d998b]">{filteredLogs.length} audit entries</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#8d998b] animate-pulse">Loading append-only audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8d998b]">No audit logs found for the selected filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101610] text-[#8d998b] uppercase tracking-wider text-[10px] border-b border-[rgba(183,196,170,0.12)]">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Who (Actor)</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">What (Action)</th>
                  <th className="p-3">Where / Device</th>
                  <th className="p-3">Old Value</th>
                  <th className="p-3">New Value</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(183,196,170,0.08)] text-[#f5f1e8]">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#121b12]/50 transition">
                    <td className="p-3 text-[#8d998b] whitespace-nowrap">{l.when ? new Date(l.when).toLocaleString() : '-'}</td>
                    <td className="p-3 font-medium text-[#dfeab1]">{l.who}</td>
                    <td className="p-3 text-[#8d998b]">{l.actor_role}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-[#172217] text-[#b7cc75] border border-[#b7cc75]/20 rounded font-semibold text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 text-[#8d998b] text-[11px]">{l.where_device}</td>
                    <td className="p-3 text-slate-400 font-mono text-[10px] max-w-[120px] truncate">{l.old_value || '-'}</td>
                    <td className="p-3 text-slate-200 font-mono text-[10px] max-w-[120px] truncate">{l.new_value || '-'}</td>
                    <td className="p-3 text-[#8d998b]">{l.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
