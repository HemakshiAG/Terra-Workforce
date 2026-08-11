"use client";

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { getSessions, createSession, openSession, closeSession, AttendanceSession } from '@/lib/api/attendance';
import { listWorksites } from '@/lib/api/worksites';
import { Play, Square, Plus } from 'lucide-react';
import Link from 'next/link';

export default function AttendanceSupervisorPage() {
  const [worksites, setWorksites] = useState<{ id: number, name: string }[]>([]);
  const [selectedWorksite, setSelectedWorksite] = useState<number | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  
  // Create Session Form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('MORNING');
  const [formStart, setFormStart] = useState('07:30');
  const [formEnd, setFormEnd] = useState('11:30');

  useEffect(() => {
    async function loadWorksites() {
      try {
        const token = localStorage.getItem('terra-workforce-token');
        if (!token) return;
        const data = await listWorksites(token);
        setWorksites(data);
        if (data.length > 0) {
          setSelectedWorksite(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadWorksites();
  }, []);

  useEffect(() => {
    if (selectedWorksite !== null) {
      loadSessions(selectedWorksite);
    }
  }, [selectedWorksite]);

  async function loadSessions(wsId: number) {
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;
      const data = await getSessions(token, wsId);
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateSession() {
    if (selectedWorksite === null) return;
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) return;
    
    // Create a date for today
    const dateStr = new Date().toISOString().split('T')[0];
    
    try {
      await createSession(token, {
        worksite_id: selectedWorksite,
        session_type: formType,
        date: dateStr,
        scheduled_start: `${dateStr}T${formStart}:00Z`,
        scheduled_end: `${dateStr}T${formEnd}:00Z`,
      });
      setShowForm(false);
      loadSessions(selectedWorksite);
    } catch (err) {
      alert("Failed to create session");
    }
  }

  async function handleOpenSession(id: number) {
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;
      await openSession(token, id);
      if (selectedWorksite) loadSessions(selectedWorksite);
    } catch (err) {
      alert("Failed to open session");
    }
  }

  async function handleCloseSession(id: number) {
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;
      await closeSession(token, id);
      if (selectedWorksite) loadSessions(selectedWorksite);
    } catch (err) {
      alert("Failed to close session");
    }
  }

  return (
    <AppShell title="Attendance Management" subtitle="Manage today's attendance sessions">
      <div className="mb-6 flex gap-4 items-center">
        <label className="text-mist/70">Worksite:</label>
        <select 
          className="bg-[#081209] border border-[#243124] rounded px-3 py-1 text-mist"
          value={selectedWorksite || ''}
          onChange={(e) => setSelectedWorksite(Number(e.target.value))}
        >
          {worksites.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <button 
          onClick={() => setShowForm(true)}
          className="ml-auto rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime flex items-center gap-2"
        >
          <Plus size={16} /> Create attendance session
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded border border-[#243124] bg-[#050b07] p-5">
          <h3 className="text-lime uppercase tracking-widest text-xs mb-4">New Session</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-mist/70 mb-1">Session Type</label>
              <select className="w-full bg-[#081209] border border-[#243124] rounded px-3 py-2 text-mist" value={formType} onChange={e => setFormType(e.target.value)}>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-mist/70 mb-1">Start Time (UTC)</label>
              <input type="time" className="w-full bg-[#081209] border border-[#243124] rounded px-3 py-2 text-mist" value={formStart} onChange={e => setFormStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-mist/70 mb-1">End Time (UTC)</label>
              <input type="time" className="w-full bg-[#081209] border border-[#243124] rounded px-3 py-2 text-mist" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleCreateSession} className="rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime w-full">Create</button>
              <button onClick={() => setShowForm(false)} className="rounded border border-[#243124] bg-transparent px-4 py-2 text-sm text-mist/70 w-full">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map(session => (
          <div key={session.id} className="rounded border border-[#243124] bg-[#081209] p-5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-mist/70">{session.session_type} · {session.date}</p>
                <h3 className="mt-1 text-lg text-mist flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${session.status === 'OPEN' ? 'bg-lime' : session.status === 'SCHEDULED' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                  {session.status}
                </h3>
              </div>
            </div>
            
            <p className="text-sm text-mist/70 mb-6">
              {new Date(session.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} — {new Date(session.scheduled_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>

            <div className="mt-auto flex gap-2">
              {session.status === 'SCHEDULED' && (
                <button onClick={() => handleOpenSession(session.id)} className="flex-1 rounded border border-lime/30 bg-lime/10 px-3 py-2 text-sm text-lime flex justify-center items-center gap-2">
                  <Play size={16} /> Open session
                </button>
              )}
              {session.status === 'OPEN' && (
                <>
                  <button onClick={() => handleCloseSession(session.id)} className="flex-1 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 flex justify-center items-center gap-2">
                    <Square size={16} /> Close session
                  </button>
                  <Link href={`/attendance/check-in?session=${session.id}`} className="flex-1 rounded border border-[#243124] bg-[#050b07] px-3 py-2 text-sm text-mist flex justify-center items-center text-center">
                    Terminal
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-full rounded border border-[#243124] bg-[#050b07] p-8 text-center text-mist/50">
            No sessions created for this worksite today.
          </div>
        )}
      </div>
    </AppShell>
  );
}
