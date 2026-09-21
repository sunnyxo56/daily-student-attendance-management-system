import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { WarningNotification } from '../types';

interface WarningBannerProps {
  warning: WarningNotification;
  percentage: number;
  classesNeededToRecover: number;
  safeBunks: number;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  warning,
  percentage,
  classesNeededToRecover,
  safeBunks,
}) => {
  if (warning.isBelow75) {
    return (
      <div
        id="detention-warning-banner"
        className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 sm:p-5 shadow-xs transition-all animate-pulse-subtle"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-200 text-rose-900">
                Detention Alert
              </span>
              <span className="text-xs font-medium text-rose-700">
                Below 75% Requirement
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-rose-950 leading-snug">
              {warning.message}
            </p>
            {classesNeededToRecover > 0 && (
              <p className="mt-2 text-xs sm:text-sm text-rose-800 font-medium bg-rose-100/80 p-2.5 rounded-lg border border-rose-200/60 inline-block">
                Action Required: You must attend the next{' '}
                <span className="font-bold underline text-rose-950">
                  {classesNeededToRecover} consecutive {classesNeededToRecover === 1 ? 'class' : 'classes'}
                </span>{' '}
                without bunking to bring your attendance back to 75.0%.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (warning.isExact76) {
    return (
      <div
        id="detention-warning-banner"
        className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-200 text-amber-900">
                Critical Threshold (76%)
              </span>
              <span className="text-xs font-medium text-amber-700">
                1% Buffer Remaining
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-amber-950 leading-snug">
              {warning.message}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-amber-800">
              Safe bunks remaining:{' '}
              <span className="font-bold text-amber-950">{safeBunks}</span>. Any further bunks may push you into the detention zone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="detention-warning-banner"
      className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 sm:p-5 shadow-xs transition-all"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-200 text-emerald-900">
              Safe Zone
            </span>
            <span className="text-xs font-medium text-emerald-700">
              {percentage}% Attendance
            </span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-emerald-950 leading-snug">
            {warning.message}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-emerald-800">
            You can safely bunk up to{' '}
            <span className="font-bold text-emerald-950">{safeBunks}</span> more {safeBunks === 1 ? 'class' : 'classes'} and still maintain 75% attendance.
          </p>
        </div>
      </div>
    </div>
  );
};
