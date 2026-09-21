import React from 'react';
import {
  Calendar,
  CheckCircle2,
  BookOpen,
  UserCheck,
  Percent,
  Shield,
  AlertTriangle,
  Flame,
  Sparkles,
} from 'lucide-react';
import { AttendanceCalculationResult, HolidayType } from '../types';
import { HOLIDAY_CONFIG } from '../utils/attendanceCalculations';

interface DashboardMetricsProps {
  todayHeld: number;
  todayAttended: number;
  calculation: AttendanceCalculationResult;
  minimumRequirement: number;
  isTodayHoliday?: boolean;
  todayHolidayType?: HolidayType;
  baselineHeld?: number;
  baselineAttended?: number;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  todayHeld,
  todayAttended,
  calculation,
  minimumRequirement,
  isTodayHoliday = false,
  todayHolidayType,
  baselineHeld,
  baselineAttended,
}) => {
  const {
    totalHeld,
    totalAttended,
    percentage,
    safeBunks,
    warning,
  } = calculation;

  const logsHeld = baselineHeld !== undefined ? Math.max(0, totalHeld - baselineHeld) : 0;
  const logsAttended = baselineAttended !== undefined ? Math.max(0, totalAttended - baselineAttended) : 0;

  // Determine color theme based on percentage
  const isDanger = percentage < minimumRequirement;
  const isExact76 = Math.round(percentage) === minimumRequirement;
  const isCaution = isExact76 || (percentage >= minimumRequirement && percentage <= minimumRequirement + 2);

  const statusColorClass = isDanger
    ? 'text-rose-600 bg-rose-50 border-rose-200'
    : isCaution
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  const statusBadgeText = isDanger
    ? `Detention Risk (<${minimumRequirement}%)`
    : isExact76
    ? `Critical Margin (${minimumRequirement}%)`
    : `Safe Standing (≥${minimumRequirement}%)`;

  return (
    <div id="daily-dashboard-section" className="space-y-4">
      {/* Top Main Status Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Main Percentage & Visual Meter */}
          <div className="flex items-center gap-5 w-full lg:w-auto">
            {/* Circular Gauge / Percentage Indicator */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                {/* Reference Marker Tick */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="8"
                  strokeDasharray="2 249"
                  strokeDashoffset={-251 * (minimumRequirement / 100)}
                  className="opacity-70"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={
                    isDanger
                      ? '#e11d48'
                      : isCaution
                      ? '#d97706'
                      : '#10b981'
                  }
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * Math.min(100, Math.max(0, percentage))) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                  {percentage}%
                </span>
                <span className="text-[10px] sm:text-xs font-semibold uppercase text-slate-400 mt-0.5">
                  Overall
                </span>
              </div>
            </div>

            {/* Attendance Summary Text */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${statusColorClass}`}>
                  {statusBadgeText}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Rule: Min {minimumRequirement}%
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Current Attendance Status
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {totalAttended} attended out of {totalHeld} total classes conducted so far
                {baselineHeld !== undefined && logsHeld > 0 && (
                  <span className="text-indigo-600 font-semibold block sm:inline sm:ml-1 text-xs">
                    ({baselineHeld} baseline + {logsHeld} daily logged)
                  </span>
                )}
                .
              </p>
            </div>
          </div>

          {/* Quick Stat Pill: Safe Bunks Highlight */}
          <div
            onClick={() => {
              const el = document.getElementById('present-attendance-bunk-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full lg:w-auto bg-slate-50 hover:bg-slate-100/80 cursor-pointer border border-slate-200/80 rounded-xl p-4 flex items-center justify-between sm:justify-start gap-4 transition group"
            title="Click to view detailed bunk calculation"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between gap-2">
                <span>Maximum Safe Bunks</span>
                <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">View details ➔</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-2xl sm:text-3xl font-black ${safeBunks > 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {safeBunks}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {safeBunks === 1 ? 'class' : 'classes'} allowed
                  {calculation.breakdown?.safeDaysApprox > 0 && (
                    <span className="text-slate-400 font-normal ml-1">
                      (≈{calculation.breakdown.safeDaysApprox}d)
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {safeBunks > 0
                  ? `Leaves you at ${calculation.breakdown?.projectedPercentageAfterMaxBunks}% (safe ≥ ${minimumRequirement}%)`
                  : `Cannot afford any bunks without dropping below ${minimumRequirement}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 6 Core Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Today's Classes Held */}
        <div
          id="metric-today-held"
          className={`rounded-xl border p-4 flex flex-col justify-between shadow-xs transition ${
            isTodayHoliday
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Today Held</span>
            <Calendar className={`w-4 h-4 ${isTodayHoliday ? 'text-amber-600' : 'text-indigo-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{todayHeld}</span>
            {isTodayHoliday && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Holiday
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {isTodayHoliday
              ? (todayHolidayType ? HOLIDAY_CONFIG[todayHolidayType]?.label : 'Holiday Off')
              : 'Classes today'}
          </span>
        </div>

        {/* Metric 2: Today's Classes Attended */}
        <div
          id="metric-today-attended"
          className={`rounded-xl border p-4 flex flex-col justify-between shadow-xs transition ${
            isTodayHoliday
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Today Attended</span>
            <CheckCircle2 className={`w-4 h-4 ${isTodayHoliday ? 'text-amber-600' : 'text-emerald-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600">{todayAttended}</span>
            {isTodayHoliday && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Protected
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {isTodayHoliday ? 'No penalty' : 'Attended today'}
          </span>
        </div>

        {/* Metric 3: Total Classes Held */}
        <div
          id="metric-total-held"
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-blue-200 transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Held</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalHeld}</div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            {baselineHeld !== undefined && logsHeld > 0
              ? `${baselineHeld} base + ${logsHeld} daily`
              : 'From baseline count'}
          </span>
        </div>

        {/* Metric 4: Total Classes Attended */}
        <div
          id="metric-total-attended"
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-emerald-200 transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Attended</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{totalAttended}</div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            {baselineAttended !== undefined && logsAttended > 0
              ? `${baselineAttended} base + ${logsAttended} daily`
              : 'Cumulative'}
          </span>
        </div>

        {/* Metric 5: Current Attendance % */}
        <div
          id="metric-current-percentage"
          className={`rounded-xl border p-4 flex flex-col justify-between shadow-xs transition ${
            isDanger
              ? 'bg-rose-50/70 border-rose-200'
              : isCaution
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Attendance %</span>
            <Percent className={`w-4 h-4 ${isDanger ? 'text-rose-500' : isCaution ? 'text-amber-500' : 'text-indigo-500'}`} />
          </div>
          <div className={`text-2xl font-black ${isDanger ? 'text-rose-600' : isCaution ? 'text-amber-700' : 'text-slate-900'}`}>
            {percentage}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            {isDanger ? `Below ${minimumRequirement}%` : isExact76 ? `Exactly ${minimumRequirement}%` : `Above ${minimumRequirement}%`}
          </span>
        </div>

        {/* Metric 6: Maximum Safe Bunks */}
        <div
          id="metric-safe-bunks"
          onClick={() => {
            const el = document.getElementById('present-attendance-bunk-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-purple-300 hover:bg-purple-50/20 cursor-pointer transition"
          title="Click to view full bunk calculation"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Safe Bunks</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${safeBunks > 0 ? 'text-purple-700' : 'text-rose-600'}`}>
              {safeBunks}
            </span>
            <span className="text-xs text-slate-400">classes</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {safeBunks > 0 ? `Allowed at ≥${minimumRequirement}%` : `Deficit (<${minimumRequirement}%)`}
          </span>
        </div>
      </div>
    </div>
  );
};
