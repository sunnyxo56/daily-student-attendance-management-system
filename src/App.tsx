import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardMetrics } from './components/DashboardMetrics';
import { WarningBanner } from './components/WarningBanner';
import { PriorClassesCard } from './components/PriorClassesCard';
import { WeeklyAttendanceTracker } from './components/WeeklyAttendanceTracker';
import { DailyAttendanceEntry } from './components/DailyAttendanceEntry';
import { BunkCalculator } from './components/BunkCalculator';
import { PresentAttendanceBunkCard } from './components/PresentAttendanceBunkCard';
import { AttendanceHistory } from './components/AttendanceHistory';
import { InitialBaselineModal } from './components/InitialBaselineModal';
import { LoginPage } from './components/LoginPage';
import { AdminPortal } from './components/AdminPortal';
import { SignOutModal } from './components/SignOutModal';
import { SavedAttendanceConfirmation } from './components/SavedAttendanceConfirmation';
import { DailyAttendanceReminder } from './components/DailyAttendanceReminder';
import { AttendanceState, DailyLog, AppUser, SavedAttendanceFeedback } from './types';
import {
  calculateAttendance,
  formatDateWithDay,
  formatDateWithFullDay,
  getTodayDateString,
  getComingMondayDateString,
} from './utils/attendanceCalculations';
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  updateCurrentUserAttendanceState,
  DEFAULT_ADMIN,
  getAdminOfficialAttendance,
  saveAdminOfficialAttendance,
  deleteAdminOfficialAttendance,
  OfficialAdminAttendanceRecord,
} from './utils/authStorage';

