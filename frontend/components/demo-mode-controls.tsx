"use client";

import React, { useState } from 'react';
import { Sliders, WifiOff, Wifi, ShieldAlert, RefreshCw, ChevronUp, ChevronDown, Play, SkipForward, CheckCircle2, UserCheck, AlertOctagon } from 'lucide-react';
import { useConnectivity } from '@/lib/offline/connectivity';
import { syncEngine } from '@/lib/offline/syncEngine';

export const DEMO_STORY_STEPS = [
  { id: 1, title: '1. Problem: Manual Roll Call', desc: 'Manual paper registers cause proxy attendance, ghost workers, and delayed wages.' },
  { id: 2, title: '2. Supervisor Starts Session', desc: 'Supervisor opens morning attendance session at Green Valley Worksite.' },
  { id: 3, title: '3. Internet Goes OFF', desc: 'Network disconnects completely. Offline-first storage takes over.' },
  { id: 4, title: '4. Worker Approaches Camera', desc: 'Worker Ramesh Kumar (W-101) stands in front of camera.' },
  { id: 5, title: '5. Face Detected', desc: 'High face quality & illumination confirmed.' },
  { id: 6, title: '6. Liveness Passed', desc: 'Blink & micro-motion detection verified (score: 0.98).' },
  { id: 7, title: '7. Face Recognized', desc: 'Biometric 512-d embedding matched at 98.7% confidence.' },
  { id: 8, title: '8. GPS Verified', desc: 'Worker location verified 14.2m inside worksite geofence.' },
  { id: 9, title: '9. Attendance Recorded Locally', desc: 'Attendance marked PRESENT in local IndexedDB.' },
  { id: 10, title: '10. Spoof Attempt', desc: 'Photo spoof attempt presented to camera.' },
  { id: 11, title: '11. Liveness Failed', desc: 'Liveness test failed (score: 0.12). Spoof blocked.' },
  { id: 12, title: '12. Low-Confidence Attempt', desc: 'Partial occlusion attempt (match score: 82.1%).' },
  { id: 13, title: '13. Manual Review Queue', desc: 'Sent to supervisor review queue for verification.' },
  { id: 14, title: '14. Dashboard Updates', desc: 'Supervisor dashboard updates metrics offline.' },
  { id: 15, title: '15. Internet Returns', desc: 'Connectivity restored automatically.' },
  { id: 16, title: '16. Offline Records Sync', desc: 'SyncEngine pushes queued records with idempotency.' },
  { id: 17, title: '17. Audit Trail Verified', desc: 'Immutable append-only audit trail updated.' },
  { id: 18, title: '18. Worker Personal View', desc: 'Worker views personal attendance and estimated wage.' }
];

