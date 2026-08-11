'use client';

import { AppShell } from '@/components/app-shell';
import { FormEvent, useEffect, useState } from 'react';
import { MapPin, Plus, Navigation, CheckCircle, X, Edit2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type Worksite = {
  id: number;
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters: number;
  active: boolean;
};

export default function WorksitesPage() {
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('ADMIN');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    geofence_radius_meters: '100',
    active: true,
  });

  const [locationStatus, setLocationStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('terra-workforce-role') ?? 'ADMIN').toUpperCase();
    setUserRole(role);
    loadWorksites();
  }, []);

  async function loadWorksites() {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/worksites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorksites(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load worksites', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('Requesting browser location permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocationStatus('Current location acquired!');
      },
      (geoErr) => {
        setLocationStatus(`Location error: ${geoErr.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openCreateModal() {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      geofence_radius_meters: '100',
      active: true,
    });
    setLocationStatus('');
    setError('');
    setShowModal(true);
  }

  function openEditModal(site: Worksite) {
    setEditingId(site.id);
    setForm({
      name: site.name,
      description: site.description ?? '',
      latitude: site.latitude !== null && site.latitude !== undefined ? String(site.latitude) : '',
      longitude: site.longitude !== null && site.longitude !== undefined ? String(site.longitude) : '',
      geofence_radius_meters: String(site.geofence_radius_meters),
      active: site.active,
    });
    setLocationStatus('');
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token') ?? '';
    if (!token) {
      setError('Authentication token missing.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      geofence_radius_meters: parseFloat(form.geofence_radius_meters) || 100.0,
      active: form.active,
    };

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/admin/worksites/${editingId}`
        : `${API_BASE_URL}/api/admin/worksites`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail ?? 'Failed to save worksite.');
      }

      setShowModal(false);
      loadWorksites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save worksite.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Worksites & Geofences"
      subtitle="Verified worksite locations and radius boundaries."
      allowedRoles={['ADMIN', 'SUPERVISOR']}
    >
      <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.12)] pb-5">
        <div>
          <p className="terra-kicker">Field Locations</p>
          <p className="text-xs text-[#8d998b] mt-1">Configured worksites for geofence validation.</p>
        </div>
        {userRole === 'ADMIN' ? (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]"
          >
            <Plus size={14} /> Add Worksite
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b] animate-pulse">
            Loading worksites…
          </div>
        ) : worksites.length === 0 ? (
          <div className="rounded border border-dashed border-[rgba(183,196,170,0.18)] bg-[#0c110c] p-6 text-center text-sm text-[#8d998b]">
            No worksites created yet. {userRole === 'ADMIN' ? 'Click "Add Worksite" to create your first field location.' : ''}
          </div>
        ) : (
          worksites.map((site) => (
            <div
              key={site.id}
              className="flex flex-col gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#b7cc75]/30 bg-[#161f16] text-[#b7cc75]">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-[#f5f1e8]">{site.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${site.active ? 'bg-[#152415] text-[#b7cc75] border border-[#b7cc75]/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {site.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {site.description ? <p className="text-xs text-[#8d998b] mt-1">{site.description}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#a8b1a1]">
                    <span>Geofence: <strong>{site.geofence_radius_meters}m</strong></span>
                    {site.latitude !== null && site.longitude !== null ? (
                      <span>Coordinates: <strong>{site.latitude}, {site.longitude}</strong></span>
                    ) : (
                      <span className="text-[#8d998b]">Coordinates: Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {userRole === 'ADMIN' ? (
                <button
                  onClick={() => openEditModal(site)}
                  className="inline-flex items-center gap-1.5 rounded border border-[rgba(183,196,170,0.12)] bg-[#141a14] px-3 py-1.5 text-xs text-[#dfeab1] transition hover:bg-[#1a231a]"
                >
                  <Edit2 size={13} /> Edit
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Modal for Create/Edit Worksite */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.12)] pb-4">
              <h2 className="text-lg font-light text-[#f5f1e8]">
                {editingId ? 'Edit Worksite' : 'Create Worksite'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#8d998b] hover:text-[#f5f1e8]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Worksite Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Green Valley Field 01"
                  required
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Wheat sector boundaries and gate entry"
                  rows={2}
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="13.0827"
                    className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="80.2707"
                    className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                  />
                </label>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/30 bg-[#162016] px-3 py-1.5 text-xs text-[#dfeab1] transition hover:bg-[#1d2b1d]"
                >
                  <Navigation size={13} className="text-[#b7cc75]" />
                  Use current location
                </button>
                {locationStatus ? <p className="mt-1 text-xs text-[#b7cc75]">{locationStatus}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Geofence Radius (meters)</span>
                  <input
                    type="number"
                    value={form.geofence_radius_meters}
                    onChange={(e) => setForm({ ...form, geofence_radius_meters: e.target.value })}
                    className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                  />
                </label>

                <label className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#b7cc75]"
                  />
                  <span className="text-sm text-[#f5f1e8]">Active Worksite</span>
                </label>
              </div>

              {error ? <p className="text-xs text-[#f39d7b]">{error}</p> : null}

              <div className="mt-6 flex justify-end gap-3 border-t border-[rgba(183,196,170,0.12)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border border-[rgba(183,196,170,0.12)] px-4 py-2 text-xs text-[#8d998b] hover:text-[#f5f1e8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="terra-btn text-xs px-5"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Worksite' : 'Create Worksite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
