import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  ChevronRight,
  Settings,
  Calendar,
  Palmtree,
  RotateCcw,
  X,
  AlertTriangle,
  Check,
  Home,
} from 'lucide-react';
import { AppUser, DailyLog, DailyReminderPreferences } from '../types';
import { OfficialAdminAttendanceRecord } from '../utils/authStorage';
import {
  getReminderPreferences,
  saveReminderPreferences,
  snoozeReminder,
  isReminderSnoozed,
  shouldTriggerDailyAlert,
  markTodayNotified,
  triggerBrowserNotification,
  playChimeSound,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  formatTime12Hour,
  STUDENT_FREE_TIME_PRESETS,
  StudentFreeTimePreset,
} from '../utils/reminderStorage';
import { formatDateWithFullDay } from '../utils/attendanceCalculations';

interface DailyAttendanceReminderProps {
  currentUser: AppUser;
  todayStr: string;
  todayLog: DailyLog | null;
  onQuickHoliday: () => void;
  onScrollToEntryForm: () => void;
  safeBunksRemaining: number;
  onGoToHome?: () => void;
  adminTodayRecord?: OfficialAdminAttendanceRecord | null;
}

export const DailyAttendanceReminder: React.FC<DailyAttendanceReminderProps> = ({
  currentUser,
  todayStr,
  todayLog,
  onQuickHoliday,
  onScrollToEntryForm,
  safeBunksRemaining,
  onGoToHome,
}) => {
  const [preferences, setPreferences] = useState<DailyReminderPreferences>(() =>
    getReminderPreferences(currentUser.id)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(() => isReminderSnoozed(preferences));
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => getBrowserNotificationPermission()
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [freeTimeToast, setFreeTimeToast] = useState<string | null>(null);

  // Timing selection state
  const [selectedTiming, setSelectedTiming] = useState<string>(() => preferences.reminderTime);
  const [isCustomTimingOpen, setIsCustomTimingOpen] = useState(false);
  const [customInputTime, setCustomInputTime] = useState<string>(() => preferences.reminderTime);
  const [timingSavedSuccess, setTimingSavedSuccess] = useState(false);

  // Return to home page function
  const returnToHome = () => {
    setIsSettingsOpen(false);
    setIsCustomTimingOpen(false);
    if (onGoToHome) {
      onGoToHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // When student clicks a timing option (preset or custom), mark it as selected
  const handleChooseTiming = (time: string) => {
    setSelectedTiming(time);
    setCustomInputTime(time);
    setTimingSavedSuccess(false);
  };

  // Explicit Save Timing function when user clicks the "Save Timing" button
  const handleSaveTiming = (timeToSave?: string, closeModal = false) => {
    const finalTime = timeToSave || selectedTiming;
    const matchedPreset = STUDENT_FREE_TIME_PRESETS.find((p) => p.time === finalTime);
    const updated: DailyReminderPreferences = {
      ...preferences,
      reminderTime: finalTime,
      freeTimeSlot: matchedPreset ? matchedPreset.id : 'custom',
      freeTimeLabel: matchedPreset ? matchedPreset.label : `Custom (${formatTime12Hour(finalTime)})`,
    };
    saveReminderPreferences(currentUser.id, updated);
    setPreferences(updated);
    setSelectedTiming(finalTime);
    setCustomInputTime(finalTime);
    setIsCustomTimingOpen(false);
    setTimingSavedSuccess(true);
    setFreeTimeToast(`✓ Timing saved for ${formatTime12Hour(finalTime)}! Returning to Home...`);

    if (closeModal) {
      setIsSettingsOpen(false);
      setSaveSuccessMsg(false);
    }

    // Return to home page
    setTimeout(() => {
      returnToHome();
    }, 250);

    // Return back to normal state after notification
    setTimeout(() => {
      setTimingSavedSuccess(false);
      setFreeTimeToast(null);
    }, 3500);
  };

  const isTodayLogged = !!todayLog;
  const formattedToday = formatDateWithFullDay(todayStr);

  // Sync preferences whenever currentUser changes
  useEffect(() => {
    const prefs = getReminderPreferences(currentUser.id);
    setPreferences(prefs);
    setSelectedTiming(prefs.reminderTime);
    setCustomInputTime(prefs.reminderTime);
    setIsSnoozed(isReminderSnoozed(prefs));
  }, [currentUser.id]);

  // Periodic check (every 30 seconds) to check if reminder is due
  useEffect(() => {
    const checkReminder = () => {
      const currentPrefs = getReminderPreferences(currentUser.id);
      setIsSnoozed(isReminderSnoozed(currentPrefs));

      if (shouldTriggerDailyAlert(currentUser.id, currentPrefs, isTodayLogged)) {
        // Trigger browser notification if permitted
        if (currentPrefs.browserNotifications && notificationPermission === 'granted') {
          triggerBrowserNotification(
            '🔔 Daily Attendance Reminder',
            {
              body: `Hi ${currentUser.name}, you haven't recorded your attendance for Today (${formattedToday}) yet. Click to mark your classes!`,
            },
            () => {
              onScrollToEntryForm();
            }
          );
        }

        // Play sound chime if enabled
        if (currentPrefs.soundAlert) {
          playChimeSound();
        }

        // Mark notified today so it doesn't repeatedly fire
        markTodayNotified(currentUser.id);
        setPreferences((prev) => ({ ...prev, lastNotifiedDate: todayStr }));
      }
    };

    // Check once immediately on load/mount
    checkReminder();

    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [currentUser.id, isTodayLogged, notificationPermission, todayStr, formattedToday, onScrollToEntryForm]);

  // Handle Snooze (1 hour)
  const handleSnooze = (minutes = 60) => {
    snoozeReminder(currentUser.id, minutes);
    const updated = getReminderPreferences(currentUser.id);
    setPreferences(updated);
    setIsSnoozed(true);
  };

  const handleCancelSnooze = () => {
    const updated = { ...preferences, snoozedUntil: undefined };
    saveReminderPreferences(currentUser.id, updated);
    setPreferences(updated);
    setIsSnoozed(false);
  };

  // Request browser notification permission
  const handleRequestPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      const updated = { ...preferences, browserNotifications: true };
      saveReminderPreferences(currentUser.id, updated);
      setPreferences(updated);
    }
  };

  // Trigger immediate test notification & chime
  const handleSendTestReminder = () => {
    if (preferences.soundAlert) {
      playChimeSound();
    }

    if (notificationPermission === 'granted') {
      triggerBrowserNotification(
        '🔔 Attendance Reminder (Test)',
        {
          body: `Reminder active for ${currentUser.name}! Set for ${formatTime12Hour(preferences.reminderTime)} daily.`,
        },
        () => {
          onScrollToEntryForm();
        }
      );
    }

    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 4000);
  };

  // Save settings form
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveReminderPreferences(currentUser.id, preferences);
    setSaveSuccessMsg(true);
    setFreeTimeToast(`✓ Preferences saved! Returning to Home...`);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      returnToHome();
    }, 300);
    setTimeout(() => {
      setFreeTimeToast(null);
    }, 3500);
  };

  return (
    <div id="daily-attendance-reminder-card" className="w-full">
      {/* 1. If Attendance is PENDING for Today */}
      {!isTodayLogged ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Icon & Alert Text */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-300 animate-bounce">
                <Bell className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                    Action Required
                  </span>
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Free Time Reminder: {formatTime12Hour(preferences.reminderTime)}
                  </span>
                  {isSnoozed && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                      Snoozed
                      <button
                        type="button"
                        onClick={handleCancelSnooze}
                        className="text-indigo-600 hover:underline font-bold ml-1"
                      >
                        Undo
                      </button>
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  Today&apos;s Attendance is Pending: <span className="text-indigo-700">{formattedToday}</span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  Hi <strong>{currentUser.name}</strong>, you haven&apos;t marked today&apos;s classes yet!
                  Log your lectures attended or missed now so your safe bunks ({safeBunksRemaining} remaining) and 75% calculation stay 100% accurate.
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap md:shrink-0 self-end md:self-center">
              <button
                type="button"
                id="record-attendance-reminder-btn"
                onClick={onScrollToEntryForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-sm transition hover:shadow-md cursor-pointer"
              >
                <span>Record Attendance Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="quick-holiday-reminder-btn"
                onClick={onQuickHoliday}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                title="Mark today as a college holiday or day off"
              >
                <Palmtree className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Mark as Holiday</span>
                <span className="sm:hidden">Holiday</span>
              </button>

              <button
                type="button"
                onClick={() => handleSnooze(60)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 text-xs sm:text-sm font-semibold transition cursor-pointer"
                title="Snooze reminder for 1 hour"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Snooze (1h)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Configure daily reminder time and notifications"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Free Time Timing Selection Bar with Save Button */}
          <div className="mt-3.5 pt-3 border-t border-amber-300/60 flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Student Free Time:
                </span>
                <span className="text-xs text-amber-900 font-bold bg-white/90 px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                  Active: {formatTime12Hour(preferences.reminderTime)}
                </span>
                {timingSavedSuccess && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300 animate-in fade-in">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Timing Saved!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-amber-950/80 font-bold hidden md:inline">Select timing:</span>
                {STUDENT_FREE_TIME_PRESETS.map((preset) => {
                  const isSelected = selectedTiming === preset.time;
                  const isSavedActive = preferences.reminderTime === preset.time;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleChooseTiming(preset.time)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400'
                          : isSavedActive
                          ? 'bg-amber-100/90 text-amber-950 border border-amber-300 font-extrabold'
                          : 'bg-white/90 hover:bg-white text-slate-800 border border-amber-300/80 hover:border-amber-400'
                      }`}
                      title={`${preset.period}: ${preset.description}`}
                    >
                      <span>{preset.shortTitle}</span>
                      {isSavedActive && !isSelected && <span className="text-[9px] text-amber-800 font-bold">✓</span>}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCustomTimingOpen(!isCustomTimingOpen)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    isCustomTimingOpen
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'text-amber-950 bg-amber-200/80 hover:bg-amber-300 border-amber-300'
                  }`}
                  title="Choose custom timing"
                >
                  Custom 🕒
                </button>

                {/* Save Timing Button: only shown when a new timing is picked */}
                {(selectedTiming !== preferences.reminderTime || isCustomTimingOpen) && (
                  <button
                    type="button"
                    id="save-timing-button"
                    onClick={() => handleSaveTiming(selectedTiming, true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 animate-in fade-in"
                    title="Click to save this timing and return to home page"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Timing ({formatTime12Hour(selectedTiming)}) & Go to Home</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Time Input Dropdown */}
            {isCustomTimingOpen && (
              <div className="p-2.5 bg-white/95 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950">Pick Custom Hour:</span>
                  <input
                    type="time"
                    value={customInputTime}
                    onChange={(e) => handleChooseTiming(e.target.value)}
                    className="px-2.5 py-1 border border-amber-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-indigo-700">
                    = {formatTime12Hour(customInputTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTimingOpen(false);
                      setSelectedTiming(preferences.reminderTime);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTiming(customInputTime, true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Custom Timing & Go to Home</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. If Attendance is LOGGED for Today */
        <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs transition-all space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-emerald-900">
                    Today&apos;s Attendance Recorded!
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">({formattedToday})</span>
                </div>
                <p className="text-xs text-emerald-800">
                  {todayLog.isHoliday ? (
                    <span>
                      Marked as <strong>Holiday</strong>: {todayLog.holidayName || todayLog.holidayType || 'College Holiday'}
                    </span>
                  ) : (
                    <span>
                      Logged: <strong>{todayLog.classesAttended}</strong> of{' '}
                      <strong>{todayLog.classesHeld}</strong> classes attended{' '}
                      {todayLog.classesBunked > 0 && (
                        <span className="text-rose-700 font-semibold">({todayLog.classesBunked} bunked)</span>
                      )}
                      . Great job keeping your attendance up to date!
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={onScrollToEntryForm}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 text-xs font-bold transition shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Edit Today&apos;s Record</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100/70 transition"
                title="Reminder Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Free Time Timing Selection Bar even when logged */}
          <div className="pt-2.5 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-950 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                Daily Reminder Timing:
              </span>
              <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                Active: {formatTime12Hour(preferences.reminderTime)}
              </span>
              {timingSavedSuccess && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[11px] font-black animate-in fade-in">
                  <Check className="w-3 h-3 text-emerald-700" />
                  Saved!
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-emerald-900/80 font-semibold hidden md:inline">Change:</span>
              {STUDENT_FREE_TIME_PRESETS.map((preset) => {
                const isSelected = selectedTiming === preset.time;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleChooseTiming(preset.time)}
                    className={`px-2 py-0.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {preset.shortTitle}
                  </button>
                );
              })}

              <button
                type="button"
                id="save-timing-button-logged"
                onClick={() => handleSaveTiming(selectedTiming, true)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer shadow-2xs ${
                  selectedTiming !== preferences.reminderTime
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400 animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>Save Timing ({formatTime12Hour(selectedTiming)}) & Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reminder Settings & Notification Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Daily Attendance Reminder Settings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated daily alerts so students never miss entering classes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 mt-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Enable Daily Reminders
                  </span>
                  <p className="text-xs text-slate-500">
                    Show in-app banner reminders when today&apos;s attendance is pending
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, enabled: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              {/* Student Free Time Slot Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Your Free Time Timing (When You Are Available)
                  </label>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Selected: {formatTime12Hour(preferences.reminderTime)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STUDENT_FREE_TIME_PRESETS.map((preset) => {
                    const isSelected = preferences.reminderTime === preset.time;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            reminderTime: preset.time,
                            freeTimeSlot: preset.id,
                            freeTimeLabel: preset.label,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900">
                            {preset.shortTitle}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {preset.period}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exact Custom Free Time Input */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Or Set Exact Custom Free Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={preferences.reminderTime}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        reminderTime: e.target.value,
                        freeTimeSlot: 'custom',
                        freeTimeLabel: `Custom (${formatTime12Hour(e.target.value)})`,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-2 rounded-xl border border-indigo-200">
                    {formatTime12Hour(preferences.reminderTime)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Students can freely adjust their notification hour to when classes and travel are finished.
                </p>
              </div>

              {/* Quick Save Selected Timing Action inside Modal */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Timing Selected: {formatTime12Hour(preferences.reminderTime)}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Click to apply and save this timing
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="modal-save-timing-btn"
                  onClick={() => {
                    handleSaveTiming(preferences.reminderTime, true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Save Timing & Go to Home</span>
                </button>
              </div>

              {/* Browser Desktop Push Notification */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-700" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-indigo-950">
                        Browser Push Notifications
                      </span>
                      <p className="text-[11px] text-indigo-700">
                        Receive desktop alerts even if this tab is minimized
                      </p>
                    </div>
                  </div>

                  {notificationPermission === 'granted' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      Permission Granted
                    </span>
                  ) : notificationPermission === 'denied' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                      Blocked by Browser
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                    >
                      Enable Push
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-indigo-100">
                  <span className="text-xs text-indigo-900 font-medium">
                    Trigger push notifications at {formatTime12Hour(preferences.reminderTime)}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.browserNotifications}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        browserNotifications: e.target.checked,
                      })
                    }
                    disabled={notificationPermission !== 'granted'}
                    className="w-4 h-4 text-indigo-600 rounded disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Sound Chime Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {preferences.soundAlert ? (
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Audio Chime Alert
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Plays a pleasant gentle tone when reminders are triggered
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundAlert}
                  onChange={(e) =>
                    setPreferences({ ...preferences, soundAlert: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              {/* Test Button & Save Result */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSendTestReminder}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Send Test Reminder</span>
                </button>

                <div className="flex items-center gap-2">
                  {saveSuccessMsg && (
                    <span className="text-xs text-emerald-600 font-bold animate-in fade-in">
                      Preferences Saved!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    <Home className="w-4 h-4" />
                    <span>Save & Go to Home</span>
                  </button>
                </div>
              </div>

              {testNotificationSent && (
                <p className="text-xs text-center text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg">
                  🔔 Test reminder fired! Check your screen and audio.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
