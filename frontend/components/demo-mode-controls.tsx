"use client";

import React, { useState } from 'react';
import { Sliders, WifiOff, Wifi, AlertTriangle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { useConnectivity } from '@/lib/offline/connectivity';
import { syncEngine } from '@/lib/offline/syncEngine';

export function DemoModeControls() {
  const {
    isOnline,
    demoSettings,
    setDemoOffline,
    setSimulateSyncFailure,
    setSimulateConflict,
  } = useConnectivity();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded Demo Controls Panel */}
      {isOpen && (
        <div className="mb-2 p-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-100 rounded-xl shadow-2xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold tracking-wider text-emerald-400 uppercase text-[11px] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Phase 7 — Demo Sync Controls
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">DEV ONLY</span>
          </div>

          <div className="space-y-2">
            {/* Toggle Offline/Online */}
            <div className="flex items-center justify-between bg-slate-800/70 p-2 rounded border border-slate-700">
              <span className="font-medium text-slate-200">Simulate Offline Mode</span>
              <button
                onClick={() => setDemoOffline(!demoSettings.forceOffline)}
                className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors ${
                  demoSettings.forceOffline
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {demoSettings.forceOffline ? 'OFFLINE ACTIVE' : 'ONLINE'}
              </button>
            </div>

            {/* Simulate Sync Failure */}
            <div className="flex items-center justify-between bg-slate-800/70 p-2 rounded border border-slate-700">
              <span className="font-medium text-slate-200">Simulate Sync Failure</span>
              <button
                onClick={() => setSimulateSyncFailure(!demoSettings.simulateSyncFailure)}
                className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors ${
                  demoSettings.simulateSyncFailure
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {demoSettings.simulateSyncFailure ? 'FAILURE ON' : 'NORMAL'}
              </button>
            </div>

            {/* Simulate Sync Conflict */}
            <div className="flex items-center justify-between bg-slate-800/70 p-2 rounded border border-slate-700">
              <span className="font-medium text-slate-200">Simulate Attendance Conflict</span>
              <button
                onClick={() => setSimulateConflict(!demoSettings.simulateConflict)}
                className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors ${
                  demoSettings.simulateConflict
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {demoSettings.simulateConflict ? 'CONFLICT ON' : 'NORMAL'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700 flex gap-2">
            <button
              onClick={async () => {
                await syncEngine.processQueue();
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-2 rounded text-center transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Trigger Sync Retry
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 text-emerald-400 hover:text-emerald-300 px-3.5 py-2 rounded-full border border-slate-700 shadow-lg text-xs font-semibold hover:bg-slate-800 transition-all"
      >
        <Sliders className="w-4 h-4" />
        <span>Demo Controls</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
