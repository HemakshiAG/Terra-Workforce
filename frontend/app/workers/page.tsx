'use client';

import { AppShell } from '@/components/app-shell';
import { FormEvent, useEffect, useState } from 'react';
import { UserCheck, UserPlus, X, Shield, MapPin } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type Supervisor = {
  id: number;
  name: string;
  email: string;
  role: string;
  worksite_ids?: number[];
};

type Worksite = {
  id: number;
  name: string;
};

export default function SupervisorsAndWorkersPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('ADMIN');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    worksite_ids: [] as number[],
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('terra-workforce-role') ?? 'ADMIN').toUpperCase();
    setUserRole(role);
    loadData();
  }, []);

  async function loadData() {
    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token');
    if (!token) return;

    try {
      setIsLoading(true);
      const [supRes, wsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/supervisors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/worksites`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (supRes.ok) {
        const supData = await supRes.json();
        setSupervisors(Array.isArray(supData) ? supData : []);
      }

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorksites(Array.isArray(wsData) ? wsData : []);
      }
    } catch (err) {
      console.error('Failed to load supervisor data', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleWorksiteToggle(wsId: number) {
    setForm((prev) => {
      const exists = prev.worksite_ids.includes(wsId);
      const updated = exists ? prev.worksite_ids.filter((id) => id !== wsId) : [...prev.worksite_ids, wsId];
      return { ...prev, worksite_ids: updated };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const token = localStorage.getItem('terra-session-token') ?? localStorage.getItem('terra-workforce-token');
    if (!token) {
      setError('Authentication token missing.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/supervisors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail ?? 'Failed to create supervisor.');
      }

      setShowModal(false);
      setForm({ full_name: '', email: '', password: '', worksite_ids: [] });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create supervisor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell
      title={userRole === 'ADMIN' ? 'Supervisor Management' : 'Field Workers'}
      subtitle={userRole === 'ADMIN' ? 'Manage supervisor accounts and field assignments.' : 'Workforce member directory.'}
      allowedRoles={['ADMIN', 'SUPERVISOR']}
    >
      <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.12)] pb-5">
        <div>
          <p className="terra-kicker">{userRole === 'ADMIN' ? 'Authorized Supervisors' : 'Workers'}</p>
          <p className="text-xs text-[#8d998b] mt-1">
            {userRole === 'ADMIN' ? 'Supervisors responsible for field attendance operations.' : 'Registered field workers.'}
          </p>
        </div>
        {userRole === 'ADMIN' ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded border border-[#b7cc75]/35 bg-[#141d14] px-4 py-2 text-xs uppercase tracking-wider text-[#dfeab1] transition hover:bg-[#1a261a]"
          >
            <UserPlus size={14} /> Add Supervisor
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 text-sm text-[#8d998b] animate-pulse">
            Loading accounts…
          </div>
        ) : supervisors.length === 0 ? (
          <div className="rounded border border-dashed border-[rgba(183,196,170,0.18)] bg-[#0c110c] p-6 text-center text-sm text-[#8d998b]">
            No supervisors created yet. Click "Add Supervisor" to create a supervisor account.
          </div>
        ) : (
          supervisors.map((sup) => (
            <div
              key={sup.id}
              className="flex flex-col gap-3 rounded border border-[rgba(183,196,170,0.12)] bg-[#101610] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#b7cc75]/30 bg-[#162016] text-[#b7cc75]">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#f5f1e8]">{sup.name}</h3>
                  <p className="text-xs text-[#8d998b] mt-0.5">{sup.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-[#dfeab1] rounded border border-[rgba(183,196,170,0.12)] bg-[#121a12] px-3 py-1.5">
                  <Shield size={13} className="text-[#b7cc75]" />
                  <span>SUPERVISOR</span>
                </div>
                <div className="text-[#8d998b]">
                  {sup.worksite_ids && sup.worksite_ids.length > 0 ? (
                    <span>Assigned to {sup.worksite_ids.length} worksite(s)</span>
                  ) : (
                    <span>All organization worksites</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supervisor Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded border border-[rgba(183,196,170,0.18)] bg-[#0f140f] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(183,196,170,0.12)] pb-4">
              <h2 className="text-lg font-light text-[#f5f1e8]">Add Supervisor Account</h2>
              <button onClick={() => setShowModal(false)} className="text-[#8d998b] hover:text-[#f5f1e8]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Full Name *</span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Rahul Verma"
                  required
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Email Address *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="supervisor@workspace.com"
                  required
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Password *</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full rounded border border-[rgba(183,196,170,0.12)] bg-[#0b100c] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#b7cc75]/45"
                />
              </label>

              <div>
                <span className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#8d998b]">Assigned Worksites</span>
                {worksites.length === 0 ? (
                  <p className="text-xs text-[#8d998b]">No worksites created yet. Supervisor will have general access.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {worksites.map((ws) => {
                      const checked = form.worksite_ids.includes(ws.id);
                      return (
                        <label key={ws.id} className="flex items-center gap-2 text-xs text-[#f5f1e8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleWorksiteToggle(ws.id)}
                            className="rounded accent-[#b7cc75]"
                          />
                          <span>{ws.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
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
                  {isSubmitting ? 'Creating...' : 'Create Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
