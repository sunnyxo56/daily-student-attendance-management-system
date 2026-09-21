import React, { useState } from 'react';
import { X, Sliders, Check, Info } from 'lucide-react';

interface InitialBaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselineHeld: number;
  baselineAttended: number;
  minimumRequirement: number;
  onSave: (held: number, attended: number, minReq: number) => void;
}

export const InitialBaselineModal: React.FC<InitialBaselineModalProps> = ({
  isOpen,
  onClose,
  baselineHeld,
  baselineAttended,
  minimumRequirement,
  onSave,
}) => {
  const [held, setHeld] = useState<number>(baselineHeld);
  const [attended, setAttended] = useState<number>(baselineAttended);
  const [minReq, setMinReq] = useState<number>(minimumRequirement);

  if (!isOpen) return null;

  const handleHeldChange = (val: number) => {
    const newHeld = Math.max(0, val);
    setHeld(newHeld);
    if (attended > newHeld) {
      setAttended(newHeld);
    }
  };

  const handleAttendedChange = (val: number) => {
    setAttended(Math.max(0, Math.min(held, val)));
  };

  const currentPct = held > 0 ? ((attended / held) * 100).toFixed(1) : '100.0';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(held, attended, minReq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Semester Starting Baseline</h3>
              <p className="text-xs text-slate-500">Configure prior classes before daily logs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              If you are starting midway through the semester, enter the classes already conducted by your college so far.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Previous Total Classes Held
            </label>
            <input
              type="number"
              min="0"
              value={held}
              onChange={(e) => handleHeldChange(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Previous Total Classes Attended
            </label>
            <input
              type="number"
              min="0"
              max={held}
              value={attended}
              onChange={(e) => handleAttendedChange(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Minimum Attendance Requirement (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={minReq}
              onChange={(e) => setMinReq(parseInt(e.target.value) || 76)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Default is standard 76% college rule</span>
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Starting Baseline Attendance:</span>
            <span className="text-sm font-extrabold text-indigo-700">{currentPct}%</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Check className="w-4 h-4" />
              Save Baseline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
