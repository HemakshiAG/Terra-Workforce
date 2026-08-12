import { db, LocalSyncQueueItem } from '../db';
import { connectivityManager } from './connectivity';

export function generateIdempotencyKey(entityType: string, localId: string | number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `SYNC-${entityType.toUpperCase()}-${localId}-${timestamp}-${random}`;
}

export class SyncEngine {
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-trigger sync when returning online
      window.addEventListener('online', () => {
        setTimeout(() => this.processQueue(), 500);
      });

      // Periodic check every 15 seconds
      setInterval(() => {
        if (connectivityManager.isOnline() && !this.isProcessing) {
          this.processQueue();
        }
      }, 15000);
    }
  }

  public async enqueue(
    entityType: LocalSyncQueueItem['entity_type'],
    operation: LocalSyncQueueItem['operation'],
    localId: string,
    payload: any
  ): Promise<string> {
    const idempotencyKey = generateIdempotencyKey(entityType, localId);
    const now = new Date().toISOString();

    const queueItem: LocalSyncQueueItem = {
      local_id: localId,
      entity_type: entityType,
      operation,
      payload,
      idempotency_key: idempotencyKey,
      status: 'PENDING',
      attempt_count: 0,
      created_at: now,
      updated_at: now,
    };

    await db.sync_queue.add(queueItem);

    // If online, attempt background sync without blocking
    if (connectivityManager.isOnline()) {
      setTimeout(() => this.processQueue(), 100);
    }

    return idempotencyKey;
  }

  public async processQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (this.isProcessing) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    if (connectivityManager.isOffline()) {
      const pendingTotal = await db.sync_queue.where('status').equals('PENDING').count();
      connectivityManager.setSyncState(
        'IDLE',
        pendingTotal > 0 ? `Offline — ${pendingTotal} records waiting to sync.` : 'Offline — attendance continues locally.',
        pendingTotal
      );
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    this.isProcessing = true;

    try {
      const allPending = await db.sync_queue
        .where('status')
        .anyOf(['PENDING', 'FAILED'])
        .toArray();

      const now = new Date();
      // Filter out items that are waiting on exponential backoff
      const pendingItems = allPending.filter((item) => {
        if (!item.next_attempt_at) return true;
        return new Date(item.next_attempt_at) <= now;
      });

      if (pendingItems.length === 0) {
        connectivityManager.setSyncState('COMPLETED', '✓ All records synchronized', 0);
        this.isProcessing = false;
        return { synced: 0, failed: 0, conflicts: 0 };
      }

      connectivityManager.setSyncState('SYNCING', `Syncing ${pendingItems.length} records...`, pendingItems.length);

      const demoSettings = connectivityManager.getDemoSettings();

      // Prepare payload items
      const payloadItems = pendingItems.map((item) => ({
        idempotency_key: item.idempotency_key,
        local_id: item.local_id,
        entity_type: item.entity_type,
        operation: item.operation,
        payload: item.payload,
        force_failure: demoSettings.simulateSyncFailure,
        force_conflict: demoSettings.simulateConflict,
      }));

      let syncedCount = 0;
      let failedCount = 0;
      let conflictCount = 0;

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
        const response = await fetch(`${apiBaseUrl}/api/sync/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payloadItems }),
        });

        if (!response.ok) {
          throw new Error(`Sync HTTP error ${response.status}`);
        }

        const data = await response.json();
        const results: Array<any> = data.results ?? [];

        for (const item of pendingItems) {
          const res = results.find((r) => r.idempotency_key === item.idempotency_key);
          const updateTime = new Date().toISOString();

          if (res && res.status === 'SYNCED') {
            syncedCount++;
            await db.sync_queue.update(item.id!, {
              status: 'SYNCED',
              attempt_count: item.attempt_count + 1,
              last_attempt_at: updateTime,
              updated_at: updateTime,
              error: null,
            });

            // Mark local entity as synced
            if (item.entity_type === 'ATTENDANCE_RECORD') {
              const record = await db.attendance_records.where('local_id').equals(item.local_id).first();
              if (record && record.id) {
                await db.attendance_records.update(record.id, { sync_status: 'SYNCED' });
              }
            } else if (item.entity_type === 'WORKER') {
              const worker = await db.workers.where('local_id').equals(item.local_id).first();
              if (worker && worker.id) {
                await db.workers.update(worker.id, { sync_status: 'SYNCED' });
              }
            }
          } else if (res && res.status === 'CONFLICT') {
            conflictCount++;
            await db.sync_queue.update(item.id!, {
              status: 'CONFLICT',
              attempt_count: item.attempt_count + 1,
              last_attempt_at: updateTime,
              updated_at: updateTime,
              error: 'Attendance conflict detected',
            });

            await db.conflicts.add({
              sync_id: item.id,
              entity_type: item.entity_type,
              idempotency_key: item.idempotency_key,
              local_data: item.payload,
              cloud_data: res.conflict?.cloud ?? { status: 'ABSENT' },
              status: 'PENDING',
              created_at: updateTime,
            });
          } else {
            // Failed or error
            failedCount++;
            const attempts = item.attempt_count + 1;
            // Exponential backoff: 2^attempts seconds (e.g., 2s, 4s, 8s, 16s, max 60s)
            const backoffMs = Math.min(Math.pow(2, attempts) * 1000, 60000);
            const nextAttempt = new Date(Date.now() + backoffMs).toISOString();

            await db.sync_queue.update(item.id!, {
              status: 'FAILED',
              attempt_count: attempts,
              last_attempt_at: updateTime,
              next_attempt_at: nextAttempt,
              updated_at: updateTime,
              error: res?.error ?? 'Network / sync request failed',
            });
          }
        }
      } catch (err: any) {
        // Handle full batch failure (network error)
        for (const item of pendingItems) {
          failedCount++;
          const attempts = item.attempt_count + 1;
          const backoffMs = Math.min(Math.pow(2, attempts) * 1000, 60000);
          const nextAttempt = new Date(Date.now() + backoffMs).toISOString();
          const updateTime = new Date().toISOString();

          await db.sync_queue.update(item.id!, {
            status: 'FAILED',
            attempt_count: attempts,
            last_attempt_at: updateTime,
            next_attempt_at: nextAttempt,
            updated_at: updateTime,
            error: err.message || 'Sync connection error',
          });
        }
      }

      const remainingPending = await db.sync_queue.where('status').equals('PENDING').count();

      if (conflictCount > 0) {
        connectivityManager.setSyncState('CONFLICT', 'Attendance conflict detected. Review required.', remainingPending);
      } else if (failedCount > 0) {
        connectivityManager.setSyncState('FAILED', `Sync failed for ${failedCount} record(s). Retrying...`, remainingPending);
      } else {
        connectivityManager.setSyncState('COMPLETED', '✓ All records synchronized', 0);
      }

      return { synced: syncedCount, failed: failedCount, conflicts: conflictCount };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
