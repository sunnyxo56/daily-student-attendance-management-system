import React from 'react';
import {
  GraduationCap,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Sparkles,
  LogOut,
  Calendar,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { AppUser } from '../types';
import { formatDateWithDay, getTodayDateString } from '../utils/attendanceCalculations';

interface NavbarProps {
  currentUser: AppUser | null;
  onOpenBaselineModal: () => void;
  onLoadDemo: (preset: 'safe' | 'edge76' | 'danger') => void;
  onReset: () => void;
  onOpenAdminPortal?: () => void;
  onLogout: () => void;
  percentage: number;
  isTodayLogged?: boolean;
  onScrollToReminder?: () => void;
  onGoToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenBaselineModal,
  onLoadDemo,
  onReset,
  onOpenAdminPortal,
  onLogout,
  percentage,
  isTodayLogged,
  onScrollToReminder,
  onGoToHome,
}) => {
  const todayFormatted = formatDateWithDay(getTodayDateString());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title (Clickable to return Home) */}
          <button
            type="button"
            onClick={() => {
              if (onGoToHome) onGoToHome();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-3 text-left cursor-pointer group bg-transparent border-0 p-0"
            title="Go to Home Dashboard"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition">
                  Daily Student Attendance
                </h1>
                {currentUser?.role === 'admin' && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 tracking-wider">
                    Admin Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                College Attendance Tracker &amp; Bunk Calculator (76% Rule)
              </p>
            </div>
          </button>

          {/* Quick Actions, Date with Day, User Profile & Admin Portal */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Daily Attendance Reminder Pill Indicator */}
            {onScrollToReminder && (
              <button
                type="button"
                id="navbar-attendance-reminder-btn"
                onClick={onScrollToReminder}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
                  !isTodayLogged
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 animate-pulse hover:animate-none'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
                title={
                  !isTodayLogged
                    ? "Daily Reminder: Today's attendance is pending! Click to record."
                    : "Today's attendance is already recorded. Click to view."
                }
              >
                {!isTodayLogged ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Reminder: Today Pending</span>
                    <span className="sm:hidden">Pending</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Today Logged</span>
                    <span className="sm:hidden">Logged</span>
                  </>
                )}
              </button>
            )}

            {/* Date with Day Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{todayFormatted}</span>
            </div>

            {/* Quick Demo Presets */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
              <span className="px-1 text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Demo:
              </span>
              <button
                type="button"
                onClick={() => onLoadDemo('safe')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-700 shadow-2xs text-[11px]"
              >
                Safe (84%)
              </button>
              <button
                type="button"
                onClick={() => onLoadDemo('edge76')}
                className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 text-amber-800 shadow-2xs text-[11px]"
              >
                76%
              </button>
              <button
                type="button"
                onClick={() => onLoadDemo('danger')}
                className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 text-rose-800 shadow-2xs text-[11px]"
              >
                Risk (70%)
              </button>
            </div>

            {/* Admin Portal Button (Only if user has Admin role) */}
            {currentUser?.role === 'admin' && (
              <button
                id="admin-portal-btn"
                type="button"
                onClick={onOpenAdminPortal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs animate-pulse hover:animate-none"
                title="Access Super Administrator Control Center"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Page</span>
              </button>
            )}

            {/* Baseline Configuration Button */}
            <button
              id="baseline-setup-btn"
              type="button"
              onClick={onOpenBaselineModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Set initial starting semester classes"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Baseline</span>
            </button>

            {/* Reset Button */}
            <button
              id="reset-attendance-btn"
              type="button"
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Reset current logs"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="sr-only">Reset</span>
            </button>

            {/* Logged-in User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                </div>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-indigo-100 text-indigo-700 shadow-2xs"
                  title={currentUser.name}
                >
                  {currentUser.name.charAt(0)}
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="Sign Out of Portal"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
