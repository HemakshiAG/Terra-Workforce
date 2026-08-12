import { db } from './index';

export async function seedInitialDataIfEmpty() {
  if (typeof window === 'undefined') return;

  const workerCount = await db.workers.count();
  if (workerCount < 10) {
    await db.workers.clear();
    await db.worksites.clear();
    await db.attendance_sessions.clear();
    await db.attendance_records.clear();
    await db.audit_logs.clear();
    await db.wage_data.clear();

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    // 1. Worksites (2 Agricultural Worksites)
    const ws1Id = await db.worksites.add({
      local_id: 'LOC-WS-1',
      organization_id: 1,
      name: 'North Agricultural Plot #4 (Green Valley)',
      description: 'Wheat & Mustard harvesting Sector A',
      latitude: 12.9716,
      longitude: 77.5946,
      geofence_radius_meters: 500,
      active: true,
      sync_status: 'SYNCED',
      updated_at: now
    });

    const ws2Id = await db.worksites.add({
      local_id: 'LOC-WS-2',
      organization_id: 1,
      name: 'South Cotton Irrigation Basin #2',
      description: 'Cotton picking & drip irrigation sector',
      latitude: 12.9352,
      longitude: 77.6245,
      geofence_radius_meters: 400,
      active: true,
      sync_status: 'SYNCED',
      updated_at: now
    });

    // 2. 25 Workers Seed
    const workerSeedData = [
      { code: 'W-101', name: 'Ramesh Kumar', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-102', name: 'Sunita Devi', role: 'HELPER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-103', name: 'Ananya Sharma', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-104', name: 'Vikram Singh', role: 'MASON', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-105', name: 'Pooja Patel', role: 'HARVESTER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-106', name: 'Amitabh Roy', role: 'OPERATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-107', name: 'Kavita Verma', role: 'HELPER', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-108', name: 'Suresh Yadav', role: 'IRRIGATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-109', name: 'Meena Kumari', role: 'PACKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-110', name: 'Rajesh Mishra', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-111', name: 'Pankaj Gautam', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-112', name: 'Deepak Sharma', role: 'OPERATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-113', name: 'Aarti Devi', role: 'HARVESTER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-114', name: 'Manish Tiwari', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-115', name: 'Sarita Rao', role: 'HELPER', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-116', name: 'Ganesh Shinde', role: 'IRRIGATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-117', name: 'Lata Patil', role: 'PACKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-118', name: 'Santosh Pawar', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-119', name: 'Rekha Gupta', role: 'HELPER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-120', name: 'Anil Deshmukh', role: 'OPERATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-121', name: 'Kiran More', role: 'WORKER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-122', name: 'Nisha Thakur', role: 'HARVESTER', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-123', name: 'Ashok Jha', role: 'IRRIGATOR', site: ws2Id, status: 'ACTIVE' },
      { code: 'W-124', name: 'Bhagwan Reddy', role: 'MASON', site: ws1Id, status: 'ACTIVE' },
      { code: 'W-125', name: 'Champa Bai', role: 'HELPER', site: ws1Id, status: 'ACTIVE' },
    ];

    const addedWorkers = [];
    for (let i = 0; i < workerSeedData.length; i++) {
      const item = workerSeedData[i];
      const wId = await db.workers.add({
        local_id: `LOC-W-${101 + i}`,
        worker_id: item.code,
        worker_code: item.code,
        name: item.name,
        full_name: item.name,
        role: item.role,
        status: item.status,
        worksite_id: Number(item.site),
        organization_id: 1,
        biometric_enrollment_status: 'COMPLETED',
        face_template: JSON.stringify(new Array(512).fill(0.1 * (i + 1))),
        sync_status: 'SYNCED',
        created_at: now,
        updated_at: now
      });
      addedWorkers.push({ id: Number(wId), ...item });
    }

    // 3. Attendance Session
    const sesId = await db.attendance_sessions.add({
      local_id: 'LOC-SES-1',
      organization_id: 1,
      worksite_id: Number(ws1Id),
      session_type: 'MORNING',
      status: 'OPEN',
      date: todayStr,
      scheduled_start: now,
      scheduled_end: new Date(Date.now() + 28800000).toISOString(),
      actual_start: now,
      sync_status: 'SYNCED',
      updated_at: now
    });

    // 4. Seed Validated Attendance Records & Anomaly Exceptions
    // 18 Present Workers
    for (let i = 0; i < 18; i++) {
      const w = addedWorkers[i];
      await db.attendance_records.add({
        local_id: `LOC-ATT-${101 + i}`,
        worker_id: w.id,
        worker_code: w.code,
        worker_name: w.name,
        session_id: Number(sesId),
        session_type: 'MORNING',
        status: 'PRESENT',
        verification_method: 'FACE',
        check_in_at: new Date(Date.now() - (i * 300000)).toISOString(),
        latitude: 12.9716,
        longitude: 77.5946,
        distance: 14.2,
        face_match_status: 'MATCHED',
        liveness_status: 'PASSED',
        location_status: 'WITHIN_GEOFENCE',
        sync_status: 'SYNCED',
        created_at: now,
        updated_at: now
      });
    }

    // 2 Low-Confidence Pending Review Cases
    await db.attendance_records.add({
      local_id: 'LOC-ATT-119-REV',
      worker_id: addedWorkers[18].id,
      worker_code: addedWorkers[18].code,
      worker_name: addedWorkers[18].name,
      session_id: Number(sesId),
      session_type: 'MORNING',
      status: 'PENDING_REVIEW',
      verification_method: 'FACE',
      check_in_at: now,
      latitude: 12.9716,
      longitude: 77.5946,
      distance: 22.0,
      face_match_status: 'LOW_CONFIDENCE',
      liveness_status: 'PASSED',
      location_status: 'WITHIN_GEOFENCE',
      sync_status: 'PENDING',
      created_at: now,
      updated_at: now
    });

    // 1 Geofence Violation Case
    await db.attendance_records.add({
      local_id: 'LOC-ATT-120-GEO',
      worker_id: addedWorkers[19].id,
      worker_code: addedWorkers[19].code,
      worker_name: addedWorkers[19].name,
      session_id: Number(sesId),
      session_type: 'MORNING',
      status: 'PENDING_REVIEW',
      verification_method: 'FACE',
      check_in_at: now,
      latitude: 13.0500,
      longitude: 77.7000,
      distance: 850.0,
      face_match_status: 'MATCHED',
      liveness_status: 'PASSED',
      location_status: 'OUTSIDE_GEOFENCE',
      sync_status: 'PENDING',
      created_at: now,
      updated_at: now
    });

    // 5. Seed Audit Logs
    await db.audit_logs.bulkAdd([
      {
        local_id: 'LOC-AUD-101',
        organization_id: 1,
        actor_user_id: 1,
        action: 'SYSTEM_INIT',
        target_type: 'SYSTEM',
        target_id: 'LOCAL_DB',
        details_json: JSON.stringify({ message: 'Seeded 25 workers & agricultural worksites' }),
        sync_status: 'SYNCED',
        created_at: now
      },
      {
        local_id: 'LOC-AUD-102',
        organization_id: 1,
        actor_user_id: 1,
        action: 'SESSION_STARTED',
        target_type: 'SESSION',
        target_id: 'LOC-SES-1',
        details_json: JSON.stringify({ worksite: 'North Agricultural Plot #4' }),
        sync_status: 'SYNCED',
        created_at: now
      }
    ]);

    // 6. Seed Wage Records
    for (let i = 0; i < addedWorkers.length; i++) {
      const w = addedWorkers[i];
      const days = i < 18 ? 14.5 : 10.0;
      const rate = 450;
      await db.wage_data.add({
        local_id: `LOC-WAGE-${101 + i}`,
        worker_id: w.code,
        payable_days: days,
        daily_rate: rate,
        estimated_wage: days * rate,
        sync_status: 'SYNCED',
        created_at: now
      });
    }
  }
}
