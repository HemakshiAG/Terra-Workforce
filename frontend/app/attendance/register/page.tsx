"use client";

import { AppShell } from '@/components/app-shell';
import { Search, Filter, RefreshCw, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listAttendance, AttendanceRecord, markManualAttendance } from '@/lib/api/attendance';
import { listWorksites, WorksiteRecord } from '@/lib/api/worksites';
import { getSessions, AttendanceSession } from '@/lib/api/attendance';
import { listWorkers, WorkerSummary } from '@/lib/api/workers';

export default function AttendanceRegisterPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [worksiteFilter, setWorksiteFilter] = useState<number | ''>('');
  const [sessionFilter, setSessionFilter] = useState<number | ''>('');
  
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [worksites, setWorksites] = useState<WorksiteRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Log Dialog State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSessionId, setManualSessionId] = useState<number | ''>('');
  const [manualWorkerId, setManualWorkerId] = useState<number | ''>('');
  const [manualReason, setManualReason] = useState('');

  useEffect(() => {
    loadFilterMetadata();
  }, []);

  useEffect(() => {
    loadRegister();
  }, [date, search, statusFilter, worksiteFilter, sessionFilter]);

  async function loadFilterMetadata() {
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;
      
      const wsData = await listWorksites(token);
      setWorksites(wsData);

      const workerData = await listWorkers(token);
      setWorkers(workerData.workers);
      
      if (wsData.length > 0) {
        const firstWs = wsData[0].id;
        const sessData = await getSessions(token, firstWs);
        setSessions(sessData);
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  }

  async function handleWorksiteChange(wsId: number | '') {
    setWorksiteFilter(wsId);
    setSessionFilter('');
    if (wsId) {
      try {
        const token = localStorage.getItem('terra-workforce-token');
        if (!token) return;
        const sessData = await getSessions(token, wsId);
        setSessions(sessData);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSessions([]);
    }
  }

  async function loadRegister() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;

      const data = await listAttendance(token, {
        date,
        search,
        status: statusFilter || undefined,
        worksite_id: worksiteFilter || undefined,
        session_id: sessionFilter || undefined
      });
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualLogSubmit() {
    if (!manualSessionId || !manualWorkerId || !manualReason) {
      alert("Please fill all manual log fields.");
      return;
    }
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;

      await markManualAttendance(token, {
        session_id: Number(manualSessionId),
        worker_id: Number(manualWorkerId),
        reason: manualReason
      });
      setShowManualModal(false);
      setManualReason('');
      loadRegister();
    } catch (err: any) {
      alert(err.message || "Failed to mark manual attendance");
    }
  }

  function calculateHours(r: AttendanceRecord) {
    if (!r.check_in_at) return '—';
    const start = new Date(r.check_in_at);
    const end = r.check_out_at ? new Date(r.check_out_at) : new Date();
    
    let durationSeconds = (end.getTime() - start.getTime()) / 1000;
    
    // Subtract break duration if present
    if (r.break_start && r.break_end) {
      const bStart = new Date(r.break_start);
      const bEnd = new Date(r.break_end);
      const breakSeconds = (bEnd.getTime() - bStart.getTime()) / 1000;
      if (breakSeconds > 0) {
        durationSeconds -= breakSeconds;
      }
    }
    
    if (durationSeconds < 0) durationSeconds = 0;
    const h = Math.floor(durationSeconds / 3600);
    const m = Math.floor((durationSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  const counts = {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    review: records.filter(r => r.status === 'PENDING_REVIEW').length,
  };

  return (
    <AppShell title="Attendance Register" subtitle="Verify and audit daily attendance logs.">
      <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-mist/50 tracking-widest uppercase mb-1">Total Logs</p>
            <p className="text-2xl text-mist">{records.length}</p>
          </div>
          <div>
            <p className="text-xs text-lime/70 tracking-widest uppercase mb-1">Present</p>
            <p className="text-2xl text-lime">{counts.present}</p>
          </div>
          <div>
            <p className="text-xs text-red-400/70 tracking-widest uppercase mb-1">Absent</p>
            <p className="text-2xl text-red-400">{counts.absent}</p>
          </div>
          {counts.review > 0 && (
            <div>
              <p className="text-xs text-yellow-500/70 tracking-widest uppercase mb-1">Pending Review</p>
              <p className="text-2xl text-yellow-500">{counts.review}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={() => setShowManualModal(true)}
            className="rounded border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime flex items-center gap-2 hover:bg-lime/20 transition-all"
          >
            <Plus size={16} /> Manual Override
          </button>

          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="bg-[#081209] border border-[#243124] rounded px-3 py-2 text-sm text-mist" 
          />

          <select 
            value={worksiteFilter}
            onChange={e => handleWorksiteChange(e.target.value ? Number(e.target.value) : '')}
            className="bg-[#081209] border border-[#243124] rounded px-3 py-2 text-sm text-mist"
          >
            <option value="">All Worksites</option>
            {worksites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select 
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value ? Number(e.target.value) : '')}
            className="bg-[#081209] border border-[#243124] rounded px-3 py-2 text-sm text-mist"
            disabled={!worksiteFilter}
          >
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_type} ({s.date})</option>)}
          </select>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#081209] border border-[#243124] rounded px-3 py-2 text-sm text-mist"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-mist/40" />
            <input 
              type="text" 
              placeholder="Search worker..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#050b07] border border-[#243124] rounded pl-9 pr-3 py-2 text-sm text-mist placeholder:text-mist/30" 
            />
          </div>

          <button onClick={loadRegister} className="rounded border border-[#243124] bg-[#050b07] p-2 text-mist/70 hover:text-mist">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded border border-[#243124] bg-[#081209] p-8 text-center text-mist/50">
          Loading register data...
        </div>
      ) : (
        <div className="rounded border border-[#243124] bg-[#081209] overflow-hidden">
          <table className="w-full text-left text-sm text-mist">
            <thead className="bg-[#050b07] text-xs uppercase tracking-wider text-mist/50 border-b border-[#243124]">
              <tr>
                <th className="px-6 py-4 font-normal">Worker</th>
                <th className="px-6 py-4 font-normal">ID</th>
                <th className="px-6 py-4 font-normal">Check-in</th>
                <th className="px-6 py-4 font-normal">Break</th>
                <th className="px-6 py-4 font-normal">Check-out</th>
                <th className="px-6 py-4 font-normal">Hours</th>
                <th className="px-6 py-4 font-normal">Location</th>
                <th className="px-6 py-4 font-normal">Verification</th>
                <th className="px-6 py-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243124]">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-[#0a140b] transition-colors">
                  <td className="px-6 py-4 font-medium">{r.worker_name}</td>
                  <td className="px-6 py-4 text-mist/70 font-mono text-xs">{r.worker_code}</td>
                  <td className="px-6 py-4 font-mono text-xs text-mist/80">
                    {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-mist/80">
                    {r.break_start ? (
                      `${new Date(r.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${r.break_end ? new Date(r.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'active'}`
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-mist/80">
                    {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-mist/80">{calculateHours(r)}</td>
                  <td className="px-6 py-4 text-xs text-mist/70">
                    {r.location_status === 'WITHIN_GEOFENCE' ? (
                      <span className="text-lime">On site ({Math.round(r.distance || 0)}m)</span>
                    ) : r.location_status === 'OUTSIDE_GEOFENCE' ? (
                      <span className="text-red-400">Outside ({Math.round(r.distance || 0)}m)</span>
                    ) : 'Unavailable'}
                  </td>
                  <td className="px-6 py-4 text-xs text-mist/70 uppercase">{r.verification_method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs border ${
                      r.status === 'PRESENT' ? 'bg-lime/10 text-lime border-lime/20' :
                      r.status === 'ABSENT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-mist/40">
                    No attendance records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual log modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded border border-[#243124] bg-[#081209] p-6 text-mist shadow-2xl">
            <h3 className="text-lime uppercase tracking-widest text-xs mb-4">Manual Log Override</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-mist/70 mb-1">Target Active Session</label>
                <select 
                  value={manualSessionId} 
                  onChange={e => setManualSessionId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#050b07] border border-[#243124] rounded px-3 py-2 text-sm text-mist focus:outline-none"
                >
                  <option value="">Select session...</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.session_type} ({s.date})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-mist/70 mb-1">Select Worker</label>
                <select 
                  value={manualWorkerId} 
                  onChange={e => setManualWorkerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#050b07] border border-[#243124] rounded px-3 py-2 text-sm text-mist focus:outline-none"
                >
                  <option value="">Select worker...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.worker_code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-mist/70 mb-1">Override Reason</label>
                <textarea 
                  value={manualReason} 
                  onChange={e => setManualReason(e.target.value)}
                  placeholder="e.g. Device failure / Camera failed on site check"
                  className="w-full bg-[#050b07] border border-[#243124] rounded px-3 py-2 text-sm text-mist focus:outline-none h-20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowManualModal(false)} className="rounded border border-[#243124] px-4 py-2 text-xs text-mist/70">Cancel</button>
                <button onClick={handleManualLogSubmit} className="rounded border border-lime/30 bg-lime/10 px-4 py-2 text-xs text-lime">Submit Override</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
