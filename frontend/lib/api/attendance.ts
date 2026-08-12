import { requestJson, authHeaders } from './http';

export interface AttendanceSession {
  id: number;
  organization_id: number;
  worksite_id: number;
  created_by: number;
  session_type: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationAttemptRequest {
  session_id: number;
  worker_id?: number;
  verification_method: string;
  face_image_data?: string;
  latitude?: number;
  longitude?: number;
}

export interface VerificationAttemptResponse {
  id: number;
  session_id: number;
  worker_id?: number;
  timestamp: string;
  verification_method: string;
  face_match_status: string;
  liveness_status: string;
  location_status: string;
  distance_from_worksite?: number;
  result: string;
  failure_reason?: string;
}

export interface AttendanceRecord {
  id: number;
  worker_id: number;
  worker_code?: string;
  worker_name?: string;
  session_id: number;
  session_type?: string;
  status: string;
  verification_method: string;
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
}

export interface PendingReview {
  id: number;
  session_id: number;
  worker_id: number;
  worker_name: string;
  timestamp: string;
  verification_method: string;
  face_match_status: string;
  liveness_status: string;
  location_status: string;
  distance?: number;
  result: string;
}

export async function createSession(token: string, data: { worksite_id: number, session_type: string, date: string, scheduled_start: string, scheduled_end: string }) {
  return requestJson<AttendanceSession>('/api/attendance/sessions', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(token) });
}

export async function getSessions(token: string, worksiteId: number) {
  return requestJson<AttendanceSession[]>(`/api/attendance/sessions?worksite_id=${worksiteId}`, { headers: authHeaders(token) });
}

export async function openSession(token: string, sessionId: number) {
  return requestJson<AttendanceSession>(`/api/attendance/sessions/${sessionId}/open`, { method: 'POST', headers: authHeaders(token) });
}

export async function closeSession(token: string, sessionId: number) {
  return requestJson<AttendanceSession>(`/api/attendance/sessions/${sessionId}/close`, { method: 'POST', headers: authHeaders(token) });
}

export async function verifyAttendance(token: string, data: VerificationAttemptRequest) {
  return requestJson<VerificationAttemptResponse>('/api/attendance/verify', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(token) });
}

export async function checkIn(token: string, verificationAttemptId: number) {
  return requestJson<AttendanceRecord>('/api/attendance/check-in', { method: 'POST', body: JSON.stringify({ verification_attempt_id: verificationAttemptId }), headers: authHeaders(token) });
}

export async function checkOut(token: string, sessionId: number, workerId: number) {
  return requestJson<AttendanceRecord>('/api/attendance/check-out', { method: 'POST', body: JSON.stringify({ session_id: sessionId, worker_id: workerId }), headers: authHeaders(token) });
}

export async function generateQR(token: string, sessionId: number) {
  return requestJson<{ token: string, expires_at: string }>('/api/attendance/qr/generate', { method: 'POST', body: JSON.stringify({ session_id: sessionId }), headers: authHeaders(token) });
}

export async function verifyQR(tokenString: string, workerId: number, latitude?: number, longitude?: number) {
  return requestJson<VerificationAttemptResponse>('/api/attendance/qr/verify', { method: 'POST', body: JSON.stringify({ token: tokenString, worker_id: workerId, latitude, longitude }) });
}

export async function breakStart(token: string, sessionId: number, workerId: number) {
  return requestJson<AttendanceRecord>('/api/attendance/break-start', { method: 'POST', body: JSON.stringify({ session_id: sessionId, worker_id: workerId }), headers: authHeaders(token) });
}

export async function breakEnd(token: string, sessionId: number, workerId: number) {
  return requestJson<AttendanceRecord>('/api/attendance/break-end', { method: 'POST', body: JSON.stringify({ session_id: sessionId, worker_id: workerId }), headers: authHeaders(token) });
}

export async function listAttendance(token: string, filters: { date?: string, search?: string, status?: string, worksite_id?: number, session_id?: number }) {
  const params = new URLSearchParams();
  if (filters.date) params.append('date', filters.date);
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.worksite_id) params.append('worksite_id', String(filters.worksite_id));
  if (filters.session_id) params.append('session_id', String(filters.session_id));
  
  return requestJson<AttendanceRecord[]>(`/api/attendance?${params.toString()}`, { headers: authHeaders(token) });
}

export async function getReviews(token: string) {
  return requestJson<PendingReview[]>('/api/attendance/reviews', { headers: authHeaders(token) });
}

export async function processReview(token: string, attemptId: number, action: 'APPROVE' | 'REJECT' | 'RECAPTURE', reason?: string) {
  return requestJson<{ id: number, result: string }>(`/api/attendance/reviews/${attemptId}`, {
    method: 'POST',
    body: JSON.stringify({ action, reason }),
    headers: authHeaders(token)
  });
}

export async function markManualAttendance(token: string, data: { session_id: number, worker_id: number, reason: string }) {
  return requestJson<AttendanceRecord>('/api/attendance/manual', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token)
  });
}
