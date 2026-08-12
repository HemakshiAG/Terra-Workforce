"use client";

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { useConnectivity } from '@/lib/offline/connectivity';
import { syncEngine } from '@/lib/offline/syncEngine';
import { seedInitialDataIfEmpty } from '@/lib/db/seedLocalDb';
import { db } from '@/lib/db';

export function ConnectionStatusBanner() {
  const { status, isOnline, syncInfo } = useConnectivity();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    seedInitialDataIfEmpty();

    async function checkPending() {
      if (typeof window !== 'undefined') {
        const count = await db.sync_queue.where('status').anyOf(['PENDING', 'FAILED']).count();
        setPendingCount(count);
      }
    }
    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, [syncInfo]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncEngine.processQueue();
    setIsSyncing(false);
    const count = await db.sync_queue.where('status').anyOf(['PENDING', 'FAILED']).count();
    setPendingCount(count);
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 text-sm shadow-sm z-50">
      <div className="flex items-center gap-3">
        {/* Status Indicator Pill */}
        {isOnline ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            ● Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            ● Offline — Core features available
          </span>
        )}

        {/* Message */}
        <span className="text-slate-300 font-medium">
          {syncInfo.message || (isOnline ? 'All systems operational' : 'Offline — attendance continues locally.')}
        </span>

        {/* Pending records count */}
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 font-semibold">
            {pendingCount} waiting to sync
          </span>
        )}
      </div>

      {/* Manual Sync Control */}
      <div className="flex items-center gap-3 mt-1 sm:mt-0">
        <button
          onClick={handleSyncNow}
          disabled={isSyncing || !isOnline}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </button>
      </div>
    </div>
  );
}
