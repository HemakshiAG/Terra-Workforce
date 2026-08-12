import { db, LocalWorker, LocalWorksite, LocalAttendanceSession, LocalAttendanceRecord, LocalAuditLog, LocalWageData } from './index';

export async function seedInitialDataIfEmpty() {
  if (typeof window === 'undefined') return;

  const workerCount = await db.workers.count();
  if (workerCount === 0) {
    const now = new Date().toISOString();

    // 1. Worksites
    const worksiteId = await db.worksites.add({
      local_id: 'LOC-WS-1',
      organization_id: 1,
      name: 'North Agricultural Plot #4',
      description: 'Primary wheat harvesting site',
      latitude: 12.9716,
      longitude: 77.5946,
      geofence_radius_meters: 500,
      active: true,
      sync_status: 'SYNCED',
      updated_at: now
    });

    // 2. Workers
    await db.workers.bulkAdd([
      {
        local_id: 'LOC-W-101',
        worker_id: 'W-101',
        worker_code: 'W-101',
        name: 'Ramesh Kumar',
        full_name: 'Ramesh Kumar',
        role: 'WORKER',
        status: 'ACTIVE',
        worksite_id: Number(worksiteId),
        organization_id: 1,
        biometric_enrollment_status: 'COMPLETED',
        face_template: JSON.stringify(new Array(512).fill(0.5)),
        sync_status: 'SYNCED',
        created_at: now,
        updated_at: now
      },
      {
        local_id: 'LOC-W-102',
        worker_id: 'W-102',
        worker_code: 'W-102',
        name: 'Sunita Devi',
        full_name: 'Sunita Devi',
        role: 'HELPER',
        status: 'ACTIVE',
        worksite_id: Number(worksiteId),
        organization_id: 1,
        biometric_enrollment_status: 'COMPLETED',
        face_template: JSON.stringify(new Array(512).fill(0.8)),
        sync_status: 'SYNCED',
        created_at: now,
        updated_at: now
      },
      {
        local_id: 'LOC-W-103',
        worker_id: 'W-103',
        worker_code: 'W-103',
        name: 'Ananya Sharma',
        full_name: 'Ananya Sharma',
        role: 'WORKER',
        status: 'ACTIVE',
        worksite_id: Number(worksiteId),
        organization_id: 1,
        biometric_enrollment_status: 'COMPLETED',
        face_template: JSON.stringify(new Array(512).fill(0.2)),
        sync_status: 'SYNCED',
        created_at: now,
        updated_at: now
      }
    ]);

    // 3. Attendance Session
    const sessionId = await db.attendance_sessions.add({
      local_id: 'LOC-SES-1',
      organization_id: 1,
      worksite_id: Number(worksiteId),
      session_type: 'MORNING',
      status: 'OPEN',
      date: now.split('T')[0],
      scheduled_start: now,
      scheduled_end: new Date(Date.now() + 28800000).toISOString(),
      actual_start: now,
      sync_status: 'SYNCED',
      updated_at: now
    });

    // 4. Initial Attendance Record
    await db.attendance_records.add({
      local_id: 'LOC-ATT-101',
      worker_id: 1,
      worker_code: 'W-101',
      worker_name: 'Ramesh Kumar',
      session_id: Number(sessionId),
      session_type: 'MORNING',
      status: 'PRESENT',
      verification_method: 'FACE',
      check_in_at: now,
      latitude: 12.9716,
      longitude: 77.5946,
      distance: 12.4,
      face_match_status: 'MATCHED',
      liveness_status: 'PASSED',
      location_status: 'WITHIN_GEOFENCE',
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    });

    // 5. Audit Log
    await db.audit_logs.add({
      local_id: 'LOC-AUD-1',
      organization_id: 1,
      actor_user_id: 1,
      action: 'SYSTEM_INIT',
      target_type: 'SYSTEM',
      target_id: 'LOCAL_DB',
      details_json: JSON.stringify({ message: 'Offline database initialized with seed data' }),
      sync_status: 'SYNCED',
      created_at: now
    });

    // 6. Wage Data
    await db.wage_data.bulkAdd([
      {
        local_id: 'LOC-WAGE-101',
        worker_id: 'W-101',
        payable_days: 12.5,
        daily_rate: 450,
        estimated_wage: 5625,
        sync_status: 'SYNCED',
        created_at: now
      },
      {
        local_id: 'LOC-WAGE-102',
        worker_id: 'W-102',
        payable_days: 14.0,
        daily_rate: 450,
        estimated_wage: 6300,
        sync_status: 'SYNCED',
        created_at: now
      }
    ]);
  }
}
