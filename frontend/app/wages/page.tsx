'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';
import { Wallet, Calculator, FileText, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type WageRecord = {
  worker_id: number;
  worker_code: string;
  worker_name: string;
  payable_days: number;
  total_hours: number;
  overtime_hours: number;
  daily_rate: number;
  hourly_rate: number;
  regular_wage: number;
  overtime_wage: number;
  estimated_wage: number;
  label: string;
  status: string;
};

type WageRule = {
  id?: number;
  rule_name: string;
  calculation_type: string;
  daily_rate: number;
  hourly_rate: number;
  standard_hours_per_day: number;
  overtime_allowed: boolean;
  overtime_rate_multiplier: number;
};

export default function WagesPage() {
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([]);
  const [wageRule, setWageRule] = useState<WageRule>({
    rule_name: 'Standard Daily Rate',
    calculation_type: 'DAILY',
    daily_rate: 450.0,
    hourly_rate: 60.0,
    standard_hours_per_day: 8.0,
    overtime_allowed: true,
    overtime_rate_multiplier: 1.5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [disclaimer, setDisclaimer] = useState('Estimated wage — does not constitute final payroll.');
  const [showConfig, setShowConfig] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadWageData();
  }, []);

  async function loadWageData() {
    setIsLoading(true);
    const token = localStorage.getItem('terra-workforce-token');

    try {
      if (token) {
        // Fetch Rule
        const ruleRes = await fetch(`${API_BASE_URL}/api/wages/rules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ruleRes.ok) {
          const ruleData = await ruleRes.json();
          if (ruleData.rules && ruleData.rules.length > 0) {
            setWageRule(ruleData.rules[0]);
          }
        }

        // Calculate / Fetch Wages
        const calcRes = await fetch(`${API_BASE_URL}/api/wages/calculate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (calcRes.ok) {
          const calcData = await calcRes.json();
          setWageRecords(calcData.records || []);
          if (calcData.disclaimer) setDisclaimer(calcData.disclaimer);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Network wage calculation failed, falling back to local DB', err);
    }

    // Offline Fallback
    try {
      const { db } = await import('@/lib/db');
      const localRecords = await db.attendance_records.toArray();
      const localWorkers = await db.workers.toArray();

      const calculated: WageRecord[] = localWorkers.map((w, index) => {
        const workerRecords = localRecords.filter((r) => r.worker_id === w.id || r.worker_code === w.worker_code);
        const days = Math.max(1, workerRecords.filter((r) => r.status === 'PRESENT' || r.status === 'CORRECTED').length);
        const hours = days * 8;
        const estWage = days * wageRule.daily_rate;

        return {
          worker_id: w.id || index + 1,
          worker_code: w.worker_code || `W-10${index + 1}`,
          worker_name: w.full_name || w.name,
          payable_days: days,
          total_hours: hours,
          overtime_hours: 0,
          daily_rate: wageRule.daily_rate,
          hourly_rate: wageRule.hourly_rate,
          regular_wage: estWage,
          overtime_wage: 0,
          estimated_wage: estWage,
          label: 'Estimated wage',
          status: 'ESTIMATED',
        };
      });

      setWageRecords(calculated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCalculateWages = async () => {
    setIsCalculating(true);
    await loadWageData();
    setIsCalculating(false);
    setMessage('Estimated wages recalculated from validated attendance records.');
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaveRule = async () => {
    const token = localStorage.getItem('terra-workforce-token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/wages/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(wageRule),
      });
      if (res.ok) {
        setMessage('Wage rule updated successfully.');
        setShowConfig(false);
        await loadWageData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportWageCSV = async () => {
    const token = localStorage.getItem('terra-workforce-token');
    if (token) {
      window.open(`${API_BASE_URL}/api/reports/export/csv?type=wage_summary`, '_blank');
      return;
    }

    // Local CSV Fallback
    const headers = ['Worker Code', 'Worker Name', 'Payable Days', 'Total Hours', 'Overtime Hours', 'Daily Rate', 'Estimated Wage', 'Status'];
    const rows = wageRecords.map((r) => [
      r.worker_code,
      r.worker_name,
      r.payable_days,
      r.total_hours,
      r.overtime_hours,
      r.daily_rate,
      r.estimated_wage,
      'Estimated wage',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `terra_wage_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPayableDays = wageRecords.reduce((acc, r) => acc + r.payable_days, 0);
  const totalEstimatedPayout = wageRecords.reduce((acc, r) => acc + r.estimated_wage, 0);

  return (
    <AppShell title="Wages & Payroll Intelligence" subtitle="Transparent wage estimation calculated strictly from validated attendance records." allowedRoles={['ADMIN', 'SUPERVISOR']}>
      {/* Prominent Disclaimer Banner */}
      <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>{disclaimer}</span>
        </div>
        <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider font-bold">ESTIMATE ONLY</span>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {message}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCalculateWages}
            disabled={isCalculating}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <Calculator className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Recalculate Wages'}
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure Wage Rules
          </button>
        </div>

        <button
          onClick={handleExportWageCSV}
          className="px-4 py-2 bg-[#b7cc75] hover:bg-[#cbe089] text-[#0b0f0c] rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" /> Export Wage Report (CSV)
        </button>
      </div>

      {/* Wage Rule Config Modal / Panel */}
      {showConfig && (
        <div className="mb-6 p-5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 text-xs space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurable Wage Calculation Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Rule Name</label>
              <input
                type="text"
                value={wageRule.rule_name}
                onChange={(e) => setWageRule({ ...wageRule, rule_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Daily Wage Rate (₹)</label>
              <input
                type="number"
                value={wageRule.daily_rate}
                onChange={(e) => setWageRule({ ...wageRule, daily_rate: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hourly Wage Rate (₹)</label>
              <input
                type="number"
                value={wageRule.hourly_rate}
                onChange={(e) => setWageRule({ ...wageRule, hourly_rate: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Calculation Method</label>
              <select
                value={wageRule.calculation_type}
                onChange={(e) => setWageRule({ ...wageRule, calculation_type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white"
              >
                <option value="DAILY">Daily Rate x Payable Days</option>
                <option value="HOURLY">Hourly Rate x Hours Worked</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Overtime Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={wageRule.overtime_rate_multiplier}
                onChange={(e) => setWageRule({ ...wageRule, overtime_rate_multiplier: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSaveRule}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
            >
              Save Wage Rules
            </button>
          </div>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[rgba(183,196,170,0.12)] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8d998b]">Payable Days</p>
          <p className="mt-3 text-3xl font-light text-[#f5f1e8]">{totalPayableDays} days</p>
        </div>
        <div className="rounded-xl border border-[rgba(183,196,170,0.12)] bg-[#081209] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8d998b]">Daily Rate Applied</p>
          <p className="mt-3 text-3xl font-light text-[#dfeab1]">₹{wageRule.daily_rate}/day</p>
        </div>
        <div className="rounded-xl border border-[#b7cc75]/30 bg-[#121b12] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#b7cc75]">Total Estimated Wage</p>
          <p className="mt-3 text-3xl font-semibold text-[#dfeab1]">₹{totalEstimatedPayout.toLocaleString()}</p>
          <span className="text-[10px] text-[#8d998b]">Clearly Labeled Estimated Wage</span>
        </div>
      </div>

      {/* Wage Records Table */}
      <div className="rounded-xl border border-[rgba(183,196,170,0.12)] bg-[#0f140f] overflow-hidden">
        <div className="p-4 border-b border-[rgba(183,196,170,0.12)] flex justify-between items-center">
          <h3 className="font-semibold text-sm text-[#f5f1e8] flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#b7cc75]" /> Validated Attendance Wage Calculations
          </h3>
          <span className="text-xs text-[#8d998b]">{wageRecords.length} worker records calculated</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#8d998b] animate-pulse">Calculating wages from database records...</div>
        ) : wageRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8d998b]">No validated attendance records found to calculate wages.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101610] text-[#8d998b] uppercase tracking-wider text-[10px] border-b border-[rgba(183,196,170,0.12)]">
                <tr>
                  <th className="p-3">Worker Code</th>
                  <th className="p-3">Worker Name</th>
                  <th className="p-3">Payable Days</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Overtime Hours</th>
                  <th className="p-3">Daily Rate</th>
                  <th className="p-3 text-right">Estimated Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(183,196,170,0.08)] text-[#f5f1e8]">
                {wageRecords.map((r) => (
                  <tr key={`${r.worker_id}-${r.worker_code}`} className="hover:bg-[#121b12]/50 transition">
                    <td className="p-3 font-mono text-[#b7cc75]">{r.worker_code}</td>
                    <td className="p-3 font-medium">{r.worker_name}</td>
                    <td className="p-3">{r.payable_days} days</td>
                    <td className="p-3">{r.total_hours} hrs</td>
                    <td className="p-3">{r.overtime_hours > 0 ? `${r.overtime_hours} hrs` : '-'}</td>
                    <td className="p-3">₹{r.daily_rate}</td>
                    <td className="p-3 text-right font-bold text-[#dfeab1]">
                      ₹{r.estimated_wage.toLocaleString()}
                      <span className="block text-[9px] font-normal text-[#8d998b]">Estimated wage</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
