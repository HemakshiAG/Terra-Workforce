import { authHeaders, requestJson } from './http';

export type WorkerStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_ENROLLMENT';
export type IdentityVerificationStatus = 'PENDING' | 'VERIFIED' | 'MANUAL_REVIEW' | 'REJECTED';
export type BiometricEnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type IdentityType = 'AADHAAR' | 'VOTER_ID' | 'OTHER';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
export type CaptureType = 'CENTER' | 'LEFT' | 'RIGHT' | 'NEUTRAL' | 'SMILE' | 'LIVENESS';
export type QualityStatus = 'PASS' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'IMAGE_TOO_DARK' | 'IMAGE_TOO_BLURRY' | 'IMAGE_TOO_SMALL' | 'NO_CAMERA';

export type WorkerSummary = {
  id: number;
  organization_id: number;
  worksite_id: number | null;
  worker_code: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  role: string;
  status: WorkerStatus;
  identity_type?: IdentityType | null;
  identity_number_masked?: string | null;
  identity_verification_status: IdentityVerificationStatus;
  consent_given: boolean;
  consent_timestamp?: string | null;
  consent_version?: string | null;
  biometric_enrollment_status: BiometricEnrollmentStatus;
  worksite_name?: string | null;
  created_at: string;
  updated_at: string;
  enrollment?: BiometricEnrollment | null;
  samples_count?: number;
};

export type BiometricSample = {
  id: number;
  capture_type: CaptureType;
  quality_status: QualityStatus;
  created_at: string;
};

export type BiometricEnrollment = {
  id: number;
  worker_id: number;
  organization_id: number;
  status: BiometricEnrollmentStatus | string;
  consent_version?: string | null;
  created_at: string;
  completed_at?: string | null;
  samples: BiometricSample[];
};

export type WorkerListResponse = {
  workers: WorkerSummary[];
  stats: {
    total_workers: number;
    active: number;
    pending_enrollment: number;
    inactive: number;
  };
};

export type WorkerCreateRequest = {
  full_name: string;
  worker_code?: string;
  date_of_birth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  worksite_id: number;
  role?: string;
};

export type WorkerUpdateRequest = Partial<Pick<WorkerCreateRequest, 'full_name' | 'phone' | 'address' | 'emergency_contact' | 'worksite_id' | 'role'>> & {
  status?: WorkerStatus;
};

export type WorkerIdentityRequest = {
  identity_type: IdentityType;
  identity_number: string;
  verification_status?: IdentityVerificationStatus;
  manual_review_reason?: string | null;
};

export type WorkerConsentRequest = {
  consent_given: boolean;
  consent_version?: string;
};

export async function listWorkers(token: string) {
  return requestJson<WorkerListResponse>('/api/workers', { headers: authHeaders(token) });
}

export async function createWorker(token: string, payload: WorkerCreateRequest) {
  return requestJson<WorkerSummary>('/api/workers', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getWorker(token: string, workerId: number) {
  return requestJson<WorkerSummary>(`/api/workers/${workerId}`, { headers: authHeaders(token) });
}

export async function updateWorker(token: string, workerId: number, payload: WorkerUpdateRequest) {
  return requestJson<WorkerSummary>(`/api/workers/${workerId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function deactivateWorker(token: string, workerId: number) {
  return requestJson<{ message: string }>(`/api/workers/${workerId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function updateWorkerIdentity(token: string, workerId: number, payload: WorkerIdentityRequest) {
  return requestJson<WorkerSummary>(`/api/workers/${workerId}/identity`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function recordWorkerConsent(token: string, workerId: number, payload: WorkerConsentRequest) {
  return requestJson<WorkerSummary>(`/api/workers/${workerId}/consent`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getWorkerEnrollment(token: string, workerId: number) {
  return requestJson<{ worker: WorkerSummary; enrollment: BiometricEnrollment | null; samples: BiometricSample[] }>(`/api/workers/${workerId}/enrollment`, {
    headers: authHeaders(token),
  });
}
