"use client";

import { AppShell } from '@/components/app-shell';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function WorkerAttendancePage() {
  // Mock data for worker view
  const today = {
    status: 'Present',
    time: '08:42 AM',
    worksite: 'Green Valley Field 01'
  };

  const week = [
    { day: 'Mon', status: 'Present' },
    { day: 'Tue', status: 'Present' },
    { day: 'Wed', status: 'Absent' },
    { day: 'Thu', status: 'Present' },
    { day: 'Fri', status: 'Present' },
  ];

  const history = [
    { date: 'Aug 11', status: 'Present', hours: '08:42 — 17:02' },
    { date: 'Aug 10', status: 'Present', hours: '08:51 — 17:06' },
  ];

  return (
    <AppShell title="My Attendance" subtitle="View your daily records">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border border-[#243124] bg-[#081209] p-6">
          <h3 className="text-xs uppercase tracking-[0.3em] text-lime mb-4">Today</h3>
          
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 size={48} className="text-lime mb-4" />
            <h2 className="text-3xl text-mist mb-2">{today.status}</h2>
            <p className="text-mist/70 text-lg">{today.time}</p>
            <p className="text-mist/50 mt-4">{today.worksite}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded border border-[#243124] bg-[#081209] p-6">
            <h3 className="text-xs uppercase tracking-[0.3em] text-mist/70 mb-4">This Week</h3>
            <div className="flex justify-between items-center px-4">
              {week.map(day => (
                <div key={day.day} className="flex flex-col items-center gap-2">
                  <span className="text-sm text-mist/70">{day.day}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs
                    ${day.status === 'Present' ? 'bg-lime/20 text-lime' : 'bg-red-500/20 text-red-400'}`}>
                    {day.status === 'Present' ? '✓' : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-[#243124] bg-[#081209] p-6">
            <h3 className="text-xs uppercase tracking-[0.3em] text-mist/70 mb-4 flex items-center gap-2">
              <Calendar size={16} /> History
            </h3>
            <div className="space-y-3">
              {history.map((record, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded bg-[#050b07] border border-[#243124]">
                  <div>
                    <p className="text-mist">{record.date}</p>
                    <p className="text-xs text-mist/50">{record.hours}</p>
                  </div>
                  <span className="text-sm text-lime bg-lime/10 px-3 py-1 rounded">{record.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
