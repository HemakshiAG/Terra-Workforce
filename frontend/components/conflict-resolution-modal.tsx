"use client";

import React, { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { db, LocalConflictRecord } from '@/lib/db';
import { syncEngine } from '@/lib/offline/syncEngine';

export function ConflictResolutionModal() {
  const [conflicts, setConflicts] = useState<LocalConflictRecord[]>([]);
  const [activeConflict, setActiveConflict] = useState<LocalConflictRecord | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadConflicts() {
    if (typeof window === 'undefined') return;
    const pendingConflicts = await db.conflicts.where('status').equals('PENDING').toArray();
    setConflicts(pendingConflicts);
    if (pendingConflicts.length > 0 && !activeConflict) {
      setActiveConflict(pendingConflicts[0]);
    }
  }

  useEffect(() => {
    loadConflicts();
    const interval = setInterval(loadConflicts, 4000);
    return () => clearInterval(interval);
  }, []);

  if (conflicts.length === 0 || !activeConflict) {
    return null;
  }

  const handleResolve = async (strategy: 'KEEP_LOCAL' | 'KEEP_CLOUD') => {
    setLoading(true);
    try {
      // 1. Update Dexie local conflict record
      await db.conflicts.update(activeConflict.id!, {
        status: 'RESOLVED',
        resolution: strategy,
      });

      // 2. Update Dexie sync queue item status if associated
      if (activeConflict.sync_id) {
        await db.sync_queue.update(activeConflict.sync_id, {
          status: strategy === 'KEEP_LOCAL' ? 'PENDING' : 'SYNCED',
          error: null,
        });
      }

      // 3. Inform backend if online
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
      await fetch(`${apiBaseUrl}/api/sync/conflicts/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: activeConflict.id,
          resolution: strategy,
        }),
      }).catch(() => {});

      // 4. Trigger re-sync if keeping local
      if (strategy === 'KEEP_LOCAL') {
        await syncEngine.processQueue();
      }

      setActiveConflict(null);
      await loadConflicts();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Attendance conflict detected</h3>
            <p className="text-xs text-amber-300">Supervisor / Admin Review Required</p>
          </div>
        </div>

        {/* Comparison Box */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Local State */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Local Machine Record</div>
            <div className="text-sm font-bold text-white">
              Status: {activeConflict.local_data?.status || 'PRESENT'}
            </div>
            <div className="text-slate-400">
              Worker: {activeConflict.local_data?.worker_name || activeConflict.local_data?.worker_code || 'Worker #1'}
            </div>
            <div className="text-slate-500 text-[10px]">
              Recorded via Local Storage
            </div>
          </div>

          {/* Cloud State */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-rose-500/30 space-y-2">
            <div className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Cloud Database Record</div>
            <div className="text-sm font-bold text-white">
              Status: {activeConflict.cloud_data?.status || 'ABSENT'}
            </div>
            <div className="text-slate-400">
              Note: {activeConflict.cloud_data?.note || 'Cloud server record differs'}
            </div>
            <div className="text-slate-500 text-[10px]">
              Recorded via Remote Cloud
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Do not silently overwrite. Choose how to resolve this attendance record:
        </p>

        {/* Resolution Options */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleResolve('KEEP_LOCAL')}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <CheckCircle className="w-4 h-4" /> Keep Local (Present)
          </button>
          <button
            onClick={() => handleResolve('KEEP_CLOUD')}
            disabled={loading}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <XCircle className="w-4 h-4" /> Keep Cloud (Absent)
          </button>
        </div>
      </div>
    </div>
  );
}
