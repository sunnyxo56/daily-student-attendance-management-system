import { DailyReminderPreferences, DailyLog } from '../types';
import { getTodayDateString } from './attendanceCalculations';

export interface StudentFreeTimePreset {
  id: string;
  label: string;
  time: string; // "HH:MM"
  shortTitle: string;
  period: string;
  description: string;
}

export const STUDENT_FREE_TIME_PRESETS: StudentFreeTimePreset[] = [
  {
    id: 'after_college',
    label: 'After College (3:30 PM)',
    shortTitle: '3:30 PM',
    time: '15:30',
    period: 'College / Labs End',
    description: 'When lectures wrap up, mark your attendance before leaving campus.',
  },
  {
    id: 'evening_freetime',
    label: 'Evening Free Time (5:00 PM)',
    shortTitle: '5:00 PM',
    time: '17:00',
    period: 'Hostel / Home Arrival',
    description: 'When settled back at hostel or home during evening free time.',
  },
  {
    id: 'post_dinner',
    label: 'Dinner & Leisure (7:30 PM)',
    shortTitle: '7:30 PM',
    time: '19:30',
    period: 'Dinner & Relaxation',
    description: 'Review your classes and safe bunks during dinner relaxation hour.',
  },
  {
    id: 'night_free',
    label: 'Night Free Time (9:30 PM)',
    shortTitle: '9:30 PM',
    time: '21:30',
    period: 'Before Sleep / Night Wind-Down',
    description: 'Final check before winding down for the night.',
  },
];

export const DEFAULT_REMINDER_PREFERENCES: DailyReminderPreferences = {
  enabled: true,
  reminderTime: '17:00', // 5:00 PM (Evening free time)
  freeTimeSlot: 'evening_freetime',
  freeTimeLabel: 'Evening Free Time (5:00 PM)',
  browserNotifications: false,
  soundAlert: true,
};

const STORAGE_PREFIX = 'attendance_reminder_prefs_';

/**
 * Get user reminder preferences with fallback defaults
 */
export function getReminderPreferences(userId: string): DailyReminderPreferences {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_REMINDER_PREFERENCES,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load reminder preferences', e);
  }
  return { ...DEFAULT_REMINDER_PREFERENCES };
}

/**
 * Save user reminder preferences
 */
export function saveReminderPreferences(
  userId: string,
  prefs: DailyReminderPreferences
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save reminder preferences', e);
  }
}

/**
 * Snooze the reminder for a given number of minutes
 */
export function snoozeReminder(userId: string, minutes: number = 60): void {
  const prefs = getReminderPreferences(userId);
  prefs.snoozedUntil = Date.now() + minutes * 60 * 1000;
  saveReminderPreferences(userId, prefs);
}

/**
 * Check if reminder is currently snoozed
 */
export function isReminderSnoozed(prefs: DailyReminderPreferences): boolean {
  if (!prefs.snoozedUntil) return false;
  return Date.now() < prefs.snoozedUntil;
}

/**
 * Mark that today's reminder has already fired
 */
export function markTodayNotified(userId: string): void {
  const prefs = getReminderPreferences(userId);
  prefs.lastNotifiedDate = getTodayDateString();
  saveReminderPreferences(userId, prefs);
}

/**
 * Check whether a browser notification should be triggered right now
 */
export function shouldTriggerDailyAlert(
  userId: string,
  prefs: DailyReminderPreferences,
  isTodayLogged: boolean
): boolean {
  if (!prefs.enabled) return false;
  if (isTodayLogged) return false;
  if (isReminderSnoozed(prefs)) return false;

  const todayStr = getTodayDateString();
  if (prefs.lastNotifiedDate === todayStr) {
    return false; // Already notified once today
  }

  // Check if current time has reached or passed reminderTime (HH:MM)
  const now = new Date();
  const [targetHour, targetMin] = (prefs.reminderTime || '16:00').split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMin;

  return currentMinutes >= targetMinutes;
}

/**
 * Check if browser supports Web Notifications
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission from the student
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission', e);
    return 'denied';
  }
}

/**
 * Send a native browser notification to the student
 */
export function triggerBrowserNotification(
  title: string,
  options?: NotificationOptions,
  onClick?: () => void
): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'daily-attendance-reminder',
      requireInteraction: true,
      ...options,
    });

    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    } else {
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
    return true;
  } catch (e) {
    console.error('Error showing notification', e);
    return false;
  }
}

/**
 * Play a gentle, pleasant chime sound using the Web Audio API
 */
export function playChimeSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteTime = startTime + idx * 0.12;
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.15, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // AudioContext blocked by browser policy until user gesture; ignore silently
  }
}

/**
 * Helper to check if today's attendance has been logged
 */
export function isDateLogged(logs: DailyLog[], dateStr: string): boolean {
  return logs.some((l) => l.date === dateStr);
}

/**
 * Format 24-hr time "16:00" to friendly "4:00 PM"
 */
export function formatTime12Hour(time24: string): string {
  try {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = m < 10 ? `0${m}` : `${m}`;
    return `${hour12}:${minStr} ${period}`;
  } catch {
    return time24;
  }
}
