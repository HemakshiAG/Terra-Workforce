"use client";

import { AppShell } from '@/components/app-shell';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

export default function AttendanceRegisterPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock data for now to represent the UI
  const records = [
    { id: 1, name: 'Ravi Kumar', code: 'W-0042', checkIn: '08:42', checkOut: '17:02', status: 'Present', method: 'Face', hours: '7h 34m' },
    { id: 2, name: 'Meena Devi', code: 'W-0043', checkIn: '08:47', checkOut: '—', status: 'Present', method: 'QR', hours: '—' },
    { id: 3, name: 'Suresh', code: 'W-0044', checkIn: '—', checkOut: '—', status: 'Absent', method: '—', hours: '—' },
    { id: 4, name: 'Anita', code: 'W-0045', checkIn: '08:51', checkOut: '—', status: 'Review', method: 'Face', hours: '—' },
  ];

  return (
    <AppShell title="Attendance Register" subtitle="Green Valley Field 01 · Morning Session">
      <div className="mb-8 flex justify-between items-end">
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-mist/50 tracking-widest uppercase mb-1">Expected</p>
            <p className="text-2xl text-mist">42</p>
          </div>
          <div>
            <p className="text-xs text-lime/70 tracking-widest uppercase mb-1">Present</p>
            <p className="text-2xl text-lime">31</p>
          </div>
          <div>
            <p className="text-xs text-red-400/70 tracking-widest uppercase mb-1">Absent</p>
            <p className="text-2xl text-red-400">8</p>
          </div>
          <div>
            <p className="text-xs text-yellow-500/70 tracking-widest uppercase mb-1">Review</p>
            <p className="text-2xl text-yellow-500">3</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#081209] border border-[#243124] rounded px-3 py-2 text-sm text-mist" />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-mist/40" />
            <input type="text" placeholder="Search worker..." className="bg-[#050b07] border border-[#243124] rounded pl-9 pr-3 py-2 text-sm text-mist placeholder:text-mist/30" />
          </div>
          <button className="rounded border border-[#243124] bg-[#050b07] px-3 py-2 text-sm text-mist/70 hover:text-mist flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="rounded border border-[#243124] bg-[#081209] overflow-hidden">
        <table className="w-full text-left text-sm text-mist">
          <thead className="bg-[#050b07] text-xs uppercase tracking-wider text-mist/50 border-b border-[#243124]">
            <tr>
              <th className="px-6 py-4 font-normal">Worker</th>
              <th className="px-6 py-4 font-normal">ID</th>
              <th className="px-6 py-4 font-normal">Check-in</th>
              <th className="px-6 py-4 font-normal">Check-out</th>
              <th className="px-6 py-4 font-normal">Status</th>
              <th className="px-6 py-4 font-normal">Verification</th>
              <th className="px-6 py-4 font-normal">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#243124]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#0a140b] transition-colors">
                <td className="px-6 py-4 font-medium">{r.name}</td>
                <td className="px-6 py-4 text-mist/70">{r.code}</td>
                <td className="px-6 py-4 font-mono text-mist/80">{r.checkIn}</td>
                <td className="px-6 py-4 font-mono text-mist/80">{r.checkOut}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    r.status === 'Present' ? 'bg-lime/10 text-lime border border-lime/20' :
                    r.status === 'Absent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-mist/70">{r.method}</td>
                <td className="px-6 py-4 font-mono text-mist/80">{r.hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
