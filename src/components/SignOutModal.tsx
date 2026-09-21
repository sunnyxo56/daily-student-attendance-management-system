import React, { useState } from 'react';
import { LogOut, ShieldCheck, User, CheckCircle2, Loader2 } from 'lucide-react';
import { AppUser } from '../types';

interface SignOutModalProps {
  isOpen: boolean;
  currentUser: AppUser | null;
  onClose: () => void;
  onConfirmSignOut: () => void;
}

export const SignOutModal: React.FC<SignOutModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onConfirmSignOut,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSignOutClick = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onConfirmSignOut();
      setIsProcessing(false);
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
    >
      {/* Modal Dialog Card */}
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all duration-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
            <LogOut className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h3 id="signout-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
              Sign Out Confirmation
            </h3>
            <p className="text-xs text-slate-500">College Attendance Management System</p>
          </div>
        </div>

        {/* User identification badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 ${
              currentUser.role === 'admin' ? 'bg-purple-600' : 'bg-indigo-600'
            }`}
          >
            {currentUser.role === 'admin' ? 'A' : currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</span>
              <span
                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                  currentUser.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {currentUser.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          Are you sure you want to sign out? Your attendance records, safe bunk calculations, and
          76% minimum requirement settings will remain securely saved.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
          >
            Stay Signed In
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSignOutClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:bg-rose-400"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
