import {
  AttendanceCalculationResult,
  BunkSimulationResult,
  WarningNotification,
  WeekDaySchedule,
  HolidayType,
  BunkCalculationBreakdown,
  BunkScenario,
} from '../types';

export const HOLIDAY_CONFIG: Record<
  HolidayType,
  { label: string; badge: string; color: string; bg: string; border: string; description: string }
> = {
  festival: {
    label: 'Festival Holiday',
    badge: '🎉 Festival Holiday',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Cultural or religious festival (e.g., Diwali, Pongal, Eid)',
  },
  state: {
    label: 'State Holiday',
    badge: '🏛️ State Holiday',
    color: 'text-sky-800',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    description: 'Government or state declared public holiday',
  },
  sudden: {
    label: 'Sudden Holiday',
    badge: '⚡ Sudden Holiday',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    description: 'Heavy rain, emergency, strike, or sudden circular',
  },
  other: {
    label: 'General Holiday',
    badge: '🏖️ General Holiday',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    description: 'College day off or administrative closure',
  },
};

/**
 * Returns the scheduled classes for a given date string (YYYY-MM-DD):
 * - Monday (1) & Saturday (6): 8 classes
 * - Remaining 5 days (Sunday, Tuesday, Wednesday, Thursday, Friday): 7 classes
 */
export function getScheduledClassesForDate(dateStr: string): {
  classesHeld: number;
  dayName: string;
  shortDay: string;
  isEightClassDay: boolean;
  dayOfWeek: number;
} {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek] || 'Day';
    const shortDay = shortDays[dayOfWeek] || 'Day';

    // Monday (1) and Saturday (6) = 8 classes; remaining all 5 days = 7 classes
    const isEightClassDay = dayOfWeek === 1 || dayOfWeek === 6;
    const classesHeld = isEightClassDay ? 8 : 7;

    return {
      classesHeld,
      dayName,
      shortDay,
      isEightClassDay,
      dayOfWeek,
    };
  } catch {
    return {
      classesHeld: 7,
      dayName: 'Scheduled Day',
      shortDay: 'Day',
      isEightClassDay: false,
      dayOfWeek: 1,
    };
  }
}

/**
 * Generates the full 7-day week schedule starting from Monday onwards
 * based on a reference date (defaults to current date).
 */