export default function App() {
  // Session User State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getCurrentSessionUser());
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);

  // Attendance state initialized from current logged-in user or fallback
  const [state, setState] = useState<AttendanceState>(() => {
    if (currentUser?.attendanceState) {
      return currentUser.attendanceState;
    }
    return DEFAULT_ADMIN.attendanceState;
  });

  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [simulatedBunkCount, setSimulatedBunkCount] = useState<number | undefined>(undefined);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Feedback state displayed immediately after saving attendance
  const [savedFeedback, setSavedFeedback] = useState<SavedAttendanceFeedback | null>(null);

  // Sync state whenever currentUser changes (e.g. login/logout)
  useEffect(() => {
    if (currentUser) {
      setState(currentUser.attendanceState);
    }
  }, [currentUser?.id]);

  // Persist state updates to the active user's storage record
  const updateStateAndPersist = (updater: AttendanceState | ((prev: AttendanceState) => AttendanceState)) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (currentUser) {
        updateCurrentUserAttendanceState(currentUser.id, next);
        setCurrentUser((u) => (u ? { ...u, attendanceState: next } : null));
      }
      return next;
    });
  };

  const refreshCurrentUserFromStorage = () => {
    const updated = getCurrentSessionUser();
    if (updated) {
      setCurrentUser(updated);
      setState(updated.attendanceState);
    }
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentSessionUser(user);
    setCurrentUser(user);
    setState(user.attendanceState);
    setIsAdminPortalOpen(false);
    setLogoutNotice(null);
  };

  const handleOpenSignOutModal = () => {
    setIsSignOutModalOpen(true);
  };

  const handleConfirmSignOut = () => {
    setCurrentSessionUser(null);
    setCurrentUser(null);
    setIsAdminPortalOpen(false);
    setIsSignOutModalOpen(false);
    setLogoutNotice('You have been signed out safely. All your attendance records and settings are securely preserved.');
  };

  const handleGoToHome = () => {
    setIsAdminPortalOpen(false);
    setIsBaselineModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectBunkToSimulate = (bunks: number) => {
    setSimulatedBunkCount(bunks);
    const el = document.getElementById('bunk-calculator-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Today's date
  const todayStr = getTodayDateString();
  const todayFormattedWithDay = formatDateWithFullDay(todayStr);
  const comingMondayStr = useMemo(() => getComingMondayDateString(todayStr), [todayStr]);
  const effectiveCountingStartDate = state.countingStartDate || comingMondayStr;

  // Official college attendance entered by admin for today
  const [adminTodayRecord, setAdminTodayRecord] = useState<OfficialAdminAttendanceRecord | null>(
    () => getAdminOfficialAttendance(todayStr)
  );

  // Keep adminTodayRecord in sync
  useEffect(() => {
    setAdminTodayRecord(getAdminOfficialAttendance(todayStr));
  }, [todayStr, currentUser?.id]);

  // Find today's log if already recorded
  const todayLog = useMemo(() => {
    return state.dailyLogs.find((l) => l.date === todayStr) || null;
  }, [state.dailyLogs, todayStr]);

  const todayHeld = todayLog ? todayLog.classesHeld : 0;
  const todayAttended = todayLog ? todayLog.classesAttended : 0;

  // Cumulative totals:
  // Baseline represents all classes conducted till today (e.g. 415 held).
  // Live daily tracking starts counting from Coming Monday onwards!
  // Any logs prior to the counting start date are recognized as captured in the baseline count.
  const { totalHeld, totalAttended, logsHeld, logsAttended } = useMemo(() => {
    const activeLogs = state.dailyLogs.filter((l) => l.date >= effectiveCountingStartDate);

    const lHeld = activeLogs.reduce((acc, curr) => acc + curr.classesHeld, 0);
    const lAttended = activeLogs.reduce((acc, curr) => acc + curr.classesAttended, 0);
    return {
      totalHeld: state.baselineHeld + lHeld,
      totalAttended: state.baselineAttended + lAttended,
      logsHeld: lHeld,
      logsAttended: lAttended,
    };
  }, [state, effectiveCountingStartDate]);

  // Current calculations
  const calculationResult = useMemo(() => {
    return calculateAttendance(totalHeld, totalAttended, state.minimumRequirement);
  }, [totalHeld, totalAttended, state.minimumRequirement]);

  // Handle saving/updating a daily entry and showing feedback with overall attendance + today's saved data
  const handleSaveDailyEntry = (entry: Omit<DailyLog, 'id' | 'timestamp'>) => {
    // 1. Calculate previous attendance percentage
    const previousPercentage = calculationResult.percentage;

    // 2. Compute updated dailyLogs array
    const existingIdx = state.dailyLogs.findIndex((l) => l.date === entry.date);
    let updatedLogs: DailyLog[];

    if (existingIdx >= 0) {
      updatedLogs = [...state.dailyLogs];
      updatedLogs[existingIdx] = {
        ...updatedLogs[existingIdx],
        classesHeld: entry.classesHeld,
        classesAttended: entry.classesAttended,
        classesBunked: entry.classesBunked,
        note: entry.note,
        isHoliday: entry.isHoliday,
        holidayType: entry.holidayType,
        holidayName: entry.holidayName,
      };
    } else {
      const newLog: DailyLog = {
        ...entry,
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
      };
      updatedLogs = [newLog, ...state.dailyLogs];
    }

    // 3. Compute new cumulative totals (respecting counting start date from coming Monday)
    const activeUpdatedLogs = updatedLogs.filter((l) => l.date >= effectiveCountingStartDate);
    const newLogsHeld = activeUpdatedLogs.reduce((acc, curr) => acc + curr.classesHeld, 0);
    const newLogsAttended = activeUpdatedLogs.reduce((acc, curr) => acc + curr.classesAttended, 0);
    const newTotalHeld = state.baselineHeld + newLogsHeld;
    const newTotalAttended = state.baselineAttended + newLogsAttended;

    const newCalc = calculateAttendance(newTotalHeld, newTotalAttended, state.minimumRequirement);

    // 4. Update state and persist
    updateStateAndPersist((prev) => ({
      ...prev,
      dailyLogs: updatedLogs,
    }));

    // If active user is Admin and saving attendance for today, record as official college entry
    if (currentUser?.role === 'admin' && entry.date === todayStr) {
      const res = saveAdminOfficialAttendance(currentUser, entry, false);
      if (res.success) {
        setAdminTodayRecord(res.record);
      }
    }

    // 5. Display comprehensive feedback card containing overall attendance + today's saved data
    setSavedFeedback({
      show: true,
      savedDate: entry.date,
      savedHeld: entry.classesHeld,
      savedAttended: entry.classesAttended,
      savedBunked: entry.classesBunked,
      isHoliday: !!entry.isHoliday,
      holidayType: entry.holidayType,
      holidayName: entry.holidayName,
      note: entry.note,
      previousTotalHeld: totalHeld,
      previousTotalAttended: totalAttended,
      previousPercentage,
      newTotalHeld,
      newTotalAttended,
      newPercentage: newCalc.percentage,
      newSafeBunks: newCalc.safeBunks,
    });

    // Smooth scroll to confirmation
    setTimeout(() => {
      const confirmationEl = document.getElementById('saved-attendance-confirmation-card');
      if (confirmationEl) {
        confirmationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Handle removing a holiday / restoring a day back to unlogged
  const handleRemoveHoliday = (dateStr: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      dailyLogs: prev.dailyLogs.filter((l) => l.date !== dateStr),
    }));
  };

  // Handle deleting a log
  const handleDeleteLog = (id: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      dailyLogs: prev.dailyLogs.filter((l) => l.id !== id),
    }));
  };

  // Handle clearing all daily logs
  const handleClearAllDailyLogs = () => {
    if (window.confirm('Clear all daily attendance records? Your baseline count will remain intact.')) {
      updateStateAndPersist((prev) => ({
        ...prev,
        dailyLogs: [],
      }));
    }
  };

  // Scroll helpers for daily attendance reminder
  const scrollToEntryForm = () => {
    const el = document.getElementById('daily-attendance-entry-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400'), 2500);
    }
  };

  const scrollToReminder = () => {
    const el = document.getElementById('daily-attendance-reminder-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      scrollToEntryForm();
    }
  };

  const handleQuickHolidayToday = () => {
    handleSaveDailyEntry({
      date: todayStr,
      classesHeld: 0,
      classesAttended: 0,
      classesBunked: 0,
      isHoliday: true,
      holidayType: 'festival',
      holidayName: 'Declared Holiday / Day Off',
      note: 'Marked via Daily Reminder',
    });
  };

  // Admin 1-Click Quick Enter official attendance for today
  const handleAdminQuickEnter = (
    held: number,
    attended: number,
    syncStudents: boolean,
    isHoliday = false
  ) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const entry: Omit<DailyLog, 'id' | 'timestamp'> = {
      date: todayStr,
      classesHeld: isHoliday ? 0 : held,
      classesAttended: isHoliday ? 0 : attended,
      classesBunked: isHoliday ? 0 : Math.max(0, held - attended),
      isHoliday,
      holidayType: isHoliday ? 'festival' : undefined,
      note: isHoliday ? 'Official College Holiday declared by Administrator' : 'Official class attendance recorded by Administrator',
    };
    const res = saveAdminOfficialAttendance(currentUser, entry, syncStudents);
    if (res.success) {
      setAdminTodayRecord(res.record);
      handleSaveDailyEntry(entry);
      refreshCurrentUserFromStorage();
    }
  };

  // Student 1-Click Sync with official Admin attendance
  const handleStudentSyncWithAdmin = () => {
    if (!adminTodayRecord) return;
    handleSaveDailyEntry({
      date: adminTodayRecord.log.date,
      classesHeld: adminTodayRecord.log.classesHeld,
      classesAttended: adminTodayRecord.log.classesAttended,
      classesBunked: adminTodayRecord.log.classesBunked,
      isHoliday: adminTodayRecord.log.isHoliday,
      holidayType: adminTodayRecord.log.holidayType,
      holidayName: adminTodayRecord.log.holidayName,
      note: `Synced from official attendance entered by Admin (${adminTodayRecord.enteredByAdminName})`,
    });
  };

  // Delete today's official record by Admin
  const handleDeleteAdminRecord = () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (window.confirm("Remove today's official admin attendance record?")) {
      deleteAdminOfficialAttendance(currentUser, todayStr);
      setAdminTodayRecord(null);
      handleRemoveHoliday(todayStr);
      refreshCurrentUserFromStorage();
    }
  };

  // Presets loader for rapid testing
  const handleLoadDemo = (preset: 'safe' | 'edge76' | 'danger') => {
    if (preset === 'safe') {
      updateStateAndPersist({
        baselineHeld: 45,
        baselineAttended: 38,
        minimumRequirement: 75,
        dailyLogs: [
          {
            id: 'preset-safe',
            date: todayStr,
            classesHeld: 5,
            classesAttended: 4,
            classesBunked: 1,
            note: 'Regular Lecture & Lab Sessions',
            timestamp: Date.now(),
          },
        ],
      });
    } else if (preset === 'edge76') {
      updateStateAndPersist({
        baselineHeld: 46,
        baselineAttended: 35,
        minimumRequirement: 75,
        dailyLogs: [
          {
            id: 'preset-76',
            date: todayStr,
            classesHeld: 4,
            classesAttended: 3,
            classesBunked: 1,
            note: 'Edge test case: exact 76% attendance',
            timestamp: Date.now(),
          },
        ],
      });
    } else if (preset === 'danger') {
      updateStateAndPersist({
        baselineHeld: 35,
        baselineAttended: 25,
        minimumRequirement: 75,
        dailyLogs: [
          {
            id: 'preset-danger',
            date: todayStr,
            classesHeld: 5,
            classesAttended: 3,
            classesBunked: 2,
            note: 'Attendance below 75% detention threshold',
            timestamp: Date.now(),
          },
        ],
      });
    }
  };

  // Reset to initial clean state with 415 baseline held
  const handleReset = () => {
    if (window.confirm('Reset all daily attendance records and restore defaults?')) {
      updateStateAndPersist({
        baselineHeld: 415,
        baselineAttended: 320,
        minimumRequirement: 75,
        dailyLogs: [],
        countingStartDate: getComingMondayDateString(todayStr),
      });
      setSavedFeedback(null);
    }
  };

  // Save baseline
  const handleSaveBaseline = (held: number, attended: number, minReq?: number) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      baselineHeld: held,
      baselineAttended: attended,
      countingStartDate: getComingMondayDateString(todayStr),
      minimumRequirement: minReq !== undefined ? minReq : prev.minimumRequirement,
    }));
  };

  // For the Daily Attendance Entry form, we want to compute the projected values
  // against the total held EXCLUDING today's already recorded log so we don't double count if editing today!
  const previousTotalHeld = useMemo(() => {
    const otherLogs = state.dailyLogs.filter(
      (l) => l.date >= effectiveCountingStartDate && l.date !== todayStr
    );
    const otherHeld = otherLogs.reduce((acc, curr) => acc + curr.classesHeld, 0);
    return state.baselineHeld + otherHeld;
  }, [state.baselineHeld, state.dailyLogs, todayStr, effectiveCountingStartDate]);

  const previousTotalAttended = useMemo(() => {
    const otherLogs = state.dailyLogs.filter(
      (l) => l.date >= effectiveCountingStartDate && l.date !== todayStr
    );
    const otherAttended = otherLogs.reduce((acc, curr) => acc + curr.classesAttended, 0);
    return state.baselineAttended + otherAttended;
  }, [state.baselineAttended, state.dailyLogs, todayStr, effectiveCountingStartDate]);

  // If user is not authenticated, show Login & Registration Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        initialNotice={logoutNotice}
      />
    );
  }

  // If user opened the Admin Portal
  if (isAdminPortalOpen && currentUser.role === 'admin') {
    return (
      <>
        <AdminPortal
          currentUser={currentUser}
          onBackToApp={() => setIsAdminPortalOpen(false)}
          onRefreshUserState={refreshCurrentUserFromStorage}
          onLogout={handleOpenSignOutModal}
        />
        <SignOutModal
          isOpen={isSignOutModalOpen}
          currentUser={currentUser}
          onClose={() => setIsSignOutModalOpen(false)}
          onConfirmSignOut={handleConfirmSignOut}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 animate-fadeIn">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onReset={handleReset}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onLogout={handleOpenSignOutModal}
        percentage={calculationResult.percentage}
        isTodayLogged={!!todayLog}
        onScrollToReminder={scrollToReminder}
        onGoToHome={handleGoToHome}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Date with Day Status Strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Today: <strong className="text-indigo-700">{todayFormattedWithDay}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>
              User: <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsAdminPortalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
              >
                Open Admin Monitoring &rarr;
              </button>
            )}
          </div>
        </div>

        {/* DAILY ATTENDANCE REMINDER: Only shown to students (admin only monitors the website) */}
        {currentUser.role !== 'admin' && (
          <DailyAttendanceReminder
            currentUser={currentUser}
            todayStr={todayStr}
            todayLog={todayLog}
            onQuickHoliday={handleQuickHolidayToday}
            onScrollToEntryForm={scrollToEntryForm}
            safeBunksRemaining={calculationResult.safeBunks}
            onGoToHome={handleGoToHome}
          />
        )}

        {/* FEEDBACK BANNER: After entering attendance, show overall attendance and today's saved data */}
        {savedFeedback && savedFeedback.show && (
          <SavedAttendanceConfirmation
            feedback={savedFeedback}
            onDismiss={() => setSavedFeedback({ ...savedFeedback, show: false })}
            onEditAgain={() => {
              const formEl = document.getElementById('daily-attendance-entry-card');
              if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
            }}
            minimumRequirement={state.minimumRequirement}
          />
        )}

        {/* Section 3: Automatic Warning Banner */}
        <WarningBanner
          warning={calculationResult.warning}
          percentage={calculationResult.percentage}
          classesNeededToRecover={calculationResult.classesNeededToRecover}
          safeBunks={calculationResult.safeBunks}
        />

        {/* Section 4: Daily Dashboard */}
        <DashboardMetrics
          todayHeld={todayHeld}
          todayAttended={todayAttended}
          calculation={calculationResult}
          minimumRequirement={state.minimumRequirement}
          isTodayHoliday={todayLog?.isHoliday}
          todayHolidayType={todayLog?.holidayType}
          baselineHeld={state.baselineHeld}
          baselineAttended={state.baselineAttended}
        />

        {/* Feature 1: Classes Count Till Now (Prior Baseline) */}
        <PriorClassesCard
          baselineHeld={state.baselineHeld}
          baselineAttended={state.baselineAttended}
          onSaveBaseline={handleSaveBaseline}
          minimumRequirement={state.minimumRequirement}
          dailyLogsHeld={logsHeld}
          dailyLogsAttended={logsAttended}
          dailyLogsCount={state.dailyLogs.length}
          onClearDailyLogs={handleClearAllDailyLogs}
          countingStartDate={effectiveCountingStartDate}
        />

        {/* Feature 2: Weekly Schedule & Daily Attendance (Monday Onwards) */}
        <WeeklyAttendanceTracker
          dailyLogs={state.dailyLogs}
          onSaveDailyEntry={handleSaveDailyEntry}
          onRemoveHoliday={handleRemoveHoliday}
          baselineHeld={state.baselineHeld}
          baselineAttended={state.baselineAttended}
          minimumRequirement={state.minimumRequirement}
        />

        {/* Feature: How Many Bunks Can We Do After Present Attendance */}
        <PresentAttendanceBunkCard
          calculation={calculationResult}
          minimumRequirement={state.minimumRequirement}
          onSelectBunkToSimulate={handleSelectBunkToSimulate}
        />

        {/* 2-Column Responsive Grid: Detailed Entry Form & Bunk Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Section 1: Daily Attendance Entry Form */}
          <DailyAttendanceEntry
            currentTotalHeld={previousTotalHeld}
            currentTotalAttended={previousTotalAttended}
            onSaveDailyEntry={handleSaveDailyEntry}
            onRemoveHoliday={handleRemoveHoliday}
            todayLog={todayLog}
            minimumRequirement={state.minimumRequirement}
          />

          {/* Section 2: Bunk Calculator */}
          <BunkCalculator
            totalHeld={totalHeld}
            totalAttended={totalAttended}
            minimumRequirement={state.minimumRequirement}
            maxSafeBunks={calculationResult.safeBunks}
            initialPlannedBunks={simulatedBunkCount}
          />
        </div>

        {/* Section: Attendance Log History */}
        <AttendanceHistory
          logs={state.dailyLogs}
          onDeleteLog={handleDeleteLog}
          onClearAllLogs={handleClearAllDailyLogs}
          baselineHeld={state.baselineHeld}
          baselineAttended={state.baselineAttended}
          minimumRequirement={state.minimumRequirement}
        />
      </main>

      {/* Footer with Formula & Rules Reference */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Formula: Attendance % = (Total Classes Attended / Total Classes Held) × 100 • College Rule: ≥ {state.minimumRequirement}%
          </p>
          <p className="text-slate-400">
            Secure Role Access • Administrator: Yunus Subhan ({DEFAULT_ADMIN.email})
          </p>
        </div>
      </footer>

      {/* Baseline Setting Modal */}
      <InitialBaselineModal
        isOpen={isBaselineModalOpen}
        onClose={() => setIsBaselineModalOpen(false)}
        baselineHeld={state.baselineHeld}
        baselineAttended={state.baselineAttended}
        minimumRequirement={state.minimumRequirement}
        onSave={handleSaveBaseline}
      />

      {/* Sign Out Confirmation Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        currentUser={currentUser}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirmSignOut={handleConfirmSignOut}
      />
    </div>
  );
}
