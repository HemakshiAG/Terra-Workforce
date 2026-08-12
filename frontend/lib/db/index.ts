import Dexie, { Table } from 'dexie';

export interface LocalWorker {
  id?: number;
  local_id: string;
  worker_id: string;
  worker_code: string;
  name: string;
  full_name: string;
  role: string;
  status: string;
  worksite_id: number;
  organization_id: number;
  face_template?: string;
  biometric_enrollment_status: string;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  created_at: string;
  updated_at: string;
}

export interface LocalWorksite {
  id?: number;
  local_id: string;
  organization_id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  active: boolean;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  updated_at: string;
}

export interface LocalBiometricTemplate {
  id?: number;
  local_id: string;
  worker_id: number | string;
  template_data: string;
  status: string;
  quality_status: string;
  updated_at: string;
}

export interface LocalAttendanceSession {
  id?: number;
  local_id: string;
  organization_id: number;
  worksite_id: number;
  session_type: string;
  status: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  updated_at: string;
}

export interface LocalAttendanceRecord {
  id?: number;
  local_id: string;
  worker_id: number;
  worker_code?: string;
  worker_name?: string;
  session_id: number;
  session_type?: string;
  status: 'PRESENT' | 'ABSENT' | 'PENDING_REVIEW' | 'REJECTED' | 'CORRECTED';
  verification_method: 'FACE' | 'QR' | 'MANUAL';
  check_in_at?: string;
  check_out_at?: string;
  break_start?: string;
  break_end?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  face_match_status?: string;
  liveness_status?: string;
  location_status?: string;
  idempotency_key?: string;
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  created_at: string;
  updated_at: string;
}

export interface LocalAttendanceEvent {
  id?: number;
  local_id: string;
  session_id: number;
  worker_id?: number;
  verification_method: string;
  face_match_status: string;
  liveness_status: string;
  location_status: string;
  result: string;
  failure_reason?: string;
  timestamp: string;
}

export interface LocalAuditLog {
  id?: number;
  local_id: string;
  organization_id: number;
  actor_user_id: number;
  action: string;
  target_type?: string;
  target_id?: string;
  details_json?: string;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: string;
}

export interface LocalWageData {
  id?: number;
  local_id: string;
  worker_id: string;
  payable_days: number;
  daily_rate: number;
  estimated_wage: number;
  sync_status: 'PENDING' | 'SYNCED';
  created_at: string;
}

export interface LocalSyncQueueItem {
  id?: number;
  local_id: string;
  entity_type: 'WORKER' | 'ATTENDANCE_RECORD' | 'ATTENDANCE_SESSION' | 'AUDIT_LOG' | 'BIOMETRIC_TEMPLATE' | 'WAGE_RECORD';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'CHECK_IN' | 'CHECK_OUT';
  payload: any;
  idempotency_key: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  attempt_count: number;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
  created_at: string;
  updated_at: string;
  error?: string | null;
}

export interface LocalConflictRecord {
  id?: number;
  sync_id?: number;
  entity_type: string;
  idempotency_key: string;
  local_data: any;
  cloud_data: any;
  status: 'PENDING' | 'RESOLVED';
  resolution?: 'KEEP_LOCAL' | 'KEEP_CLOUD' | 'OVERWRITE';
  created_at: string;
}

export class TerraDatabase extends Dexie {
  workers!: Table<LocalWorker>;
  worksites!: Table<LocalWorksite>;
  biometric_templates!: Table<LocalBiometricTemplate>;
  attendance_sessions!: Table<LocalAttendanceSession>;
  attendance_records!: Table<LocalAttendanceRecord>;
  attendance_events!: Table<LocalAttendanceEvent>;
  audit_logs!: Table<LocalAuditLog>;
  wage_data!: Table<LocalWageData>;
  sync_queue!: Table<LocalSyncQueueItem>;
  conflicts!: Table<LocalConflictRecord>;

  constructor() {
    super('terra_workforce_db');
    this.version(1).stores({
      workers: '++id, &local_id, worker_id, worker_code, worksite_id, organization_id, sync_status, updated_at',
      worksites: '++id, &local_id, organization_id, active, sync_status, updated_at',
      biometric_templates: '++id, &local_id, worker_id, updated_at',
      attendance_sessions: '++id, &local_id, worksite_id, status, sync_status, updated_at',
      attendance_records: '++id, &local_id, worker_id, session_id, status, sync_status, updated_at',
      attendance_events: '++id, &local_id, session_id, worker_id, timestamp',
      audit_logs: '++id, &local_id, action, created_at, sync_status',
      wage_data: '++id, &local_id, worker_id, created_at',
      sync_queue: '++id, &local_id, &idempotency_key, entity_type, status, attempt_count, created_at, updated_at',
      conflicts: '++id, sync_id, idempotency_key, status, created_at'
    });
  }
}

export const db = new TerraDatabase();
