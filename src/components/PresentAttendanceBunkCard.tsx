import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AttendanceCalculationResult } from '../types';

interface PresentAttendanceBunkCardProps {
  calculation: AttendanceCalculationResult;
  minimumRequirement?: number;
  onSelectBunkToSimulate?: (bunks: number) => void;
}

export const PresentAttendanceBunkCard: React.FC<PresentAttendanceBunkCardProps> = ({
  calculation,
  minimumRequirement = 76,
  onSelectBunkToSimulate,
}) => {
  const [showLadder, setShowLadder] = useState<boolean>(true);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const {
    totalHeld,
    totalAttended,
    percentage,
    safeBunks,
    classesNeededToRecover,
    breakdown,
  } = calculation;

  const isBelow75 = percentage < minimumRequirement;
  const isExact76 = Math.round(percentage) === minimumRequirement;
  const isSafe = !isBelow75 && !isExact76;

  return (
    <div
      id="present-attendance-bunk-card"
      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              How Many Bunks Can We Do After Present Attendance?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Calculated directly from your present attendance of{' '}
            <strong className="text-slate-700">{percentage}%</strong> ({totalAttended} attended / {totalHeld} held)
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isBelow75 ? (
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              0 Bunks Allowed (Deficit)
            </span>
          ) : isExact76 ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Attendance at {minimumRequirement}% — Critical Margin
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Safe Buffer Available
            </span>
          )}
        </div>
      </div>

      {/* Main Hero Bunk Answer Card */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border transition-all ${
          isBelow75
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : safeBunks > 0
            ? 'bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-indigo-200 text-slate-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Big Highlight Stat */}
          <div className="md:col-span-7 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Present Calculation Verdict
            </div>

            {isBelow75 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-rose-600">0</span>
                  <span className="text-base sm:text-lg font-bold text-rose-900">
                    Bunks Allowed
                  </span>
                </div>
                <p className="text-sm font-semibold text-rose-950 leading-relaxed">
                  ⚠️ Your current attendance is <strong>{percentage}%</strong>, which is below the required{' '}
                  <strong>{minimumRequirement}%</strong>. Any missed class will push you further into detention risk.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-900 text-xs font-bold border border-rose-300">
                  <span>Recovery Goal:</span>
                  <span>
                    Must attend <strong>{classesNeededToRecover} consecutive classes</strong> to reach {minimumRequirement}%
                  </span>
                </div>
              </div>
            ) : safeBunks === 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-amber-600">0</span>
                  <span className="text-base sm:text-lg font-bold text-amber-900">
                    Safe Bunks Remaining
                  </span>
                </div>
                <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                  You are sitting right at the boundary with <strong>{percentage}%</strong>. Bunking even 1 class
                  will instantly pull your attendance down below {minimumRequirement}%.
                </p>
                <p className="text-xs text-amber-800">
                  Attend upcoming classes to build a comfortable buffer before planning any bunks.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-indigo-600">
                    {safeBunks}
                  </span>
                  <div>
                    <span className="text-base sm:text-lg font-bold text-slate-900 block">
                      {safeBunks === 1 ? 'Class' : 'Classes'} You Can Safely Bunk
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {breakdown.safeDaysApprox > 0 ? (
                        <>
                          ≈ <strong>{breakdown.safeDaysApprox} full college {breakdown.safeDaysApprox === 1 ? 'day' : 'days'}</strong>
                          {breakdown.safeDaysRemainderClasses > 0 && ` and ${breakdown.safeDaysRemainderClasses} extra periods`}
                        </>
                      ) : (
                        `≈ ${safeBunks} individual class periods`
                      )}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  After bunking <strong>{safeBunks}</strong> {safeBunks === 1 ? 'class' : 'classes'}, your attendance will remain at{' '}
                  <strong className="text-emerald-700">{breakdown.projectedPercentageAfterMaxBunks}%</strong> (satisfying the required ≥{minimumRequirement}%).
                </p>

                {/* Tipping point warning */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Tipping point:</strong> If you bunk <strong>{safeBunks + 1} classes</strong>, your attendance will drop to{' '}
                    <strong className="text-rose-700">{breakdown.percentageAfterOneMoreBunk}%</strong> (below {minimumRequirement}% detention threshold).
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Key Calculations Summary */}
          <div className="md:col-span-5 bg-white/95 rounded-xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Attendance Breakdown</span>
              <span className="text-indigo-600 font-extrabold">{percentage}%</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Present Classes Held</span>
                <span className="font-bold text-slate-800">{totalHeld}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Present Classes Attended</span>
                <span className="font-bold text-emerald-700">{totalAttended}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">College Minimum Standard</span>
                <span className="font-bold text-slate-800">{minimumRequirement}%</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Attendance After Max Bunks</span>
                <span className={`font-bold ${breakdown.projectedPercentageAfterMaxBunks >= minimumRequirement ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {breakdown.projectedPercentageAfterMaxBunks}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Maximum Safe Bunks</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  {safeBunks} classes
                </span>
              </div>
            </div>

            {/* Quick action: simulate button */}
            {onSelectBunkToSimulate && (
              <button
                type="button"
                onClick={() => onSelectBunkToSimulate(safeBunks > 0 ? safeBunks : 1)}
                className="w-full py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Simulate in Bunk Calculator</span>
                <TrendingDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step-by-Step Bunk Outcome Ladder / Projection Table */}
      {breakdown.scenarios && breakdown.scenarios.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLadder(!showLadder)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Step-by-Step Projection Table (What Happens With Each Bunk)
              </span>
              <span className="text-[11px] text-slate-400">
                See exact % after 1, 2, 3... bunks
              </span>
            </div>
            {showLadder ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showLadder && (
            <div className="p-4 bg-white space-y-3">
              <p className="text-xs text-slate-500">
                Here is the projection of your attendance percentage as you miss each class from your present standing:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Bunks Done</th>
                      <th className="py-2 px-3">New Classes (Attended / Held)</th>
                      <th className="py-2 px-3">Resulting Attendance %</th>
                      <th className="py-2 px-3">Status</th>
                      {onSelectBunkToSimulate && <th className="py-2 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Baseline / 0 bunks */}
                    <tr className="bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-700">0 (Present)</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {totalAttended} / {totalHeld}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {percentage}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isBelow75
                            ? 'bg-rose-100 text-rose-800'
                            : isExact76
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isBelow75 ? `Current (<${minimumRequirement}%)` : isExact76 ? `Current (${minimumRequirement}%)` : 'Current Standing'}
                        </span>
                      </td>
                      {onSelectBunkToSimulate && <td className="py-2.5 px-3 text-right"></td>}
                    </tr>

                    {/* Scenarios */}
                    {breakdown.scenarios.map((scen) => (
                      <tr
                        key={scen.bunkCount}
                        className={`transition ${
                          scen.isMaxLimit
                            ? 'bg-indigo-50/60 font-semibold'
                            : scen.status === 'danger'
                            ? 'hover:bg-rose-50/30'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {scen.bunkCount} {scen.bunkCount === 1 ? 'class' : 'classes'}
                          {scen.isMaxLimit && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase">
                              Max Safe Limit
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {totalAttended} / {scen.projectedHeld}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-black text-sm ${
                              scen.status === 'danger'
                                ? 'text-rose-600'
                                : scen.status === 'caution-76'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {scen.projectedPercentage}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {scen.status === 'danger' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Detention Risk (&lt;{minimumRequirement}%)
                            </span>
                          ) : scen.status === 'caution-76' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Caution ({minimumRequirement}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Safe (≥{minimumRequirement}%)
                            </span>
                          )}
                        </td>
                        {onSelectBunkToSimulate && (
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onSelectBunkToSimulate(scen.bunkCount)}
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition"
                            >
                              Test
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formula & Calculation Proof Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{showFormulaDetails ? 'Hide Calculation Formula' : 'How is this calculated? View formula'}</span>
        </button>

        {showFormulaDetails && (
          <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <p className="font-semibold text-slate-900">
              Safe Bunk Formula:
            </p>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-indigo-900">
              Max Safe Bunks = Math.floor((Attended ÷ {minimumRequirement / 100}) - Held)
            </div>
            <p>
              With your present numbers: <br />
              <code className="text-indigo-700 font-bold">
                Math.floor(({totalAttended} ÷ {minimumRequirement / 100}) - {totalHeld}) = {safeBunks} safe classes
              </code>
            </p>
            <p className="text-slate-500 text-[11px]">
              This guarantees that even if you skip {safeBunks} classes, your attended classes divided by total classes held will not fall below the mandatory {minimumRequirement}% college detention limit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
