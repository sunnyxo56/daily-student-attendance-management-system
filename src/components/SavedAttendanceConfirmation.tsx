import React from 'react';
import { CheckCircle2, Calendar, BookOpen, Clock, AlertTriangle, ShieldCheck, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SavedAttendanceFeedback } from '../types';
import { formatDateWithDay } from '../utils/attendanceCalculations';

interface SavedAttendanceConfirmationProps {
  feedback: SavedAttendanceFeedback;
  onDismiss: () => void;
  onEditAgain?: () => void;
  minimumRequirement?: number;
}

export const SavedAttendanceConfirmation: React.FC<SavedAttendanceConfirmationProps> = ({
  feedback,
  onDismiss,
  onEditAgain,
  minimumRequirement = 76,
}) => {
  if (!feedback.show) return null;

  const percentDiff = Number((feedback.newPercentage - feedback.previousPercentage).toFixed(1));
  const isImproved = percentDiff >= 0;
  const isSafe = feedback.newPercentage >= minimumRequirement;

  return (
    <div
      id="saved-attendance-confirmation-card"
      className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-xl p-5 sm:p-6 mb-8 relative overflow-hidden transition-all animate-fadeIn"
    >
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        title="Dismiss confirmation"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3.5 mb-5">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Saved Successfully
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDateWithDay(feedback.savedDate)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Today&apos;s Attendance Recorded & Overall Stats Updated
          </h2>
          <p className="text-xs text-slate-600">
            Your attendance log for <strong className="text-slate-800">{formatDateWithDay(feedback.savedDate)}</strong> has been securely stored and computed into your semester record.
          </p>
        </div>
      </div>

      {/* 2-Column Comparison Grid: Today's Saved Data vs Updated Overall Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Column 1: Today's Saved Data */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Today&apos;s Saved Data
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {formatDateWithDay(feedback.savedDate)}
              </span>
            </div>

            {feedback.isHoliday ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-amber-900 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider">
                  🎉 {feedback.holidayType ? feedback.holidayType.toUpperCase() : 'GENERAL'} HOLIDAY
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  {feedback.holidayName || 'College Holiday Recorded'}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  0 classes held • 0 classes missed • No impact on attendance percentage
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center my-2">
                <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Classes Held</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {feedback.savedHeld}
                  </div>
                  <div className="text-[10px] text-slate-400">today</div>
                </div>

                <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Attended</div>
                  <div className="text-lg font-black text-emerald-600 mt-0.5">
                    {feedback.savedAttended}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">present</div>
                </div>

                <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-medium text-slate-500">Bunked</div>
                  <div className={`text-lg font-black mt-0.5 ${feedback.savedBunked > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {feedback.savedBunked}
                  </div>
                  <div className="text-[10px] text-slate-400">absent</div>
                </div>
              </div>
            )}

            {feedback.note && (
              <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
                &ldquo;{feedback.note}&rdquo;
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 mt-3">
            <span>Entry Timestamp: {new Date().toLocaleTimeString()}</span>
            {onEditAgain && (
              <button
                type="button"
                onClick={onEditAgain}
                className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
              >
                Edit this entry
              </button>
            )}
          </div>
        </div>

        {/* Column 2: New Overall Attendance Standing */}
        <div className={`rounded-xl p-4 border flex flex-col justify-between ${
          isSafe
            ? 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-200'
            : 'bg-gradient-to-br from-rose-50/50 to-amber-50/30 border-rose-200'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" /> New Overall Attendance
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isSafe ? 'Safe Standing' : 'Below Minimum (Risk)'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 flex items-baseline gap-2">
                  <span>{feedback.newPercentage}%</span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    isImproved ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {isImproved ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" /> +{percentDiff}%
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3.5 h-3.5" /> {percentDiff}%
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Combined Total: <strong className="text-slate-900">{feedback.newTotalAttended}</strong> attended /{' '}
                  <strong className="text-slate-900">{feedback.newTotalHeld}</strong> total held
                </div>
              </div>

              {/* Progress visual pill */}
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500">College Requirement</div>
                <div className="text-sm font-black text-slate-700">≥ {minimumRequirement}%</div>
              </div>
            </div>

            {/* Safe Bunks Highlight */}
            <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                feedback.newSafeBunks > 0 ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {feedback.newSafeBunks > 0 ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">
                  {feedback.newSafeBunks > 0 ? (
                    <span>You can safely bunk <strong className="text-purple-700 text-sm font-black">{feedback.newSafeBunks}</strong> more {feedback.newSafeBunks === 1 ? 'class' : 'classes'}</span>
                  ) : (
                    <span className="text-rose-700 font-bold">0 Safe Bunks Allowed</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {feedback.newSafeBunks > 0
                    ? `Bunking up to ${feedback.newSafeBunks} classes keeps your record safe at or above ${minimumRequirement}%.`
                    : `Must attend upcoming classes to restore your record to ${minimumRequirement}%.`}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/60 mt-3">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              Done / Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