export function DemoModeControls() {
  const {
    isOnline,
    demoSettings,
    setDemoOffline,
    setSimulateSyncFailure,
    setSimulateConflict,
  } = useConnectivity();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'STORY'>('CONTROLS');
  const [actionMessage, setActionMessage] = useState<string>('');

  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 3500);
  };

  const handleNextStep = () => {
    const nextIdx = (currentStepIndex + 1) % DEMO_STORY_STEPS.length;
    setCurrentStepIndex(nextIdx);
    
    // Auto toggle offline/online states based on step
    if (nextIdx === 2) {
      setDemoOffline(true);
      showFeedback('Step 3: Network DISCONNECTED (Offline Mode)');
    } else if (nextIdx === 14) {
      setDemoOffline(false);
      showFeedback('Step 15: Network RESTORED (Online Mode)');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded Demo Controls Panel */}
      {isOpen && (
        <div className="mb-2 p-4 w-96 bg-[#081209]/95 backdrop-blur-md border border-[#b7cc75]/30 text-[#f5f1e8] rounded-xl shadow-2xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.15)] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-[#b7cc75] uppercase text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Deterministic Demo Engine
              </span>
              <span className="text-[9px] text-[#8d998b] bg-[#121b12] px-1.5 py-0.5 rounded border border-[#b7cc75]/20">PHASE 10</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('CONTROLS')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeTab === 'CONTROLS' ? 'bg-[#b7cc75] text-[#0b0f0c]' : 'text-[#8d998b]'}`}
              >
                Controls
              </button>
              <button
                onClick={() => setActiveTab('STORY')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeTab === 'STORY' ? 'bg-[#b7cc75] text-[#0b0f0c]' : 'text-[#8d998b]'}`}
              >
                18-Step Story
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="p-2 rounded bg-[#121b12] border border-[#b7cc75]/30 text-[#dfeab1] text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#b7cc75]" /> {actionMessage}
            </div>
          )}

          {activeTab === 'CONTROLS' ? (
            <div className="space-y-2">
              {/* Toggle Offline/Online */}
              <div className="flex items-center justify-between bg-[#0f140f] p-2 rounded border border-[rgba(183,196,170,0.12)]">
                <span className="font-medium text-[#f5f1e8] flex items-center gap-1.5">
                  {demoSettings.forceOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
                  Simulate Offline
                </span>
                <button
                  onClick={() => {
                    const next = !demoSettings.forceOffline;
                    setDemoOffline(next);
                    showFeedback(next ? 'Simulated Offline Mode Enabled' : 'Online Mode Restored');
                  }}
                  className={`px-2.5 py-1 rounded font-semibold text-[11px] transition ${
                    demoSettings.forceOffline ? 'bg-amber-600 text-white' : 'bg-[#172217] text-[#8d998b] hover:text-[#f5f1e8]'
                  }`}
                >
                  {demoSettings.forceOffline ? 'OFFLINE' : 'ONLINE'}
                </button>
              </div>

              {/* Quick Verification Triggers */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    localStorage.setItem('terra-demo-simulate-liveness-fail', 'true');
                    showFeedback('Next check-in will trigger Liveness Failure');
                  }}
                  className="p-2 bg-[#121b12] hover:bg-[#1a261a] border border-red-500/30 rounded text-left text-[11px] text-red-300 font-semibold flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Liveness Fail
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('terra-demo-simulate-unknown', 'true');
                    showFeedback('Next check-in will trigger Unknown Face');
                  }}
                  className="p-2 bg-[#121b12] hover:bg-[#1a261a] border border-amber-500/30 rounded text-left text-[11px] text-amber-300 font-semibold flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Unknown Face
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('terra-demo-simulate-low-confidence', 'true');
                    showFeedback('Next check-in will trigger Low Confidence Review');
                  }}
                  className="p-2 bg-[#121b12] hover:bg-[#1a261a] border border-purple-500/30 rounded text-left text-[11px] text-purple-300 font-semibold flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> Low Match
                </button>
                <button
                  onClick={async () => {
                    await syncEngine.processQueue();
                    showFeedback('Sync engine queue processed');
                  }}
                  className="p-2 bg-[#121b12] hover:bg-[#1a261a] border border-[#b7cc75]/30 rounded text-left text-[11px] text-[#dfeab1] font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#b7cc75]" /> Trigger Sync
                </button>
              </div>
            </div>
          ) : (
            /* 18-Step Story Stepper Tab */
            <div className="space-y-3">
              <div className="p-3 bg-[#0f140f] rounded-lg border border-[#b7cc75]/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#b7cc75] font-bold">Guided Story Step</span>
                  <span className="text-[10px] text-[#8d998b] font-mono">{currentStepIndex + 1} of 18</span>
                </div>
                <h4 className="font-bold text-[#f5f1e8] text-xs">{DEMO_STORY_STEPS[currentStepIndex].title}</h4>
                <p className="text-[11px] text-[#8d998b] mt-1">{DEMO_STORY_STEPS[currentStepIndex].desc}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-3 py-1.5 bg-[#121b12] disabled:opacity-40 text-[#8d998b] rounded text-[11px] font-semibold"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 px-3 py-1.5 bg-[#b7cc75] hover:bg-[#cbe089] text-[#0b0f0c] rounded text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  <SkipForward className="w-3 h-3" /> Advance Story Step
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#081209] text-[#b7cc75] hover:text-[#dfeab1] px-4 py-2 rounded-full border border-[#b7cc75]/30 shadow-xl text-xs font-semibold transition"
      >
        <Sliders className="w-4 h-4 text-[#b7cc75]" />
        <span>Demo Story Controls</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
