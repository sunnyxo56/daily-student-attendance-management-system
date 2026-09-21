import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Palmtree,
  RotateCcw,
  Zap,
  Building2,
  PartyPopper,
  Info,
} from 'lucide-react';
import { DailyLog, WeekDaySchedule, HolidayType } from '../types';
import {
  getWeekDaysStartingMonday,
  getScheduledClassesForDate,
  HOLIDAY_CONFIG,
  getComingMondayDateString,
  getDaysUntilComingMonday,
  formatDateWithFullDay,
} from '../utils/attendanceCalculations';

interface WeeklyAttendanceTrackerProps {
  dailyLogs: DailyLog[];
  onSaveDailyEntry: (entry: Omit<DailyLog, 'id' | 'timestamp'>) => void;
  onRemoveHoliday: (dateStr: string) => void;
  baselineHeld: number;
  baselineAttended: number;
  minimumRequirement?: number;
}

export const WeeklyAttendanceTracker: React.FC<WeeklyAttendanceTrackerProps> = ({
  dailyLogs,
  onSaveDailyEntry,
  onRemoveHoliday,
  baselineHeld,
  baselineAttended,
  minimumRequirement = 76,
}) => {
  // Today string
  const todayStr = new Date().toISOString().split('T')[0];

  // Coming Monday calculation
  const comingMondayStr = React.useMemo(() => getComingMondayDateString(todayStr), [todayStr]);
  const daysUntilComingMonday = React.useMemo(() => getDaysUntilComingMonday(todayStr), [todayStr]);
  const comingMondayFormatted = React.useMemo(() => formatDateWithFullDay(comingMondayStr), [comingMondayStr]);
  const comingMondayOffset = React.useMemo(() => {
    const todayDay = new Date().getDay();
    return todayDay === 1 ? 0 : 1;
  }, []);

  // Reference date for current viewing week (defaults to today)
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Active holiday selector popover state (holds dateStr of the day whose menu is open)
  const [activeHolidayMenu, setActiveHolidayMenu] = useState<string | null>(null);

  // Compute reference date string shifted by offset weeks (7 days * offset)
  const referenceDateStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentWeekOffset * 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [currentWeekOffset]);

  // Week schedule starting from Monday onwards
  const weekDays = React.useMemo(() => {
    return getWeekDaysStartingMonday(referenceDateStr);
  }, [referenceDateStr]);

  // Track inline edits for each day
  const [editingDay, setEditingDay] = useState<{ [dateStr: string]: number }>({});
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Map of dailyLogs by date for quick lookup
  const logsByDate = React.useMemo(() => {
    const map = new Map<string, DailyLog>();
    dailyLogs.forEach((log) => {
      map.set(log.date, log);
    });
    return map;
  }, [dailyLogs]);

  // Check if today is marked as a holiday
  const todayLog = logsByDate.get(todayStr);
  const isTodayHoliday = todayLog?.isHoliday === true;

  // Handler to set attended count in local state
  const handleSetAttended = (dateStr: string, val: number, scheduledHeld: number) => {
    const clamped = Math.max(0, Math.min(scheduledHeld, val));
    setEditingDay((prev) => ({
      ...prev,
      [dateStr]: clamped,
    }));
  };

  // Handler to save attendance for a weekday
  const handleSaveDay = (day: WeekDaySchedule, attendedCount?: number) => {
    const existingLog = logsByDate.get(day.dateStr);
    const attended =
      attendedCount !== undefined
        ? attendedCount
        : editingDay[day.dateStr] !== undefined
        ? editingDay[day.dateStr]
        : existingLog
        ? existingLog.classesAttended
        : day.scheduledHeld;

    const held = day.scheduledHeld;
    const bunked = Math.max(0, held - attended);

    onSaveDailyEntry({
      date: day.dateStr,
      classesHeld: held,
      classesAttended: attended,
      classesBunked: bunked,
      isHoliday: false,
      note: `${day.dayName} (${held} classes schedule)`,
    });

    setSavedNotification(day.dateStr);
    setTimeout(() => {
      setSavedNotification((current) => (current === day.dateStr ? null : current));
    }, 2000);
  };

  // Mark day as holiday (0 held, 0 attended, 0 bunked - removes classes for the day)
  const handleDeclareHoliday = (dateStr: string, holidayType: HolidayType) => {
    const config = HOLIDAY_CONFIG[holidayType];
    onSaveDailyEntry({
      date: dateStr,
      classesHeld: 0,
      classesAttended: 0,
      classesBunked: 0,
      isHoliday: true,
      holidayType,
      holidayName: config.label,
      note: `${config.label} - classes canceled`,
    });
    setActiveHolidayMenu(null);
    setSavedNotification(dateStr);
    setTimeout(() => {
      setSavedNotification((current) => (current === dateStr ? null : current));
    }, 2000);
  };

  // Remove holiday (restores day to unlogged/standard schedule)
  const handleRemoveHolidayDay = (dateStr: string) => {
    onRemoveHoliday(dateStr);
    setEditingDay((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
    setSavedNotification(dateStr);
    setTimeout(() => {
      setSavedNotification((current) => (current === dateStr ? null : current));
    }, 2000);
  };

  // Quick mark all attended for a weekday
  const handleMarkAllAttended = (day: WeekDaySchedule) => {
    handleSetAttended(day.dateStr, day.scheduledHeld, day.scheduledHeld);
    handleSaveDay(day, day.scheduledHeld);
  };

  // Quick mark all bunked for a weekday
  const handleMarkAllBunked = (day: WeekDaySchedule) => {
    handleSetAttended(day.dateStr, 0, day.scheduledHeld);
    handleSaveDay(day, 0);
  };

  // Week statistics
  const weekStats = React.useMemo(() => {
    let scheduledThisWeek = 0;
    let loggedHeldThisWeek = 0;
    let loggedAttendedThisWeek = 0;
    let holidayCount = 0;
    let classesRemovedByHolidays = 0;

    weekDays.forEach((d) => {
      const log = logsByDate.get(d.dateStr);
      if (log && log.isHoliday) {
        holidayCount++;
        classesRemovedByHolidays += d.scheduledHeld;
      } else {
        scheduledThisWeek += d.scheduledHeld;
      }

      if (log) {
        loggedHeldThisWeek += log.classesHeld;
        loggedAttendedThisWeek += log.classesAttended;
      }
    });

    const weekPercentage =
      loggedHeldThisWeek > 0
        ? Number(((loggedAttendedThisWeek / loggedHeldThisWeek) * 100).toFixed(1))
        : 0;

    return {
      scheduledThisWeek,
      loggedHeldThisWeek,
      loggedAttendedThisWeek,
      weekPercentage,
      holidayCount,
      classesRemovedByHolidays,
    };
  }, [weekDays, logsByDate]);

  return (
    <div
      id="weekly-schedule-tracker"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6"
    >
      {/* Header with Rule Explanation and Week Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Weekly Attendance Tracker (Monday Onwards)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-500">
            <span>Schedule Rule:</span>
            <span className="inline-flex items-center font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Monday & Saturday = 8 Classes
            </span>
            <span className="inline-flex items-center font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Tue, Wed, Thu, Fri, Sun = 7 Classes
            </span>
            <span className="inline-flex items-center font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Holidays = 0 Classes (Removed)
            </span>
          </div>
        </div>

        {/* Week Selector & Switcher */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => {
              setCurrentWeekOffset((prev) => prev - 1);
              setActiveHolidayMenu(null);
            }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-xs font-semibold text-slate-700 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {weekDays[0]?.displayDate} – {weekDays[6]?.displayDate}
            </span>
            {currentWeekOffset === 0 ? (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                Current Week
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCurrentWeekOffset(0);
                  setActiveHolidayMenu(null);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:underline ml-1 cursor-pointer"
              >
                Go to Today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentWeekOffset((prev) => prev + 1);
              setActiveHolidayMenu(null);
            }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {currentWeekOffset !== comingMondayOffset && (
            <button
              type="button"
              onClick={() => {
                setCurrentWeekOffset(comingMondayOffset);
                setActiveHolidayMenu(null);
              }}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Jump directly to the week starting Coming Monday"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Coming Monday</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action: Today Holiday Banner */}
      <div className="mt-4 p-3.5 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
            <Palmtree className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {isTodayHoliday ? 'Today is marked as Holiday!' : 'Is Today a Holiday?'}
              </span>
              {isTodayHoliday && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  0 Classes Held (Protected)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isTodayHoliday
                ? `${todayLog?.holidayName || 'Holiday'} active. Classes for today are excluded from attendance.`
                : 'Remove scheduled classes today for a festival, state declared holiday, or sudden closure.'}
            </p>
          </div>
        </div>

        {/* Holiday action buttons for Today */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {isTodayHoliday ? (
            <button
              type="button"
              onClick={() => handleRemoveHolidayDay(todayStr)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remove Holiday (Restore Classes)
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleDeclareHoliday(todayStr, 'festival')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition flex items-center gap-1"
                title="Mark today as Festival Holiday (Diwali, Pongal, Eid, etc.)"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-600" />
                Festival Holiday
              </button>
              <button
                type="button"
                onClick={() => handleDeclareHoliday(todayStr, 'state')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition flex items-center gap-1"
                title="Mark today as State / Government Holiday"
              >
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                State Holiday
              </button>
              <button
                type="button"
                onClick={() => handleDeclareHoliday(todayStr, 'sudden')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition flex items-center gap-1"
                title="Mark today as Sudden Holiday (Heavy Rain, Strike, College Circular)"
              >
                <Zap className="w-3.5 h-3.5 text-purple-600" />
                Sudden Holiday
              </button>
            </>
          )}
        </div>
      </div>

      {/* Coming Monday Counting Policy Banner */}
      <div className="mt-4 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none">START</span>
            <span className="text-xs font-black leading-tight">MON</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-indigo-950">
                Daily Lecture Counting Starts: <span className="text-indigo-600">{comingMondayFormatted}</span>
              </span>
              {daysUntilComingMonday > 0 ? (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  Starts in {daysUntilComingMonday} day{daysUntilComingMonday === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active Counting Period
                </span>
              )}
            </div>
            <p className="text-[11px] text-indigo-900/80 mt-0.5">
              Only enter prior classes up to today in the baseline card above. Live daily class tracking begins from <strong>Coming Monday</strong> (Mon & Sat = 8 classes, other days = 7 classes).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCurrentWeekOffset(comingMondayOffset);
            setActiveHolidayMenu(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
            currentWeekOffset === comingMondayOffset
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-2xs'
          }`}
        >
          {currentWeekOffset === comingMondayOffset ? '✓ Viewing Counting Week' : '👉 View Coming Monday Week'}
        </button>
      </div>

      {/* Week Grid (Monday to Sunday) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mt-4">
        {weekDays.map((day) => {
          const isComingMonday = day.dateStr === comingMondayStr;
          const isBeforeComingMonday = day.dateStr < comingMondayStr;
          const log = logsByDate.get(day.dateStr);
          const isLogged = !!log;
          const isHoliday = log?.isHoliday === true;
          const holidayType = log?.holidayType || 'other';
          const holidayInfo = HOLIDAY_CONFIG[holidayType] || HOLIDAY_CONFIG.other;

          const currentAttended =
            editingDay[day.dateStr] !== undefined
              ? editingDay[day.dateStr]
              : isLogged
              ? log.classesAttended
              : day.scheduledHeld;

          const dayPercent =
            isLogged && log.classesHeld > 0
              ? Number(((log.classesAttended / log.classesHeld) * 100).toFixed(0))
              : null;

          const isSavedJustNow = savedNotification === day.dateStr;
          const isMenuOpen = activeHolidayMenu === day.dateStr;

          return (
            <div
              key={day.dateStr}
              id={`weekday-card-${day.dayName.toLowerCase()}`}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                isMenuOpen ? 'z-30' : 'z-0'
              } ${
                isHoliday
                  ? `${holidayInfo.bg} ${holidayInfo.border} shadow-2xs`
                  : isComingMonday
                  ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/30 shadow-xs'
                  : day.isToday
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                  : isLogged
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-dashed border-slate-300 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900">{day.shortDay}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{day.displayDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isComingMonday && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white shadow-2xs">
                        Start
                      </span>
                    )}
                    {day.isToday && (
                      <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-2xs">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {isBeforeComingMonday && !day.isToday && (
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">In baseline till today</span>
                  </div>
                )}

                {/* Scheduled Count Badge or Holiday Badge */}
                <div className="mt-2 flex items-center justify-between">
                  {isHoliday ? (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${holidayInfo.bg} ${holidayInfo.border} ${holidayInfo.color}`}
                    >
                      {holidayInfo.badge}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        day.isEightClassDay
                          ? 'bg-indigo-100/80 text-indigo-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {day.scheduledHeld} Classes
                    </span>
                  )}

                  {isSavedJustNow ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  ) : isHoliday ? (
                    <span className="text-[10px] font-bold text-slate-500">0 Held</span>
                  ) : isLogged ? (
                    <span
                      className={`text-[11px] font-bold ${
                        (dayPercent ?? 0) >= minimumRequirement
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {dayPercent}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Pending</span>
                  )}
                </div>
              </div>

              {/* Holiday Active State View */}
              {isHoliday ? (
                <div className="mt-4 pt-3 border-t border-amber-200/50 flex flex-col justify-between flex-1">
                  <div className="space-y-1 my-2">
                    <p className="text-xs font-bold text-slate-800">Classes Removed</p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      0 of {day.scheduledHeld} held. Does not lower your attendance percentage.
                    </p>
                  </div>

                  {/* Button to remove holiday and restore scheduled classes */}
                  <button
                    type="button"
                    onClick={() => handleRemoveHolidayDay(day.dateStr)}
                    className="w-full mt-2 py-1.5 px-2 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs transition flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Remove Holiday
                  </button>
                </div>
              ) : (
                /* Regular Attendance Entry & Stepper */
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                    <span>Attended:</span>
                    <span className="font-bold text-slate-700">
                      {currentAttended} / {day.scheduledHeld}
                    </span>
                  </div>

                  {/* Stepper controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleSetAttended(day.dateStr, currentAttended - 1, day.scheduledHeld)
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition"
                      title="Decrease attended"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min="0"
                      max={day.scheduledHeld}
                      value={currentAttended}
                      onChange={(e) =>
                        handleSetAttended(
                          day.dateStr,
                          parseInt(e.target.value) || 0,
                          day.scheduledHeld
                        )
                      }
                      className="w-full text-center text-sm font-extrabold text-slate-900 bg-white border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleSetAttended(day.dateStr, currentAttended + 1, day.scheduledHeld)
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition"
                      title="Increase attended"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick 1-Click Action Buttons */}
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAllAttended(day)}
                      className="py-1 px-1 text-[10px] font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition text-center truncate"
                      title={`Mark all ${day.scheduledHeld} attended`}
                    >
                      All ({day.scheduledHeld})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAllBunked(day)}
                      className="py-1 px-1 text-[10px] font-semibold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition text-center truncate"
                      title="Mark 0 attended (bunked all)"
                    >
                      Bunk (0)
                    </button>
                  </div>

                  {/* Holiday declaration button for this specific day */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveHolidayMenu((prev) => (prev === day.dateStr ? null : day.dateStr))
                      }
                      className="w-full py-1 px-1.5 text-[11px] font-medium rounded-md bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-200 transition flex items-center justify-center gap-1"
                    >
                      <Palmtree className="w-3 h-3 text-amber-600" />
                      Mark as Holiday...
                    </button>

                    {/* Popover / Expandable Menu to choose Holiday Type */}
                    {isMenuOpen && (
                      <div className="mt-1.5 p-2 bg-white rounded-lg border border-slate-200 shadow-md space-y-1 text-left z-10 animate-in fade-in zoom-in-95 duration-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                          Select Holiday Type:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeclareHoliday(day.dateStr, 'festival')}
                          className="w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-1.5"
                        >
                          <PartyPopper className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Festival Holiday</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclareHoliday(day.dateStr, 'state')}
                          className="w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-sky-800 hover:bg-sky-50 flex items-center gap-1.5"
                        >
                          <Building2 className="w-3 h-3 text-sky-600 shrink-0" />
                          <span>State Holiday</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclareHoliday(day.dateStr, 'sudden')}
                          className="w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-purple-800 hover:bg-purple-50 flex items-center gap-1.5"
                        >
                          <Zap className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>Sudden Holiday (Rain/Circular)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveHolidayMenu(null)}
                          className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 pt-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Save Regular Attendance Button */}
                  <button
                    type="button"
                    onClick={() => handleSaveDay(day)}
                    className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs ${
                      isLogged
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isLogged ? 'Update Log' : 'Save Day'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week Summary Banner with Holiday Adjustments */}
      <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block font-medium">Scheduled This Week:</span>
            <span className="text-sm font-black text-slate-800">
              {weekStats.scheduledThisWeek} Classes
              {weekStats.holidayCount > 0 && (
                <span className="text-[11px] font-normal text-amber-700 ml-1">
                  ({weekStats.holidayCount} holiday removed -{weekStats.classesRemovedByHolidays} classes)
                </span>
              )}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div>
            <span className="text-slate-400 block font-medium">Logged Attended / Held:</span>
            <span className="text-sm font-black text-slate-800">
              {weekStats.loggedAttendedThisWeek} / {weekStats.loggedHeldThisWeek} attended
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div>
            <span className="text-slate-400 block font-medium">Week's Attendance Rate:</span>
            <span
              className={`text-sm font-black ${
                weekStats.weekPercentage >= minimumRequirement
                  ? 'text-emerald-600'
                  : weekStats.loggedHeldThisWeek === 0
                  ? 'text-slate-500'
                  : 'text-rose-600'
              }`}
            >
              {weekStats.loggedHeldThisWeek > 0 ? `${weekStats.weekPercentage}%` : '—'}
            </span>
          </div>
        </div>

        {/* Combined Overall Info */}
        <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            Combined: <strong>{baselineAttended + weekStats.loggedAttendedThisWeek}</strong> /{' '}
            <strong>{baselineHeld + weekStats.loggedHeldThisWeek}</strong> held • Safe Bunks:{' '}
            <strong className="text-purple-700">
              {baselineHeld + weekStats.loggedHeldThisWeek > 0
                ? Math.max(
                    0,
                    Math.floor(
                      (baselineAttended + weekStats.loggedAttendedThisWeek) / (minimumRequirement / 100) -
                        (baselineHeld + weekStats.loggedHeldThisWeek)
                    )
                  )
                : 0}{' '}
              classes
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
