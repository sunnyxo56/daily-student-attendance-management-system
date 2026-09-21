export type HolidayType = 'festival' | 'state' | 'sudden' | 'other';

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  classesHeld: number;
  classesAttended: number;
  classesBunked: number;
  note?: string;
  timestamp: number;
  isHoliday?: boolean;
  holidayType?: HolidayType;
  holidayName?: string;
}

export interface AttendanceState {
  baselineHeld: number;
  baselineAttended: number;
  dailyLogs: DailyLog[];
  minimumRequirement: number; // default 76
  countingStartDate?: string; // YYYY-MM-DD - daily classes start counting from this date (Coming Monday)
}

export type WarningType = 'danger' | 'caution' | 'safe';

export interface WarningNotification {
  type: WarningType;
  title: string;
  message: string;
  isExact76: boolean;
  isBelow75: boolean;
}

export interface BunkScenario {
  bunkCount: number;
  projectedHeld: number;
  projectedPercentage: number;
  status: 'safe' | 'caution-76' | 'danger';
  isMaxLimit: boolean;
}

export interface BunkCalculationBreakdown {
  safeBunks: number;
  safeDaysApprox: number;
  safeDaysRemainderClasses: number;
  projectedPercentageAfterMaxBunks: number;
  percentageAfterOneMoreBunk: number;
  classesNeededToRecover: number;
  formulaExplanation: string;
  isBelow75: boolean;
  isExact76: boolean;
  scenarios: BunkScenario[];
}

export interface AttendanceCalculationResult {
  totalHeld: number;
  totalAttended: number;
  totalBunked: number;
  percentage: number;
  safeBunks: number;
  classesNeededToRecover: number;
  warning: WarningNotification;
  breakdown: BunkCalculationBreakdown;
}

export interface WeekDaySchedule {
  dateStr: string;
  dayName: string;
  shortDay: string;
  scheduledHeld: number;
  isToday: boolean;
  isEightClassDay: boolean;
  displayDate: string;
}

export interface BunkSimulationResult {
  plannedBunks: number;
  projectedHeld: number;
  projectedAttended: number;
  projectedPercentage: number;
  percentageDrop: number;
  willFallBelowThreshold: boolean;
  isSafe: boolean;
  warningMessage: string;
}

export type UserRole = 'admin' | 'student';

export interface DailyReminderPreferences {
  enabled: boolean;
  reminderTime: string; // "HH:MM", e.g. "16:00"
  freeTimeSlot?: string; // 'after_college' | 'evening_freetime' | 'post_dinner' | 'night_free' | 'custom'
  freeTimeLabel?: string; // e.g. "After College (3:30 PM)"
  browserNotifications: boolean;
  soundAlert: boolean;
  lastNotifiedDate?: string; // YYYY-MM-DD
  snoozedUntil?: number; // timestamp ms
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  rollNumber?: string;
  attendanceState: AttendanceState;
  reminderPreferences?: DailyReminderPreferences;
  createdAt: string;
  lastLogin?: string;
}

export interface SavedAttendanceFeedback {
  show: boolean;
  savedDate: string; // YYYY-MM-DD
  savedHeld: number;
  savedAttended: number;
  savedBunked: number;
  isHoliday?: boolean;
  holidayType?: HolidayType;
  holidayName?: string;
  note?: string;
  previousTotalHeld: number;
  previousTotalAttended: number;
  previousPercentage: number;
  newTotalHeld: number;
  newTotalAttended: number;
  newPercentage: number;
  newSafeBunks: number;
}
