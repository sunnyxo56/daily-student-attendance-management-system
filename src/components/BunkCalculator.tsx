import React, { useState } from 'react';
import { Calculator, AlertTriangle, ShieldCheck, AlertCircle, ArrowDown, ArrowRight, Shield } from 'lucide-react';
import { simulateBunk } from '../utils/attendanceCalculations';

interface BunkCalculatorProps {
  totalHeld: number;
  totalAttended: number;
  minimumRequirement: number;
  maxSafeBunks: number;
  initialPlannedBunks?: number;
}

export const BunkCalculator: React.FC<BunkCalculatorProps> = ({
  totalHeld,
  totalAttended,
  minimumRequirement = 75,
  maxSafeBunks,
  initialPlannedBunks,
}) => {
  const [plannedBunks, setPlannedBunks] = useState<number>(initialPlannedBunks ?? (maxSafeBunks > 0 ? 1 : 0));

  React.useEffect(() => {
    if (initialPlannedBunks !== undefined) {
      setPlannedBunks(initialPlannedBunks);
    }
  }, [initialPlannedBunks]);

  // Compute simulation result
  const simulation = simulateBunk(totalHeld, totalAttended, plannedBunks, minimumRequirement);

  const currentPercent =
    totalHeld > 0 ? Number(((totalAttended / totalHeld) * 100).toFixed(1)) : 100;

  // Warning criteria:
  const isCurrent76 = Math.round(currentPercent) === minimumRequirement;
  const isProjectedBelowThreshold = simulation.projectedPercentage < minimumRequirement;
  const isProjected76 = Math.round(simulation.projectedPercentage) === minimumRequirement;

  const handleBunkChange = (val: number) => {
    setPlannedBunks(Math.max(0, val));
  };

  return (
    <div
      id="bunk-calculator-section"
      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              2. Bunk Calculator (What-If Simulation)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Test how many classes you plan to skip and see immediate detention risk
          </p>
        </div>

        {/* Max Safe Bunk Highlight Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold">
          <Shield className="w-4 h-4 text-purple-600" />
          <span>Max Safe Bunks: <strong className="text-purple-700 text-sm">{maxSafeBunks}</strong></span>
        </div>
      </div>

      {/* Planned Bunks Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-7 space-y-3">
          <div className="flex justify-between items-center">
            <label
              htmlFor="planned-bunks-input"
              className="text-xs sm:text-sm font-bold text-slate-800"
            >
              Classes You Plan to Bunk:
            </label>
            <div className="flex items-center gap-2">
              <button
                id="btn-bunk-dec"
                type="button"
                onClick={() => handleBunkChange(plannedBunks - 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-base transition"
                aria-label="Decrease planned bunks"
              >
                -
              </button>
              <input
                id="planned-bunks-input"
                type="number"
                min="0"
                max="50"
                value={plannedBunks}
                onChange={(e) => handleBunkChange(parseInt(e.target.value) || 0)}
                className="w-16 py-1 text-center font-extrabold text-xl text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                id="btn-bunk-inc"
                type="button"
                onClick={() => handleBunkChange(plannedBunks + 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-base transition"
                aria-label="Increase planned bunks"
              >
                +
              </button>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-1">
            <input
              id="planned-bunks-slider"
              type="range"
              min="0"
              max={Math.max(15, maxSafeBunks + 5)}
              value={plannedBunks}
              onChange={(e) => handleBunkChange(parseInt(e.target.value) || 0)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>0 (No bunks)</span>
              <span className="text-purple-600 font-bold">Safe limit: {maxSafeBunks}</span>
              <span>{Math.max(15, maxSafeBunks + 5)} bunks</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs text-slate-400 font-medium mr-1">Quick Select:</span>
            {[0, 1, 2, 3, 5, maxSafeBunks, maxSafeBunks > 0 ? maxSafeBunks + 1 : 0]
              .filter((val, idx, arr) => val >= 0 && arr.indexOf(val) === idx)
              .map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleBunkChange(count)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    plannedBunks === count
                      ? count > maxSafeBunks
                        ? 'bg-rose-600 text-white'
                        : 'bg-purple-600 text-white'
                      : count > maxSafeBunks
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : count === maxSafeBunks && maxSafeBunks > 0
                      ? 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  {count === 0
                    ? '0 Bunks'
                    : count === maxSafeBunks
                    ? `Max Safe (${count})`
                    : count === maxSafeBunks + 1 && maxSafeBunks > 0
                    ? `Exceed by 1 (${count})`
                    : `+${count}`}
                </button>
              ))}
          </div>
        </div>

        {/* Real-Time Calculation Projection Box */}
        <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attendance After Bunking
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Current</span>
              <span className="text-xl font-bold text-slate-700">{currentPercent}%</span>
            </div>

            <div className="flex flex-col items-center">
              <ArrowRight className="w-5 h-5 text-slate-400" />
              {simulation.percentageDrop > 0 && (
                <span className="text-[11px] font-bold text-rose-500">
                  -{simulation.percentageDrop}%
                </span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Projected</span>
              <span
                className={`text-2xl font-black ${
                  isProjectedBelowThreshold
                    ? 'text-rose-600'
                    : isProjected76
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {simulation.projectedPercentage}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-200/80 pt-2 flex justify-between">
            <span>Classes: {totalAttended} / {simulation.projectedHeld}</span>
            <span className="font-semibold">Req: {minimumRequirement}%</span>
          </div>
        </div>
      </div>

      {/* Automatic Warning Section */}
      <div id="automatic-bunk-warning" className="pt-2">
        {isProjectedBelowThreshold ? (
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-0.5">
                Critical Bunk Warning
              </h3>
              <p className="text-sm font-semibold text-rose-950">
                ⚠️ Warning! Your attendance will fall below {minimumRequirement}% if you bunk these classes. You may be detained according to college rules.
              </p>
              <p className="text-xs text-rose-800 mt-1">
                Projected attendance: <strong>{simulation.projectedPercentage}%</strong>. You can only safely bunk up to{' '}
                <strong>{maxSafeBunks}</strong> {maxSafeBunks === 1 ? 'class' : 'classes'}.
              </p>
            </div>
          </div>
        ) : isCurrent76 || isProjected76 ? (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-0.5">
                {minimumRequirement}% Attendance Notice
              </h3>
              <p className="text-sm font-semibold text-amber-950">
                Your attendance will be {minimumRequirement}%. Check before bunking to avoid falling below {minimumRequirement}%.
              </p>
              <p className="text-xs text-amber-800 mt-1">
                At {minimumRequirement}%, even 1 additional missed class will drop you below the required {minimumRequirement}% limit.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs text-emerald-900">
              <span className="font-bold block text-sm text-emerald-950">
                Safe to Bunk ({plannedBunks} {plannedBunks === 1 ? 'class' : 'classes'})
              </span>
              Your projected attendance will be {simulation.projectedPercentage}%, which is comfortably above the {minimumRequirement}% college requirement.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
