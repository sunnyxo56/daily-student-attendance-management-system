import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Calendar,
  Check,
  AlertCircle,
  ArrowRight,
  Save,
  Clock,
  Palmtree,
  PartyPopper,
  Building2,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DailyLog, HolidayType } from '../types';
import { getScheduledClassesForDate, HOLIDAY_CONFIG, formatDateWithFullDay } from '../utils/attendanceCalculations';

interface DailyAttendanceEntryProps {
  currentTotalHeld: number;
  currentTotalAttended: number;
  onSaveDailyEntry: (entry: Omit<DailyLog, 'id' | 'timestamp'>) => void;
  onRemoveHoliday?: (dateStr: string) => void;
  todayLog?: DailyLog | null;
  minimumRequirement?: number;
}

export const DailyAttendanceEntry: React.FC<DailyAttendanceEntryProps> = ({
  currentTotalHeld,
  currentTotalAttended,
  onSaveDailyEntry,
  onRemoveHoliday,
  todayLog,
  minimumRequirement = 76,
}) => {
  // Today's date default
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayLog?.date || todayDateStr);

  // Get scheduled info for selected date
  const scheduleInfo = getScheduledClassesForDate(date);

  // Holiday state
  const [isHoliday, setIsHoliday] = useState<boolean>(todayLog?.isHoliday || false);
  const [holidayType, setHolidayType] = useState<HolidayType>(todayLog?.holidayType || 'festival');

  const [classesHeld, setClassesHeld] = useState<number>(
    todayLog?.isHoliday ? 0 : todayLog?.classesHeld ?? scheduleInfo.classesHeld
  );
  const [classesAttended, setClassesAttended] = useState<number>(
    todayLog?.isHoliday ? 0 : todayLog?.classesAttended ?? scheduleInfo.classesHeld
  );
  const [classesBunked, setClassesBunked] = useState<number>(
    todayLog?.isHoliday ? 0 : todayLog?.classesBunked ?? 0
  );
  const [note, setNote] = useState<string>(todayLog?.note || '');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // If todayLog prop updates (e.g. loaded from demo or calendar click)
  useEffect(() => {
    if (todayLog) {
      setDate(todayLog.date);
      setIsHoliday(todayLog.isHoliday === true);
      if (todayLog.holidayType) setHolidayType(todayLog.holidayType);
      setClassesHeld(todayLog.classesHeld);
      setClassesAttended(todayLog.classesAttended);
      setClassesBunked(todayLog.classesBunked);
      setNote(todayLog.note || '');
    }
  }, [todayLog]);

  // When date changes, adjust to that day's schedule
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const daySchedule = getScheduledClassesForDate(newDate);
    setIsHoliday(false);
    setClassesHeld(daySchedule.classesHeld);
    setClassesAttended(daySchedule.classesHeld);
    setClassesBunked(0);
    setNote('');
  };

  // Toggle or select Holiday
  const handleSelectHoliday = (type: HolidayType) => {
    setIsHoliday(true);
    setHolidayType(type);
    setClassesHeld(0);
    setClassesAttended(0);
    setClassesBunked(0);
    const label = HOLIDAY_CONFIG[type].label;
    setNote(`${label} - classes canceled`);
  };

  // Switch back to regular class day
  const handleSelectRegularDay = () => {
    setIsHoliday(false);
    const daySchedule = getScheduledClassesForDate(date);
    setClassesHeld(daySchedule.classesHeld);
    setClassesAttended(daySchedule.classesHeld);
    setClassesBunked(0);
    setNote('');
  };

  // Handler when Held classes change: keep attended capped, update bunked
  const handleHeldChange = (val: number) => {
    if (isHoliday) return;
    const held = Math.max(0, val);
    setClassesHeld(held);
    const newAttended = Math.min(classesAttended, held);
    setClassesAttended(newAttended);
    setClassesBunked(Math.max(0, held - newAttended));
  };

  // Handler when Attended changes: automatically compute bunked
  const handleAttendedChange = (val: number) => {
    if (isHoliday) return;
    const attended = Math.max(0, Math.min(classesHeld, val));
    setClassesAttended(attended);
    setClassesBunked(Math.max(0, classesHeld - attended));
  };

  // Handler when Bunked changes: automatically compute attended
  const handleBunkedChange = (val: number) => {
    if (isHoliday) return;
    const bunked = Math.max(0, Math.min(classesHeld, val));
    setClassesBunked(bunked);
    setClassesAttended(Math.max(0, classesHeld - bunked));
  };

  // Quick preset class buttons
  const setQuickClasses = (held: number, attended: number) => {
    if (isHoliday) return;
    setClassesHeld(held);
    setClassesAttended(attended);
    setClassesBunked(Math.max(0, held - attended));
  };

  // Calculations for live automatic preview:
  const projectedTotalHeld = currentTotalHeld + classesHeld;
  const projectedTotalAttended = currentTotalAttended + classesAttended;
  const projectedPercentage =
    projectedTotalHeld > 0
      ? Number(((projectedTotalAttended / projectedTotalHeld) * 100).toFixed(1))
      : 100;

  const currentPercentage =
    currentTotalHeld > 0
      ? Number(((currentTotalAttended / currentTotalHeld) * 100).toFixed(1))
      : 100;

  const percentageDiff = Number((projectedPercentage - currentPercentage).toFixed(1));

  const minRatio = minimumRequirement / 100;

  const currentSafeBunks =
    currentTotalHeld > 0
      ? Math.max(0, Math.floor((currentTotalAttended / minRatio) - currentTotalHeld))
      : 0;

  const projectedSafeBunks =
    projectedTotalHeld > 0
      ? Math.max(0, Math.floor((projectedTotalAttended / minRatio) - projectedTotalHeld))
      : 0;

  const bunksDiff = projectedSafeBunks - currentSafeBunks;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDailyEntry({
      date,
      classesHeld: isHoliday ? 0 : classesHeld,
      classesAttended: isHoliday ? 0 : classesAttended,
      classesBunked: isHoliday ? 0 : classesBunked,
      isHoliday,
      holidayType: isHoliday ? holidayType : undefined,
      holidayName: isHoliday ? HOLIDAY_CONFIG[holidayType].label : undefined,
      note: note.trim() || undefined,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <div
      id="daily-attendance-entry-card"
      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              1. Daily Attendance Entry
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log today's attended or bunked classes, or declare a holiday to remove classes
          </p>
        </div>

        {/* Date Selector & Weekday Badge */}
        <div className="flex flex-col sm:items-end gap-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 border border-slate-200 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                id="attendance-date-input"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="border-none bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <span
              className={`font-semibold px-2 py-1 rounded-md text-[11px] border ${
                isHoliday
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : scheduleInfo.isEightClassDay
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isHoliday
                ? `${scheduleInfo.dayName}: Holiday (0 Held)`
                : `${scheduleInfo.dayName}: ${scheduleInfo.classesHeld} Scheduled`}
            </span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatDateWithFullDay(date)}</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Day Type Selector: Regular or Holiday Type */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Day Status & Holiday Removal:
            </span>
            {isHoliday && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Classes Removed • % Protected
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={handleSelectRegularDay}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                !isHoliday
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Regular Class Day</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectHoliday('festival')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                isHoliday && holidayType === 'festival'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Festival Holiday</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectHoliday('state')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                isHoliday && holidayType === 'state'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-sky-50/70 hover:bg-sky-100 text-sky-900 border-sky-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>State Holiday</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectHoliday('sudden')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                isHoliday && holidayType === 'sudden'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                  : 'bg-purple-50/70 hover:bg-purple-100 text-purple-900 border-purple-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sudden Holiday</span>
            </button>
          </div>
        </div>

        {/* Holiday Banner or Class Number Inputs */}
        {isHoliday ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {HOLIDAY_CONFIG[holidayType]?.badge || 'Holiday Active'}
                </h3>
                <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                  Scheduled classes ({scheduleInfo.classesHeld} periods) have been removed for this date.
                  Total classes held and attended for today are set to <strong>0</strong> so your cumulative attendance percentage is not penalized.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectRegularDay}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition shrink-0 flex items-center gap-1 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Schedule ({scheduleInfo.classesHeld} classes)
            </button>
          </div>
        ) : (
          <>
            {/* 3 Steppers / Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field 1: Total classes held today */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 focus-within:ring-2 focus-within:ring-indigo-500 transition">
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="input-classes-held-today"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Classes Held Today
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="input-classes-held-today"
                    type="number"
                    min="0"
                    max="20"
                    value={classesHeld}
                    onChange={(e) => handleHeldChange(parseInt(e.target.value) || 0)}
                    className="w-full text-2xl font-extrabold text-slate-900 bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleHeldChange(classesHeld - 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                      aria-label="Decrease held classes"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeldChange(classesHeld + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 flex items-center justify-center text-sm"
                      aria-label="Increase held classes"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Scheduled for {scheduleInfo.dayName}
                </p>
              </div>

              {/* Field 2: Number of classes attended today */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 focus-within:ring-2 focus-within:ring-emerald-500 transition">
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="input-classes-attended-today"
                    className="text-xs font-bold text-emerald-800 uppercase tracking-wider"
                  >
                    Classes Attended Today
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="input-classes-attended-today"
                    type="number"
                    min="0"
                    max={classesHeld}
                    value={classesAttended}
                    onChange={(e) => handleAttendedChange(parseInt(e.target.value) || 0)}
                    className="w-full text-2xl font-extrabold text-emerald-700 bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleAttendedChange(classesAttended - 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center justify-center text-sm"
                      aria-label="Decrease attended classes"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttendedChange(classesAttended + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center justify-center text-sm"
                      aria-label="Increase attended classes"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-600 mt-1">Present in lecture/lab</p>
              </div>

              {/* Field 3: Number of classes bunked today */}
              <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3.5 focus-within:ring-2 focus-within:ring-rose-500 transition">
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="input-classes-bunked-today"
                    className="text-xs font-bold text-rose-800 uppercase tracking-wider"
                  >
                    Classes Bunked Today
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="input-classes-bunked-today"
                    type="number"
                    min="0"
                    max={classesHeld}
                    value={classesBunked}
                    onChange={(e) => handleBunkedChange(parseInt(e.target.value) || 0)}
                    className="w-full text-2xl font-extrabold text-rose-600 bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleBunkedChange(classesBunked - 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 flex items-center justify-center text-sm"
                      aria-label="Decrease bunked classes"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBunkedChange(classesBunked + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 flex items-center justify-center text-sm"
                      aria-label="Increase bunked classes"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-rose-600 mt-1">Missed or skipped</p>
              </div>
            </div>

            {/* Quick presets for selected date */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="text-slate-400 font-medium">Quick presets:</span>
              <button
                type="button"
                onClick={() => setQuickClasses(classesHeld, classesHeld)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition font-medium"
              >
                Attended All ({classesHeld}/{classesHeld})
              </button>
              <button
                type="button"
                onClick={() => setQuickClasses(classesHeld, Math.max(0, classesHeld - 1))}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition font-medium"
              >
                Bunked 1 ({Math.max(0, classesHeld - 1)}/{classesHeld})
              </button>
              <button
                type="button"
                onClick={() => setQuickClasses(classesHeld, Math.max(0, classesHeld - 2))}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition font-medium"
              >
                Bunked 2 ({Math.max(0, classesHeld - 2)}/{classesHeld})
              </button>
              <button
                type="button"
                onClick={() => setQuickClasses(classesHeld, 0)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 transition font-medium"
              >
                Bunked All (0/{classesHeld})
              </button>
            </div>
          </>
        )}

        {/* Optional note input */}
        <div>
          <input
            id="attendance-note-input"
            type="text"
            placeholder="Optional note (e.g. Festival name, rain circular, or lab topic)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Automatic Real-Time Update Preview Box */}
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl p-4 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Automatic Update Calculation
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Formula: (Attended / Held) × 100
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Total Held Update */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Total Classes Held</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-slate-400 font-medium">{currentTotalHeld}</span>
                <span className="text-slate-400">+</span>
                <span className="font-bold text-slate-700">{classesHeld}</span>
                <ArrowRight className="w-3 h-3 text-indigo-500 inline mx-0.5" />
                <span className="text-base font-extrabold text-slate-900">
                  {projectedTotalHeld}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isHoliday ? 'Holiday: 0 classes added' : 'Previous + Today'}
              </span>
            </div>

            {/* Total Attended Update */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Total Attended</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-slate-400 font-medium">{currentTotalAttended}</span>
                <span className="text-slate-400">+</span>
                <span className="font-bold text-emerald-600">{classesAttended}</span>
                <ArrowRight className="w-3 h-3 text-indigo-500 inline mx-0.5" />
                <span className="text-base font-extrabold text-emerald-700">
                  {projectedTotalAttended}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isHoliday ? 'Holiday: preserved' : 'Previous + Attended'}
              </span>
            </div>

            {/* Attendance % Update */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Attendance %</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-slate-400 font-medium">{currentPercentage}%</span>
                <ArrowRight className="w-3 h-3 text-indigo-500 inline mx-0.5" />
                <span
                  className={`text-base font-extrabold ${
                    projectedPercentage >= minimumRequirement ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {projectedPercentage}%
                </span>
                {percentageDiff !== 0 && (
                  <span
                    className={`text-[11px] font-bold ${
                      percentageDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ({percentageDiff > 0 ? `+${percentageDiff}%` : `${percentageDiff}%`})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isHoliday
                  ? 'Protected (no change)'
                  : projectedPercentage >= minimumRequirement
                  ? 'Maintains safe standing'
                  : `⚠️ Drops below ${minimumRequirement}%`}
              </span>
            </div>

            {/* Bunks You Can Do Update */}
            <div className="bg-white/90 p-3 rounded-lg border border-purple-200/80">
              <span className="text-purple-900 font-semibold block">Bunks You Can Do</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-slate-400 font-medium">{currentSafeBunks}</span>
                <ArrowRight className="w-3 h-3 text-purple-500 inline mx-0.5" />
                <span
                  className={`text-base font-black ${
                    projectedSafeBunks > 0 ? 'text-purple-700' : 'text-rose-600'
                  }`}
                >
                  {projectedSafeBunks}
                </span>
                {bunksDiff !== 0 && (
                  <span
                    className={`text-[11px] font-bold ${
                      bunksDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ({bunksDiff > 0 ? `+${bunksDiff}` : `${bunksDiff}`})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {projectedSafeBunks > 0
                  ? `Allowed without dropping <${minimumRequirement}%`
                  : `0 bunks allowed (<${minimumRequirement}% risk)`}
              </span>
            </div>
          </div>
        </div>

        {/* Submit / Save Button */}
        <div className="flex items-center gap-3">
          <button
            id="save-daily-attendance-btn"
            type="submit"
            className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>Saved Successfully!</span>
              </>
            ) : isHoliday ? (
              <>
                <Palmtree className="w-4 h-4" />
                <span>Save Holiday Entry (Exclude Classes)</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Today's Attendance Entry</span>
              </>
            )}
          </button>

          {/* If the current date is already logged as a holiday, give a direct "Remove Holiday" button */}
          {todayLog?.isHoliday && onRemoveHoliday && (
            <button
              type="button"
              onClick={() => onRemoveHoliday(date)}
              className="py-3 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remove Holiday Log
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
