"use client";

import { AppShell } from '@/components/app-shell';
import { ShieldAlert, Check, X, Search } from 'lucide-react';
import { useState } from 'react';

export default function AttendanceReviewPage() {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      name: 'Ravi Kumar',
      time: '08:42 AM',
      issues: [
        { label: 'Location', value: 'Outside geofence (184m)', fail: true },
      ],
      details: 'Face matched (Demo) · Liveness passed'
    },
    {
      id: 2,
      name: 'Meena Devi',
      time: '08:47 AM',
      issues: [
        { label: 'Face', value: 'No match (Demo)', fail: true },
      ],
      details: 'Liveness passed · Within geofence (12m)'
    },
    {
      id: 3,
      name: 'Anita',
      time: '08:51 AM',
      issues: [
        { label: 'Method', value: 'QR Backup used', fail: false },
        { label: 'Camera', value: 'Unavailable', fail: true }
      ],
      details: 'Within geofence (4m)'
    }
  ]);

  function handleAction(id: number, action: 'approve' | 'reject') {
    // Mock action
    setReviews(r => r.filter(x => x.id !== id));
  }

  return (
    <AppShell title="Attendance Review" subtitle="Requires supervisor attention">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl text-mist flex items-center gap-2">
          <ShieldAlert size={20} className="text-yellow-500" />
          {reviews.length} cases pending
        </h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-mist/40" />
          <input type="text" placeholder="Search worker..." className="bg-[#050b07] border border-[#243124] rounded pl-9 pr-3 py-2 text-sm text-mist placeholder:text-mist/30 w-64" />
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="rounded border border-[#243124] bg-[#081209] p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="text-lg text-mist">{review.name}</h3>
                <span className="text-sm font-mono text-mist/60">{review.time}</span>
              </div>
              
              <div className="space-y-2 mb-3">
                {review.issues.map((issue, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span className="text-mist/50 w-20">{issue.label}:</span>
                    <span className={issue.fail ? "text-red-400" : "text-yellow-500"}>{issue.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-mist/40">{review.details}</p>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
              <button 
                onClick={() => handleAction(review.id, 'approve')}
                className="rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime flex items-center justify-center gap-2 hover:bg-lime/20 transition-colors"
              >
                <Check size={16} /> Approve
              </button>
              <button 
                onClick={() => handleAction(review.id, 'reject')}
                className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
              >
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="rounded border border-[#243124] bg-[#050b07] p-8 text-center text-mist/50">
            No pending reviews.
          </div>
        )}
      </div>
    </AppShell>
  );
}
