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
  status: string;
  check_in_at?: string;
  check_out_at?: string;
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
