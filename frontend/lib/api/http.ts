export type ApiErrorShape = {
  detail?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const payload = await response.json().catch(() => ({} as ApiErrorShape));
  if (!response.ok) {
    throw new ApiError(response.status, payload.detail ?? payload.message ?? 'Request failed.');
  }

  return payload as T;
}

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}