export function getWeekDaysStartingMonday(referenceDateStr?: string): WeekDaySchedule[] {
  const refDate = referenceDateStr
    ? (() => {
        const [y, m, d] = referenceDateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();

  const dayOfWeek = refDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Calculate difference to reach Monday:
  // If Sunday (0), diff is -6 to get this week's Monday (or +1 for next Monday). Usually in college tracking, Mon-Sun is 1 week.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(refDate);
  mondayDate.setDate(refDate.getDate() + diffToMonday);

  const todayStr = new Date().toISOString().split('T')[0];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const schedule: WeekDaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(mondayDate);
    current.setDate(mondayDate.getDate() + i);

    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const isMondayOrSaturday = i === 0 || i === 5; // Monday (0) or Saturday (5)
    const scheduledHeld = isMondayOrSaturday ? 8 : 7;

    const monthName = current.toLocaleString('default', { month: 'short' });
    const displayDate = `${monthName} ${current.getDate()}`;

    schedule.push({
      dateStr,
      dayName: dayNames[i],
      shortDay: shortDays[i],
      scheduledHeld,
      isToday: dateStr === todayStr,
      isEightClassDay: isMondayOrSaturday,
      displayDate,
    });
  }

  return schedule;
}

/**
 * Returns the date string (YYYY-MM-DD) of the coming Monday.
 * If today is Saturday (e.g. Sep 19, 2026), coming Monday is Sep 21 (+2 days).
 * If today is Sunday (e.g. Sep 20, 2026), coming Monday is Sep 21 (+1 day).
 * If today is Monday, returns today or next Monday.
 */
export function getComingMondayDateString(refDateStr?: string): string {
  const refDate = refDateStr
    ? (() => {
        const [y, m, d] = refDateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();

  const dayOfWeek = refDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let daysToAdd = 0;
  if (dayOfWeek === 0) {
    daysToAdd = 1; // Sunday -> Monday (+1)
  } else if (dayOfWeek === 1) {
    daysToAdd = 0; // Monday
  } else {
    daysToAdd = 8 - dayOfWeek; // Tue(2)->6, Wed(3)->5, Thu(4)->4, Fri(5)->3, Sat(6)->2
  }

  const comingMonday = new Date(refDate);
  comingMonday.setDate(refDate.getDate() + daysToAdd);
  const yyyy = comingMonday.getFullYear();
  const mm = String(comingMonday.getMonth() + 1).padStart(2, '0');
  const dd = String(comingMonday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns how many days until coming Monday
 */
export function getDaysUntilComingMonday(refDateStr?: string): number {
  const refDate = refDateStr
    ? (() => {
        const [y, m, d] = refDateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();

  const dayOfWeek = refDate.getDay();
  if (dayOfWeek === 0) return 1;
  if (dayOfWeek === 1) return 0;
  return 8 - dayOfWeek;
}

/**
 * Calculates detailed bunk breakdown after calculating present attendance
 */
export function calculateBunkBreakdown(
  totalHeld: number,
  totalAttended: number,
  minRequirement: number = 76
): BunkCalculationBreakdown {
  const safeHeld = Math.max(0, totalHeld);
  const safeAttended = Math.max(0, Math.min(safeHeld, totalAttended));
  const minRatio = minRequirement / 100;
  const currentPercentage = safeHeld > 0 ? Number(((safeAttended / safeHeld) * 100).toFixed(1)) : 100;

  // Maximum safe bunks before falling below minRequirement (76%)
  let safeBunks = 0;
  if (safeHeld > 0) {
    const rawSafeBunks = Math.floor(safeAttended / minRatio - safeHeld);
    safeBunks = Math.max(0, rawSafeBunks);
  }

  // Classes needed to recover if below minimum requirement
  let classesNeededToRecover = 0;
  if (currentPercentage < minRequirement && safeHeld > 0) {
    const rawNeeded = Math.ceil((minRatio * safeHeld - safeAttended) / (1 - minRatio));
    classesNeededToRecover = Math.max(0, rawNeeded);
  }

  // Days equivalent: Assuming college schedule averages ~7.5 classes/day (8 on Mon/Sat, 7 other days)
  const avgClassesPerDay = 7.5;
  const safeDaysApprox = Math.floor(safeBunks / avgClassesPerDay);
  const safeDaysRemainderClasses = Math.round(safeBunks % avgClassesPerDay);

  const projectedHeldAfterMax = safeHeld + safeBunks;
  const projectedPercentageAfterMaxBunks =
    projectedHeldAfterMax > 0
      ? Number(((safeAttended / projectedHeldAfterMax) * 100).toFixed(1))
      : 100;

  const projectedHeldAfterOneMore = safeHeld + safeBunks + 1;
  const percentageAfterOneMoreBunk =
    projectedHeldAfterOneMore > 0
      ? Number(((safeAttended / projectedHeldAfterOneMore) * 100).toFixed(1))
      : 0;

  const isBelow75 = currentPercentage < minRequirement;
  const isExact76 = Math.round(currentPercentage) === minRequirement;

  const formulaExplanation =
    safeHeld > 0
      ? `Math.floor((${safeAttended} attended ÷ ${minRatio}) - ${safeHeld} held) = ${safeBunks} classes`
      : 'No classes held yet';

  // Step-by-step projection scenarios for next bunks
  const maxStep = Math.min(Math.max(6, safeBunks + 2), 24);
  const scenarios: BunkScenario[] = [];
  for (let b = 1; b <= maxStep; b++) {
    const pHe = safeHeld + b;
    const pPct = pHe > 0 ? Number(((safeAttended / pHe) * 100).toFixed(1)) : 100;
    const isDan = pPct < minRequirement;
    const isCaut = Math.round(pPct) === minRequirement;
    scenarios.push({
      bunkCount: b,
      projectedHeld: pHe,
      projectedPercentage: pPct,
      status: isDan ? 'danger' : isCaut ? 'caution-76' : 'safe',
      isMaxLimit: b === safeBunks,
    });
  }

  return {
    safeBunks,
    safeDaysApprox,
    safeDaysRemainderClasses,
    projectedPercentageAfterMaxBunks,
    percentageAfterOneMoreBunk,
    classesNeededToRecover,
    formulaExplanation,
    isBelow75,
    isExact76,
    scenarios,
  };
}

/**
 * Calculates current attendance statistics
 */
export function calculateAttendance(
  totalHeld: number,
  totalAttended: number,
  minRequirement: number = 76
): AttendanceCalculationResult {
  const safeHeld = Math.max(0, totalHeld);
  const safeAttended = Math.max(0, Math.min(safeHeld, totalAttended));
  const totalBunked = safeHeld - safeAttended;

  const percentage = safeHeld > 0 ? (safeAttended / safeHeld) * 100 : 100;
  const roundedPercentage = Number(percentage.toFixed(1));

  const minRatio = minRequirement / 100;

  // Maximum safe bunks while maintaining >= minRequirement:
  let safeBunks = 0;
  if (safeHeld > 0) {
    const rawSafeBunks = Math.floor(safeAttended / minRatio - safeHeld);
    safeBunks = Math.max(0, rawSafeBunks);
  }

  // Classes needed to recover to minRequirement if below:
  let classesNeededToRecover = 0;
  if (roundedPercentage < minRequirement && safeHeld > 0) {
    const rawNeeded = Math.ceil(
      (minRatio * safeHeld - safeAttended) / (1 - minRatio)
    );
    classesNeededToRecover = Math.max(0, rawNeeded);
  }

  // Warning logic
  const warning = getAttendanceWarning(roundedPercentage, minRequirement);
  const breakdown = calculateBunkBreakdown(safeHeld, safeAttended, minRequirement);

  return {
    totalHeld: safeHeld,
    totalAttended: safeAttended,
    totalBunked,
    percentage: roundedPercentage,
    safeBunks,
    classesNeededToRecover,
    warning,
    breakdown,
  };
}

/**
 * Determines the warning message based on current attendance percentage
 */
export function getAttendanceWarning(
  percentage: number,
  minRequirement: number = 76
): WarningNotification {
  const isBelowThreshold = percentage < minRequirement;
  const isExactBoundary = Math.round(percentage) === minRequirement;

  if (isBelowThreshold) {
    return {
      type: 'danger',
      title: `Detention Warning: Below ${minRequirement}% Requirement`,
      message:
        `⚠️ Warning! Your attendance is currently below ${minRequirement}%. You may be detained according to college rules.`,
      isExact76: false,
      isBelow75: true,
    };
  }

  if (isExactBoundary) {
    return {
      type: 'caution',
      title: `Caution: Attendance at ${minRequirement}%`,
      message:
        `Your current attendance is ${minRequirement}%. Any missed class will push you below the required ${minRequirement}%.`,
      isExact76: true,
      isBelow75: false,
    };
  }

  if (percentage <= minRequirement + 1.5) {
    return {
      type: 'caution',
      title: 'Borderline Safe Zone',
      message: `Your current attendance is ${percentage}%. You have very little buffer before dropping below the required ${minRequirement}%.`,
      isExact76: false,
      isBelow75: false,
    };
  }

  return {
    type: 'safe',
    title: 'Good Standing',
    message: `Your attendance of ${percentage}% comfortably satisfies college regulations (minimum ${minRequirement}%).`,
    isExact76: false,
    isBelow75: false,
  };
}

/**
 * Simulates the effect of planned bunks on attendance
 */
export function simulateBunk(
  currentHeld: number,
  currentAttended: number,
  plannedBunks: number,
  minRequirement: number = 76
): BunkSimulationResult {
  const safeCurrentHeld = Math.max(0, currentHeld);
  const safeCurrentAttended = Math.max(0, currentAttended);
  const bunks = Math.max(0, plannedBunks);

  const projectedHeld = safeCurrentHeld + bunks;
  const projectedAttended = safeCurrentAttended;

  const currentPercent = safeCurrentHeld > 0 ? (safeCurrentAttended / safeCurrentHeld) * 100 : 100;
  const projectedPercentage = projectedHeld > 0 ? (projectedAttended / projectedHeld) * 100 : 100;
  const roundedProjected = Number(projectedPercentage.toFixed(1));
  const roundedCurrent = Number(currentPercent.toFixed(1));

  const percentageDrop = Number((roundedCurrent - roundedProjected).toFixed(1));
  const willFallBelowThreshold = roundedProjected < minRequirement;
  const isSafe = !willFallBelowThreshold;

  let warningMessage = '';
  if (bunks === 0) {
    warningMessage = 'Enter or adjust planned bunks to project your attendance.';
  } else if (willFallBelowThreshold) {
    warningMessage =
      `⚠️ Warning! Your attendance will fall below ${minRequirement}% if you bunk these classes. You may be detained according to college rules.`;
  } else if (Math.round(roundedProjected) === minRequirement) {
    warningMessage =
      `Your attendance will be exactly ${minRequirement}% after these bunks. Check before bunking to avoid falling below ${minRequirement}%.`;
  } else {
    warningMessage = `Safe! Your projected attendance of ${roundedProjected}% remains above the required ${minRequirement}%.`;
  }

  return {
    plannedBunks: bunks,
    projectedHeld,
    projectedAttended,
    projectedPercentage: roundedProjected,
    percentageDrop,
    willFallBelowThreshold,
    isSafe,
    warningMessage,
  };
}

/**
 * Formats a date string (YYYY-MM-DD) into standard Date with Day display:
 * e.g., "Saturday, 19 Sep 2026"
 */
export function formatDateWithDay(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[dateObj.getDay()] || '';
    const monthName = months[dateObj.getMonth()] || '';
    const dayNum = String(d).padStart(2, '0');
    return `${dayName}, ${dayNum} ${monthName} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats date into full expanded form with day:
 * e.g., "Saturday, September 19, 2026"
 */
export function formatDateWithFullDay(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fullMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayName = days[dateObj.getDay()] || '';
    const monthName = fullMonths[dateObj.getMonth()] || '';
    return `${dayName}, ${monthName} ${d}, ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
