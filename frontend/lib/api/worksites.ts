import { authHeaders, requestJson } from './http';

export type WorksiteRecord = {
  id: number;
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters: number;
  active: boolean;
  organization_id?: number;
};

export async function listWorksites(token: string) {
  return requestJson<WorksiteRecord[]>('/api/admin/worksites', { headers: authHeaders(token) });
}
