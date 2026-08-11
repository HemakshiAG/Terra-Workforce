'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type SyncItem = {
  id: string;
  queue_id: string;
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
};

export default function SettingsPage() {
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadSyncQueue() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sync/queue`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Unable to load sync queue');
        }
        const data = await response.json();
        setSyncQueue(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load sync queue', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSyncQueue();
  }, []);

  return (
    <AppShell title="Settings" subtitle="Security, consent, and offline sync controls for the local workforce workflow.">
      {isLoading ? <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">Loading settings…</div> : null}
      <div className="space-y-3">
        <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">
          <p className="text-mist">Offline mode</p>
          <p className="mt-1">Local checks remain available when connectivity drops, and sync events queue automatically for replay.</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">
          <p className="text-mist">Biometric consent</p>
          <p className="mt-1">Enrollment and revocation remain explicit, auditable, and tied to the worker registry.</p>
        </div>
        <div className="rounded border border-[#243124] bg-[#081209] p-4 text-sm text-mist/70">
          <p className="text-mist">Sync queue</p>
          <p className="mt-1">{syncQueue.length > 0 ? `${syncQueue.length} queue entries are pending replay.` : 'No pending queue entries.'}</p>
        </div>
      </div>
    </AppShell>
  );
}
