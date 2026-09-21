import React from 'react';
import { Calendar, Trash2, CheckCircle2, XCircle, Clock, BookOpen, Palmtree } from 'lucide-react';
import { DailyLog } from '../types';
import { HOLIDAY_CONFIG, formatDateWithDay } from '../utils/attendanceCalculations';

interface AttendanceHistoryProps {
  logs: DailyLog[];
  onDeleteLog: (id: string) => void;
  onClearAllLogs?: () => void;
  baselineHeld: number;
  baselineAttended: number;
  minimumRequirement?: number;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  logs,
  onDeleteLog,
  onClearAllLogs,
  baselineHeld,
  baselineAttended,
  minimumRequirement = 76,
}) => {
  const totalLogsHeld = logs.reduce((acc, curr) => acc + curr.classesHeld, 0);
  const totalLogsAttended = logs.reduce((acc, curr) => acc + curr.classesAttended, 0);

  return (
    <div
      id="attendance-history-section"
      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Daily Attendance Log History
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record of daily classes held, attended, bunked, and declared holidays
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
            {logs.length} {logs.length === 1 ? 'Record Logged' : 'Records Logged'}
            {totalLogsHeld > 0 && ` (+${totalLogsHeld} held)`}
          </span>
          {logs.length > 0 && onClearAllLogs && (
            <button
              type="button"
              onClick={onClearAllLogs}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
              title="Clear all recorded daily logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Starting Baseline indicator if present */}
      {(baselineHeld > 0 || baselineAttended > 0) && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>
              <strong>Starting Semester Baseline:</strong> {baselineAttended} attended / {baselineHeld} held (
              {baselineHeld > 0 ? ((baselineAttended / baselineHeld) * 100).toFixed(1) : 100}%)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Prior to daily records</span>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No daily attendance logs recorded yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Use the Daily Attendance Entry form or Weekly Schedule above to log your classes or declare holidays.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const isHoliday = log.isHoliday === true;
            const holidayType = log.holidayType || 'other';
            const holidayInfo = HOLIDAY_CONFIG[holidayType] || HOLIDAY_CONFIG.other;

            const dailyPct =
              log.classesHeld > 0
                ? Number(((log.classesAttended / log.classesHeld) * 100).toFixed(1))
                : 100;

            const isLow = dailyPct < minimumRequirement;

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  isHoliday
                    ? `${holidayInfo.bg} ${holidayInfo.border}`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                      isHoliday ? 'bg-white/80 text-amber-700 shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isHoliday ? <Palmtree className="w-4 h-4" /> : <Calendar className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatDateWithDay(log.date)}
                      </span>

                      {isHoliday ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${holidayInfo.bg} ${holidayInfo.border} ${holidayInfo.color}`}
                        >
                          {holidayInfo.badge}
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isLow
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {dailyPct}% day
                        </span>
                      )}
                    </div>

                    {isHoliday ? (
                      <p className="text-xs text-slate-600 mt-1">
                        0 classes held • Classes removed for holiday (attendance percentage preserved)
                      </p>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span>
                          Held: <strong>{log.classesHeld}</strong>
                        </span>
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
                          Attended: <strong>{log.classesAttended}</strong>
                        </span>
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 inline text-rose-500" />
                          Bunked: <strong>{log.classesBunked}</strong>
                        </span>
                      </div>
                    )}

                    {log.note && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        "{log.note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title={isHoliday ? 'Remove Holiday Record' : 'Delete log'}
                    aria-label={isHoliday ? 'Remove Holiday Record' : 'Delete log'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
