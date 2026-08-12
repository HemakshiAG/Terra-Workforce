"use client";

import { AppShell } from '@/components/app-shell';
import { ShieldAlert, Check, X, Search, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getReviews, processReview, PendingReview } from '@/lib/api/attendance';

export default function AttendanceReviewPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Decision Modal State
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | 'RECAPTURE' | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;
      const data = await getReviews(token);
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function openDecisionModal(review: PendingReview, action: 'APPROVE' | 'REJECT' | 'RECAPTURE') {
    setSelectedReview(review);
    setModalAction(action);
    setReason('');
  }

  async function submitDecision() {
    if (!selectedReview || !modalAction) return;
    try {
      const token = localStorage.getItem('terra-workforce-token');
      if (!token) return;

      await processReview(token, selectedReview.id, modalAction, reason);
      setReviews(prev => prev.filter(r => r.id !== selectedReview.id));
      setSelectedReview(null);
      setModalAction(null);
    } catch (err: any) {
      alert(err.message || "Failed to process decision");
    }
  }

  const filteredReviews = reviews.filter(r => 
    r.worker_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Attendance Review" subtitle="Verify medium-confidence matches and geofence exceptions">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl text-mist flex items-center gap-2">
          <ShieldAlert size={20} className="text-yellow-500" />
          {reviews.length} cases pending review
        </h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-mist/40" />
            <input 
              type="text" 
              placeholder="Search worker..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#050b07] border border-[#243124] rounded pl-9 pr-3 py-2 text-sm text-mist placeholder:text-mist/30 w-64 focus:outline-none" 
            />
          </div>
          <button onClick={loadReviews} className="rounded border border-[#243124] bg-[#050b07] p-2 text-mist/70 hover:text-mist">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded border border-[#243124] bg-[#081209] p-8 text-center text-mist/50">
          Loading review queue...
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(review => (
            <div key={review.id} className="rounded border border-[#243124] bg-[#081209] p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-lg text-mist">{review.worker_name}</h3>
                  <span className="text-sm font-mono text-mist/60">
                    {new Date(review.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="space-y-1 mb-3">
                  <div className="flex gap-2 text-sm">
                    <span className="text-mist/50 w-28">Match Status:</span>
                    <span className="text-yellow-500 font-medium uppercase">{review.face_match_status}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-mist/50 w-28">Liveness Check:</span>
                    <span className={review.liveness_status === 'PASSED' ? "text-lime" : "text-red-400"}>
                      {review.liveness_status}
                    </span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-mist/50 w-28">Geofence:</span>
                    <span className={review.location_status === 'WITHIN_GEOFENCE' ? "text-lime" : "text-red-400"}>
                      {review.location_status} ({Math.round(review.distance || 0)}m)
                    </span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-mist/50 w-28">Verification:</span>
                    <span className="text-mist/80 uppercase">{review.verification_method}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[150px]">
                <button 
                  onClick={() => openDecisionModal(review, 'APPROVE')}
                  className="rounded border border-lime/30 bg-lime/10 px-4 py-2 text-sm text-lime flex items-center justify-center gap-2 hover:bg-lime/20 transition-colors"
                >
                  <Check size={16} /> Approve Check-in
                </button>
                <button 
                  onClick={() => openDecisionModal(review, 'REJECT')}
                  className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                >
                  <X size={16} /> Reject Match
                </button>
                <button 
                  onClick={() => openDecisionModal(review, 'RECAPTURE')}
                  className="rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-500 flex items-center justify-center gap-2 hover:bg-yellow-500/20 transition-colors"
                >
                  Request Recapture
                </button>
              </div>
            </div>
          ))}
          {filteredReviews.length === 0 && (
            <div className="rounded border border-[#243124] bg-[#050b07] p-8 text-center text-mist/50">
              No pending reviews found.
            </div>
          )}
        </div>
      )}

      {/* Decision Modal */}
      {selectedReview && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded border border-[#243124] bg-[#081209] p-6 text-mist shadow-2xl">
            <h3 className="text-lime uppercase tracking-widest text-xs mb-4">
              Confirm {modalAction.toLowerCase()} decision
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-mist/80">
                You are about to <strong>{modalAction.toLowerCase()}</strong> the verification attempt for <strong>{selectedReview.worker_name}</strong>.
              </p>

              <div>
                <label className="block text-xs text-mist/70 mb-1">Reason / Notes</label>
                <textarea 
                  value={reason} 
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Visually matched employee despite low confidence score."
                  className="w-full bg-[#050b07] border border-[#243124] rounded px-3 py-2 text-sm text-mist focus:outline-none h-20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => { setSelectedReview(null); setModalAction(null); }} 
                  className="rounded border border-[#243124] px-4 py-2 text-xs text-mist/70"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitDecision} 
                  className={`rounded px-4 py-2 text-xs font-semibold ${
                    modalAction === 'APPROVE' ? 'bg-lime/20 border border-lime/30 text-lime' :
                    modalAction === 'REJECT' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
                    'bg-yellow-500/20 border border-yellow-500/30 text-yellow-500'
                  }`}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
