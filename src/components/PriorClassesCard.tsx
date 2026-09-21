import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, ArrowRight, Check, Info, Trash2 } from 'lucide-react';

interface PriorClassesCardProps {
  baselineHeld: number;
  baselineAttended: number;
  onSaveBaseline: (held: number, attended: number) => void;
  minimumRequirement?: number;
  dailyLogsHeld?: number;
  dailyLogsAttended?: number;
  dailyLogsCount?: number;
  onClearDailyLogs?: () => void;
  countingStartDate?: string;
}

export const PriorClassesCard: React.FC<PriorClassesCardProps> = ({
  baselineHeld,
  baselineAttended,
  onSaveBaseline,
  minimumRequirement = 76,
  dailyLogsHeld = 0,
  dailyLogsAttended = 0,
  dailyLogsCount = 0,
  onClearDailyLogs,
  countingStartDate,
}) => {
  const [held, setHeld] = useState<number>(baselineHeld);
  const [attended, setAttended] = useState<number>(baselineAttended);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    setHeld(baselineHeld);
    setAttended(baselineAttended);
  }, [baselineHeld, baselineAttended]);

  const handleHeldChange = (val: number) => {
    const newHeld = Math.max(0, val);
    setHeld(newHeld);
    const newAttended = Math.min(attended, newHeld);
    setAttended(newAttended);
    onSaveBaseline(newHeld, newAttended);
    triggerSavedNotice();
  };

  const handleAttendedChange = (val: number) => {
    const newAttended = Math.max(0, Math.min(held, val));
    setAttended(newAttended);
    onSaveBaseline(held, newAttended);
    triggerSavedNotice();
  };

  const triggerSavedNotice = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const priorPercentage = held > 0 ? Number(((attended / held) * 100).toFixed(1)) : 100;
  const isBelow = priorPercentage < minimumRequirement;
  const isExact76 = Math.round(priorPercentage) === minimumRequirement;

  return (
    <div
      id="prior-classes-till-now-card"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Classes Count Till Today (Prior Baseline)
              </h2>
              {isSaved && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Check className="w-3 h-3" /> Updated
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter your total classes conducted up to today. Daily class tracking will start counting from Coming Monday onwards.
            </p>
          </div>
        </div>

        {/* Prior Percentage Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">Prior Attendance:</span>
          <span
            className={`text-sm font-extrabold ${
              isBelow
                ? 'text-rose-600'
                : isExact76
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}
          >
            {priorPercentage}%
          </span>
          <span className="text-[11px] text-slate-400">({attended}/{held})</span>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {/* Held Till Now */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition">
          <label
            htmlFor="prior-classes-held-input"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
          >
            Classes Held Till Today
          </label>
          <div className="flex items-center gap-2 mt-2">
            <input
              id="prior-classes-held-input"
              type="number"
              min="0"
              value={held}
              onChange={(e) => handleHeldChange(parseInt(e.target.value) || 0)}
              className="w-full text-2xl font-black text-slate-900 bg-transparent border-none focus:outline-none"
              placeholder="e.g. 50"
            />
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleHeldChange(held - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold flex items-center justify-center text-sm shadow-2xs"
                title="Decrease held classes"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleHeldChange(held + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold flex items-center justify-center text-sm shadow-2xs"
                title="Increase held classes"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Total historical classes conducted before tracking this week
          </p>
        </div>

        {/* Attended Till Today */}
        <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-4 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition">
          <label
            htmlFor="prior-classes-attended-input"
            className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1"
          >
            Classes Attended Till Today
          </label>
          <div className="flex items-center gap-2 mt-2">
            <input
              id="prior-classes-attended-input"
              type="number"
              min="0"
              max={held}
              value={attended}
              onChange={(e) => handleAttendedChange(parseInt(e.target.value) || 0)}
              className="w-full text-2xl font-black text-emerald-700 bg-transparent border-none focus:outline-none"
              placeholder="e.g. 40"
            />
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAttendedChange(attended - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold flex items-center justify-center text-sm shadow-2xs cursor-pointer"
                title="Decrease attended classes"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleAttendedChange(attended + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold flex items-center justify-center text-sm shadow-2xs cursor-pointer"
                title="Increase attended classes"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1.5">
            Classes you physically attended out of the total held till today
          </p>
        </div>
      </div>

      {/* Live System Count Breakdown Banner (shown when daily logs exist) */}
      {dailyLogsHeld > 0 && (
        <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-xs sm:text-sm">
                  Total Held in System: {held + dailyLogsHeld} classes
                </span>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  {held} baseline + {dailyLogsHeld} daily logs
                </span>
              </div>
              <p className="text-slate-600 mt-1 leading-relaxed">
                You entered <strong>{held}</strong> classes here, and there are currently <strong>+{dailyLogsHeld} classes</strong> recorded in your {dailyLogsCount} daily attendance log{dailyLogsCount === 1 ? '' : 's'}.
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                • If your <strong>{held}</strong> already includes today&apos;s lectures, clear the daily log below so they are not counted twice.
                <br />
                • If <strong>{held}</strong> was prior to today and you also attended classes today, <strong>{held + dailyLogsHeld}</strong> is your correct cumulative total.
              </p>
            </div>
          </div>

          {onClearDailyLogs && (
            <button
              type="button"
              onClick={onClearDailyLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 font-bold text-xs shrink-0 cursor-pointer shadow-2xs transition"
              title="Clear daily logs so Total Held equals exactly your baseline count"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Reset Total to {held} (Clear Logs)</span>
            </button>
          )}
        </div>
      )}

      {/* Helper text explaining how it auto-updates from Monday onwards */}
      <div className="mt-4 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5 shadow-2xs">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1 shrink-0"></span>
        <div className="space-y-1">
          <p>
            <strong className="text-indigo-950 font-black">Instruction & Policy:</strong> You entered{' '}
            <strong className="text-indigo-700">{held} classes conducted till today</strong>. New daily class counting starts strictly from{' '}
            <strong className="text-indigo-700">Coming Monday{countingStartDate ? ` (${countingStartDate})` : ''}</strong>.
          </p>
          <p className="text-[11px] text-slate-600">
            • Your baseline of <strong>{held} classes</strong> remains your verified total until Coming Monday.
            <br />
            • Starting Coming Monday, classes recorded daily (8 on Mon & Sat, 7 on other days) will accumulate on top of your baseline.
          </p>
        </div>
      </div>
    </div>
  );
};
