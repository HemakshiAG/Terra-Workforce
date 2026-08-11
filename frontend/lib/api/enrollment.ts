import { authHeaders, requestJson } from './http';
import type { BiometricSample, BiometricEnrollment, CaptureType, QualityStatus, WorkerSummary } from './workers';

export type EnrollmentStartResponse = BiometricEnrollment;

export type EnrollmentCompleteResponse = {
  message: string;
  worker: WorkerSummary;
  enrollment: BiometricEnrollment;
};

export async function startEnrollment(token: string, workerId: number, consentVersion = 'v1') {
  return requestJson<EnrollmentStartResponse>(`/api/workers/${workerId}/enrollment/start`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ consent_version: consentVersion }),
  });
}

export async function captureEnrollmentSample(
  token: string,
  workerId: number,
  payload: { capture_type: CaptureType; image_data: string; quality_status?: QualityStatus }
) {
  return requestJson<BiometricSample>(`/api/workers/${workerId}/enrollment/samples`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      ...payload,
      quality_status: payload.quality_status ?? 'PASS',
    }),
  });
}

export async function completeEnrollment(token: string, workerId: number) {
  return requestJson<EnrollmentCompleteResponse>(`/api/workers/${workerId}/enrollment/complete`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getEnrollment(token: string, workerId: number) {
  return requestJson<{ worker: WorkerSummary; enrollment: BiometricEnrollment | null; samples: BiometricSample[] }>(`/api/workers/${workerId}/enrollment`, {
    headers: authHeaders(token),
  });
}
