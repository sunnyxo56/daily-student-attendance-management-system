import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Palmtree,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Send,
  Calendar,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { AppUser } from '../types';
import { OfficialAdminAttendanceRecord } from '../utils/authStorage';

interface AdminAttendanceStatusBannerProps {
  currentUser: AppUser;
  todayStr: string;
  todayFormattedWithDay: string;
  adminTodayRecord: OfficialAdminAttendanceRecord | null;
  onAdminQuickEnter: (
    classesHeld: number,
    classesAttended: number,
    syncStudents: boolean,
    isHoliday?: boolean
  ) => void;
  onStudentSyncWithAdmin?: () => void;
  isTodayLoggedByCurrentUser: boolean;
  onScrollToEntryForm: () => void;
  onDeleteAdminRecord?: () => void;
  onOpenAdminPortal?: () => void;
}

export const AdminAttendanceStatusBanner: React.FC<AdminAttendanceStatusBannerProps> = ({
  currentUser,
  todayStr,
  todayFormattedWithDay,
  adminTodayRecord,
  onAdminQuickEnter,
  onStudentSyncWithAdmin,
  isTodayLoggedByCurrentUser,
  onScrollToEntryForm,
  onDeleteAdminRecord,
  onOpenAdminPortal,
}) => {
  const [syncWithStudents, setSyncWithStudents] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const isAdmin = currentUser.role === 'admin';
  const hasAdminEntered = !!adminTodayRecord;

  // Handle Admin 1-Click Entry
  const handleQuickEnter = (held: number, attended: number, isHoliday = false) => {
    setIsProcessing(true);
    setTimeout(() => {
      onAdminQuickEnter(held, attended, syncWithStudents, isHoliday);
      setIsProcessing(false);
    }, 250);
  };

  // =========================================================================
  // VIEW 1: ADMIN IS LOGGED IN
  // =========================================================================
  if (isAdmin) {
    if (!hasAdminEntered) {
      return (
        <div
          id="admin-not-entered-alert"
          className="rounded-2xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Icon & Alert Heading */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-300 animate-pulse">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-600 text-white shadow-2xs">
                    Admin Status: Not Entered
                  </span>
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    {todayFormattedWithDay}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  You have not entered today&apos;s college attendance
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  As Administrator <strong>{currentUser.name}</strong>, today&apos;s official attendance records have not been recorded or published. Students see that admin has not entered attendance until you submit it.
                </p>

                {/* Option to sync to all students */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncWithStudents}
                      onChange={(e) => setSyncWithStudents(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Automatically publish &amp; sync attendance to all registered student accounts</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons for Admin */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleQuickEnter(7, 7, false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                title="Record standard 7 classes conducted and attended"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Mark 7 Classes (All Attended)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleQuickEnter(0, 0, true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                title="Mark today as a college holiday"
              >
                <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Holiday</span>
              </button>

              <button
                type="button"
                onClick={onScrollToEntryForm}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <span>Custom...</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Admin has entered attendance for today
    return (
      <div
        id="admin-entered-verified-card"
        className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 p-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                  ✓ Official Admin Entry Recorded
                </span>
                <span className="text-xs text-slate-500">{todayFormattedWithDay}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {adminTodayRecord.log.isHoliday
                  ? 'Marked as College Holiday (0 Classes Held)'
                  : `${adminTodayRecord.log.classesHeld} Classes Held • ${adminTodayRecord.log.classesAttended} Attended (${adminTodayRecord.log.classesBunked} Bunked)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onScrollToEntryForm}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Modify Entry
            </button>
            {onDeleteAdminRecord && (
              <button
                type="button"
                onClick={onDeleteAdminRecord}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Clear today's admin entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STUDENT IS LOGGED IN
  // =========================================================================
  if (!hasAdminEntered) {
    return (
      <div
        id="student-admin-not-entered-notice"
        className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                  Admin Has Not Entered Attendance
                </span>
                <span className="text-xs text-slate-500">{todayFormattedWithDay}</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                Official College Attendance is Pending Admin Entry
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                College Administrator (Yunus Subhan) has not entered or published today&apos;s official attendance yet. You can submit your self-reported attendance below to maintain your 76% safety buffer.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={onScrollToEntryForm}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition"
            >
              <span>Log My Attendance</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Student view when Admin HAS entered official attendance
  return (
    <div
      id="student-admin-entered-notice"
      className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                ✓ Official College Attendance Published
              </span>
              <span className="text-xs text-slate-500">
                by {adminTodayRecord.enteredByAdminName}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              {adminTodayRecord.log.isHoliday
                ? 'College Declared Holiday for Today'
                : `${adminTodayRecord.log.classesHeld} Official Classes Conducted Today`}
            </p>
          </div>
        </div>

        {!isTodayLoggedByCurrentUser && onStudentSyncWithAdmin && (
          <button
            type="button"
            onClick={onStudentSyncWithAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            title="Adopt official admin attendance into your record"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>1-Click Sync with Admin</span>
          </button>
        )}
      </div>
    </div>
  );
};
