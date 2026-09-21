import { AppUser, AttendanceState, DailyLog, UserRole } from '../types';
import { getTodayDateString, getComingMondayDateString } from './attendanceCalculations';

const USERS_STORAGE_KEY = 'college_attendance_users_v2';
const SESSION_STORAGE_KEY = 'college_attendance_current_user_v2';
export const ADMIN_UNIQUE_PASS_KEY = 'college_attendance_admin_unique_pass_v1';

export function hasAdminSetUniquePass(): boolean {
  try {
    const saved = localStorage.getItem(ADMIN_UNIQUE_PASS_KEY);
    return Boolean(saved && saved.trim().length >= 6);
  } catch {
    return false;
  }
}

export function isAdminEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return clean === 'yunussubhansk@gmail.com' || clean === 'admin';
}

export function getAdminUniquePassword(): string | null {
  try {
    const saved = localStorage.getItem(ADMIN_UNIQUE_PASS_KEY);
    if (saved && saved.trim().length >= 6) return saved.trim();
  } catch {
    // fallback
  }
  return null;
}

export function updateAdminPassword(newPass: string): { success: boolean; error?: string } {
  const trimmed = newPass.trim();
  if (trimmed.length < 6) {
    return { success: false, error: 'Unique admin pass must be at least 6 characters long.' };
  }
  try {
    localStorage.setItem(ADMIN_UNIQUE_PASS_KEY, trimmed);
    const users = getAllUsers();
    const updated = users.map((u) => {
      if (u.role === 'admin' || u.email.toLowerCase() === 'yunussubhansk@gmail.com') {
        return { ...u, password: trimmed };
      }
      return u;
    });
    saveAllUsers(updated);
    const session = getCurrentSessionUser();
    if (session && (session.role === 'admin' || session.email.toLowerCase() === 'yunussubhansk@gmail.com')) {
      setCurrentSessionUser({ ...session, password: trimmed });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to save unique admin pass.' };
  }
}

export const DEFAULT_ADMIN: AppUser = {
  id: 'admin-yunus',
  name: 'Yunus Subhan',
  email: 'yunussubhansk@gmail.com',
  username: 'admin',
  password: '',
  role: 'admin',
  rollNumber: 'ADM-001',
  createdAt: '2026-09-01',
  attendanceState: {
    baselineHeld: 415,
    baselineAttended: 320,
    dailyLogs: [],
    minimumRequirement: 76,
    countingStartDate: '2026-09-21',
  },
};

export const INITIAL_USERS: AppUser[] = [
  DEFAULT_ADMIN,
  {
    id: 'student-rahul',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@college.edu',
    username: 'rahul',
    password: 'student123',
    role: 'student',
    rollNumber: '22CS104',
    createdAt: '2026-09-05',
    attendanceState: {
      baselineHeld: 48,
      baselineAttended: 36,
      dailyLogs: [
        {
          id: 'log-rahul-1',
          date: '2026-09-17',
          classesHeld: 7,
          classesAttended: 5,
          classesBunked: 2,
          note: 'Attended math and computer networks',
          timestamp: Date.now() - 172800000,
        },
      ],
      minimumRequirement: 76,
    },
  },
  {
    id: 'student-ananya',
    name: 'Ananya Patel',
    email: 'ananya.p@college.edu',
    username: 'ananya',
    password: 'student123',
    role: 'student',
    rollNumber: '22CS088',
    createdAt: '2026-09-08',
    attendanceState: {
      baselineHeld: 52,
      baselineAttended: 48,
      dailyLogs: [
        {
          id: 'log-ananya-1',
          date: '2026-09-18',
          classesHeld: 7,
          classesAttended: 7,
          classesBunked: 0,
          note: 'Full attendance recorded',
          timestamp: Date.now() - 86400000,
        },
      ],
      minimumRequirement: 76,
    },
  },
];

/**
 * Gets list of all registered users from localStorage or defaults
 */
export function getAllUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw) as AppUser[];
    let hasUpdated = false;

    // Ensure users have minimumRequirement set to 76 if at previous 75 default
    for (const u of parsed) {
      if (u.attendanceState) {
        if (!u.attendanceState.minimumRequirement || u.attendanceState.minimumRequirement === 75) {
          u.attendanceState.minimumRequirement = 76;
          hasUpdated = true;
        }
      }
    }

    // Ensure Yunus Subhan admin exists and has proper baseline
    const adminIdx = parsed.findIndex((u) => u.email === 'yunussubhansk@gmail.com' || u.username === 'admin');
    const savedAdminPass = getAdminUniquePassword();
    if (adminIdx === -1) {
      const adminWithPass = { ...DEFAULT_ADMIN, password: savedAdminPass || '' };
      parsed.unshift(adminWithPass);
      hasUpdated = true;
    } else {
      // Ensure countingStartDate is present and baseline updated if at old default
      const admin = parsed[adminIdx];
      if (savedAdminPass && admin.password !== savedAdminPass) {
        admin.password = savedAdminPass;
        hasUpdated = true;
      }
      if (admin.attendanceState) {
        if (!admin.attendanceState.countingStartDate) {
          admin.attendanceState.countingStartDate = getComingMondayDateString();
          hasUpdated = true;
        }
        if (admin.attendanceState.baselineHeld === 50) {
          admin.attendanceState.baselineHeld = 415;
          admin.attendanceState.baselineAttended = 320;
          hasUpdated = true;
        }
      }
    }

    if (hasUpdated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.error('Error loading users:', err);
    return INITIAL_USERS;
  }
}

/**
 * Persists all users to localStorage
 */
export function saveAllUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

/**
 * Gets currently authenticated user from session
 */
export function getCurrentSessionUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const sessionUser = JSON.parse(raw) as AppUser;
    // Always sync with latest state in users list
    const all = getAllUsers();
    const fresh = all.find((u) => u.id === sessionUser.id);
    return fresh || sessionUser;
  } catch {
    return null;
  }
}

/**
 * Sets or clears current session
 */
export function setCurrentSessionUser(user: AppUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Error setting session:', err);
  }
}

/**
 * Authenticates user by username/email and password
 */
export function authenticateUser(
  usernameOrEmail: string,
  password?: string
): { success: boolean; user?: AppUser; error?: string; needsAdminPassSetup?: boolean } {
  const users = getAllUsers();
  const query = usernameOrEmail.trim().toLowerCase();

  const found = users.find(
    (u) => u.username.toLowerCase() === query || u.email.toLowerCase() === query
  );

  if (!found) {
    return { success: false, error: 'User not found. Check your username or email.' };
  }

  // If target user is admin, enforce unique pass
  if (found.role === 'admin' || found.email.toLowerCase() === 'yunussubhansk@gmail.com') {
    if (!hasAdminSetUniquePass()) {
      return {
        success: false,
        needsAdminPassSetup: true,
        error: 'Admin unique pass is not set. Please set your unique admin pass first.',
      };
    }
    const uniquePass = getAdminUniquePassword();
    if (!password || password !== uniquePass) {
      return {
        success: false,
        error: 'Incorrect unique admin pass. Please enter the unique pass you established.',
      };
    }
  } else {
    // Student account authentication
    if (password && found.password && found.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
  }

  // Update last login
  const updatedUser: AppUser = {
    ...found,
    lastLogin: new Date().toISOString(),
  };

  const updatedUsers = users.map((u) => (u.id === found.id ? updatedUser : u));
  saveAllUsers(updatedUsers);
  setCurrentSessionUser(updatedUser);

  return { success: true, user: updatedUser };
}

/**
 * Registers a new student account
 */
export function registerStudent(data: {
  name: string;
  email: string;
  username: string;
  password?: string;
  rollNumber?: string;
  baselineHeld: number;
  baselineAttended: number;
}): { success: boolean; user?: AppUser; error?: string } {
  const users = getAllUsers();
  const emailNorm = data.email.trim().toLowerCase();
  const userNorm = data.username.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  if (users.some((u) => u.username.toLowerCase() === userNorm)) {
    return { success: false, error: 'This username is already taken. Please choose another.' };
  }

  const newUser: AppUser = {
    id: `student-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim(),
    username: data.username.trim(),
    password: data.password || 'student123',
    role: 'student',
    rollNumber: data.rollNumber?.trim() || undefined,
    createdAt: getTodayDateString(),
    attendanceState: {
      baselineHeld: Math.max(0, data.baselineHeld),
      baselineAttended: Math.max(0, Math.min(data.baselineHeld, data.baselineAttended)),
      dailyLogs: [],
      minimumRequirement: 76,
    },
  };

  users.push(newUser);
  saveAllUsers(users);
  setCurrentSessionUser(newUser);

  return { success: true, user: newUser };
}

/**
 * Admin action: Add any user (Student or Admin)
 */
export function addUserByAdmin(
  currentUser: AppUser,
  newUserData: {
    name: string;
    email: string;
    username: string;
    password?: string;
    role: UserRole;
    rollNumber?: string;
    baselineHeld: number;
    baselineAttended: number;
    minimumRequirement?: number;
  }
): { success: boolean; user?: AppUser; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  const users = getAllUsers();
  const emailNorm = newUserData.email.trim().toLowerCase();
  const userNorm = newUserData.username.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
    return { success: false, error: 'User with this email already exists.' };
  }
  if (users.some((u) => u.username.toLowerCase() === userNorm)) {
    return { success: false, error: 'User with this username already exists.' };
  }

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    name: newUserData.name.trim(),
    email: newUserData.email.trim(),
    username: newUserData.username.trim(),
    password: newUserData.password || 'password123',
    role: newUserData.role,
    rollNumber: newUserData.rollNumber?.trim() || undefined,
    createdAt: getTodayDateString(),
    attendanceState: {
      baselineHeld: Math.max(0, newUserData.baselineHeld),
      baselineAttended: Math.max(0, Math.min(newUserData.baselineHeld, newUserData.baselineAttended)),
      dailyLogs: [],
      minimumRequirement: newUserData.minimumRequirement || 76,
    },
  };

  users.push(newUser);
  saveAllUsers(users);
  return { success: true, user: newUser };
}

/**
 * Admin action: Delete a user
 */
export function deleteUserByAdmin(
  currentUser: AppUser,
  userIdToDelete: string
): { success: boolean; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  if (currentUser.id === userIdToDelete) {
    return { success: false, error: 'You cannot delete your own active Admin account.' };
  }

  let users = getAllUsers();
  const toDelete = users.find((u) => u.id === userIdToDelete);
  if (!toDelete) {
    return { success: false, error: 'Target user not found.' };
  }

  users = users.filter((u) => u.id !== userIdToDelete);
  saveAllUsers(users);
  return { success: true };
}

/**
 * Updates a user's attendance state (used when saving logs or updating baseline)
 */
export function updateUserAttendance(userId: string, newState: AttendanceState): void {
  const users = getAllUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        attendanceState: newState,
      };
    }
    return u;
  });
  saveAllUsers(updated);

  const current = getCurrentSessionUser();
  if (current && current.id === userId) {
    setCurrentSessionUser({
      ...current,
      attendanceState: newState,
    });
  }
}

/**
 * Alias for updateUserAttendance
 */
export const updateCurrentUserAttendanceState = updateUserAttendance;

/**
 * Admin action: Direct Rewrite of any user's profile and attendance data
 */
export function rewriteUserDataByAdmin(
  currentUser: AppUser,
  targetUserId: string,
  updates: {
    name?: string;
    email?: string;
    username?: string;
    role?: UserRole;
    rollNumber?: string;
    baselineHeld?: number;
    baselineAttended?: number;
    minimumRequirement?: number;
  }
): { success: boolean; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  const users = getAllUsers();
  const targetIndex = users.findIndex((u) => u.id === targetUserId);
  if (targetIndex === -1) {
    return { success: false, error: 'User not found.' };
  }

  const target = users[targetIndex];

  const updatedState: AttendanceState = {
    ...target.attendanceState,
    baselineHeld: updates.baselineHeld !== undefined ? Math.max(0, updates.baselineHeld) : target.attendanceState.baselineHeld,
    baselineAttended: updates.baselineAttended !== undefined ? Math.max(0, updates.baselineAttended) : target.attendanceState.baselineAttended,
    minimumRequirement: updates.minimumRequirement !== undefined ? updates.minimumRequirement : target.attendanceState.minimumRequirement,
  };

  const updatedUser: AppUser = {
    ...target,
    name: updates.name !== undefined ? updates.name.trim() : target.name,
    email: updates.email !== undefined ? updates.email.trim() : target.email,
    username: updates.username !== undefined ? updates.username.trim() : target.username,
    role: updates.role !== undefined ? updates.role : target.role,
    rollNumber: updates.rollNumber !== undefined ? updates.rollNumber.trim() : target.rollNumber,
    attendanceState: updatedState,
  };

  users[targetIndex] = updatedUser;
  saveAllUsers(users);

  // Sync active session if target is current user
  const currentSession = getCurrentSessionUser();
  if (currentSession && currentSession.id === targetUserId) {
    setCurrentSessionUser(updatedUser);
  }

  return { success: true };
}

/**
 * Admin action: Rewrite an individual daily log for any user
 */
export function rewriteUserDailyLogByAdmin(
  currentUser: AppUser,
  targetUserId: string,
  logId: string,
  updatedFields: Partial<DailyLog>
): { success: boolean; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  const users = getAllUsers();
  const target = users.find((u) => u.id === targetUserId);
  if (!target) return { success: false, error: 'User not found.' };

  const logs = target.attendanceState.dailyLogs.map((log) => {
    if (log.id === logId) {
      return {
        ...log,
        ...updatedFields,
        classesBunked:
          updatedFields.classesHeld !== undefined && updatedFields.classesAttended !== undefined
            ? Math.max(0, updatedFields.classesHeld - updatedFields.classesAttended)
            : log.classesBunked,
      };
    }
    return log;
  });

  const updatedState: AttendanceState = {
    ...target.attendanceState,
    dailyLogs: logs,
  };

  updateUserAttendance(targetUserId, updatedState);
  return { success: true };
}

/**
 * Admin action: Delete a specific daily log for any user
 */
export function deleteUserDailyLogByAdmin(
  currentUser: AppUser,
  targetUserId: string,
  logId: string
): { success: boolean; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  const users = getAllUsers();
  const target = users.find((u) => u.id === targetUserId);
  if (!target) return { success: false, error: 'User not found.' };

  const logs = target.attendanceState.dailyLogs.filter((log) => log.id !== logId);
  const updatedState: AttendanceState = {
    ...target.attendanceState,
    dailyLogs: logs,
  };

  updateUserAttendance(targetUserId, updatedState);
  return { success: true };
}

/**
 * Admin action: Add a daily log for any user on any date
 */
export function addUserDailyLogByAdmin(
  currentUser: AppUser,
  targetUserId: string,
  newLog: Omit<DailyLog, 'id' | 'timestamp'>
): { success: boolean; error?: string } {
  if (currentUser.role !== 'admin') {
    return { success: false, error: 'Permission denied. Admin privileges required.' };
  }

  const users = getAllUsers();
  const target = users.find((u) => u.id === targetUserId);
  if (!target) return { success: false, error: 'User not found.' };

  const fullLog: DailyLog = {
    ...newLog,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
  };

  // Replace if same date exists, else append
  const existingIdx = target.attendanceState.dailyLogs.findIndex((l) => l.date === newLog.date);
  let updatedLogs: DailyLog[];
  if (existingIdx >= 0) {
    updatedLogs = [...target.attendanceState.dailyLogs];
    updatedLogs[existingIdx] = fullLog;
  } else {
    updatedLogs = [fullLog, ...target.attendanceState.dailyLogs];
  }

  const updatedState: AttendanceState = {
    ...target.attendanceState,
    dailyLogs: updatedLogs,
  };

  updateUserAttendance(targetUserId, updatedState);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Email Verification & Password Setup Workflow
// ---------------------------------------------------------------------------

const VERIFICATION_STORAGE_KEY = 'college_portal_email_verifications';

export interface EmailVerificationSession {
  email: string;
  code: string;
  passwordDraft?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generates and stores a 6-digit verification code sent to the given email
 */
export function sendEmailVerificationCode(
  email: string,
  passwordDraft?: string
): { code: string; expiresAt: number } {
  const normEmail = email.trim().toLowerCase();
  // Generate random 6-digit OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  const session: EmailVerificationSession = {
    email: normEmail,
    code,
    passwordDraft,
    createdAt: Date.now(),
    expiresAt,
  };

  try {
    const raw = localStorage.getItem(VERIFICATION_STORAGE_KEY);
    const list: EmailVerificationSession[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((s) => s.email !== normEmail);
    filtered.push(session);
    localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error saving verification code:', err);
  }

  return { code, expiresAt };
}

/**
 * Retrieves the currently active verification session for an email
 */
export function getActiveVerificationSession(email: string): EmailVerificationSession | null {
  try {
    const normEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem(VERIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const list: EmailVerificationSession[] = JSON.parse(raw);
    const found = list.find((s) => s.email === normEmail && s.expiresAt > Date.now());
    return found || null;
  } catch {
    return null;
  }
}

/**
 * Finds user by email address
 */
export function findUserByEmail(email: string): AppUser | null {
  const normEmail = email.trim().toLowerCase();
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === normEmail) || null;
}

/**
 * Verifies code entered from email, creates or updates the user's password,
 * and sets up the authenticated session.
 */
export function verifyCodeAndSavePassword(
  email: string,
  code: string,
  createdPassword: string,
  studentName?: string
): { success: boolean; user?: AppUser; error?: string; isNewUser?: boolean } {
  const normEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim().replace(/\s+/g, '');

  if (!trimmedCode) {
    return { success: false, error: 'Please enter the 6-digit verification code.' };
  }

  const session = getActiveVerificationSession(normEmail);
  if (!session) {
    return {
      success: false,
      error: 'Verification code has expired or was not requested. Please request a new code.',
    };
  }

  if (session.code !== trimmedCode) {
    return {
      success: false,
      error: `Invalid verification code (${trimmedCode}). Please check your email and enter the 6-digit code.`,
    };
  }

  // Code verified! Now update or register user
  const users = getAllUsers();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase() === normEmail);

  if (existingIndex >= 0) {
    // Existing user (admin or student)
    const existing = users[existingIndex];
    if (existing.role === 'admin' || normEmail === 'yunussubhansk@gmail.com') {
      try {
        localStorage.setItem(ADMIN_UNIQUE_PASS_KEY, createdPassword);
      } catch {}
    }
    const updatedUser: AppUser = {
      ...existing,
      password: createdPassword,
      lastLogin: new Date().toISOString(),
    };
    users[existingIndex] = updatedUser;
    saveAllUsers(users);
    setCurrentSessionUser(updatedUser);
    return { success: true, user: updatedUser, isNewUser: false };
  } else {
    // New student creating their account
    const derivedUsername =
      normEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ||
      `student${Math.floor(100 + Math.random() * 900)}`;

    let finalUsername = derivedUsername;
    let counter = 1;
    while (users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
      finalUsername = `${derivedUsername}${counter}`;
      counter++;
    }

    const displayName =
      studentName?.trim() ||
      normEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: AppUser = {
      id: `student-${Date.now()}`,
      name: displayName,
      email: normEmail,
      username: finalUsername,
      password: createdPassword,
      role: 'student',
      createdAt: getTodayDateString(),
      lastLogin: new Date().toISOString(),
      attendanceState: {
        baselineHeld: 415,
        baselineAttended: 320,
        dailyLogs: [],
        minimumRequirement: 76,
        countingStartDate: getComingMondayDateString(),
      },
    };

    users.push(newUser);
    saveAllUsers(users);
    setCurrentSessionUser(newUser);
    return { success: true, user: newUser, isNewUser: true };
  }
}

// -------------------------------------------------------------
// Official College Attendance Entered by Admin
// -------------------------------------------------------------
const OFFICIAL_ADMIN_ATTENDANCE_KEY = 'college_admin_official_attendance_v2';

export interface OfficialAdminAttendanceRecord {
  date: string;
  log: DailyLog;
  enteredByAdminId: string;
  enteredByAdminName: string;
  enteredAt: number;
  syncedToStudents: boolean;
}

export function getAllAdminOfficialAttendance(): Record<string, OfficialAdminAttendanceRecord> {
  try {
    const raw = localStorage.getItem(OFFICIAL_ADMIN_ATTENDANCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getAdminOfficialAttendance(date: string): OfficialAdminAttendanceRecord | null {
  const records = getAllAdminOfficialAttendance();
  return records[date] || null;
}

export function saveAdminOfficialAttendance(
  adminUser: AppUser,
  entry: Omit<DailyLog, 'id' | 'timestamp'>,
  syncAllStudents: boolean = false
): { success: boolean; record: OfficialAdminAttendanceRecord; studentsCount: number } {
  const records = getAllAdminOfficialAttendance();
  const fullLog: DailyLog = {
    ...entry,
    id: `admin-official-${entry.date}-${Date.now()}`,
    timestamp: Date.now(),
  };

  const newRecord: OfficialAdminAttendanceRecord = {
    date: entry.date,
    log: fullLog,
    enteredByAdminId: adminUser.id,
    enteredByAdminName: adminUser.name,
    enteredAt: Date.now(),
    syncedToStudents: syncAllStudents,
  };

  records[entry.date] = newRecord;
  localStorage.setItem(OFFICIAL_ADMIN_ATTENDANCE_KEY, JSON.stringify(records));

  // Also record this log in Admin's own dailyLogs
  const users = getAllUsers();
  const adminIdx = users.findIndex((u) => u.id === adminUser.id);
  if (adminIdx >= 0) {
    const adminLogs = [...users[adminIdx].attendanceState.dailyLogs];
    const existingLogIdx = adminLogs.findIndex((l) => l.date === entry.date);
    if (existingLogIdx >= 0) {
      adminLogs[existingLogIdx] = fullLog;
    } else {
      adminLogs.unshift(fullLog);
    }
    users[adminIdx] = {
      ...users[adminIdx],
      attendanceState: {
        ...users[adminIdx].attendanceState,
        dailyLogs: adminLogs,
      },
    };
  }

  let studentsCount = 0;
  // If syncAllStudents is true, apply to all student accounts
  if (syncAllStudents) {
    users.forEach((u, idx) => {
      if (u.role === 'student') {
        const studentLogs = [...u.attendanceState.dailyLogs];
        const existingIdx = studentLogs.findIndex((l) => l.date === entry.date);
        if (existingIdx >= 0) {
          studentLogs[existingIdx] = fullLog;
        } else {
          studentLogs.unshift(fullLog);
        }
        users[idx] = {
          ...u,
          attendanceState: {
            ...u.attendanceState,
            dailyLogs: studentLogs,
          },
        };
        studentsCount++;
      }
    });
  }

  saveAllUsers(users);

  // Update current session user in storage if matching
  const current = getCurrentSessionUser();
  if (current) {
    const updatedCurrent = users.find((u) => u.id === current.id);
    if (updatedCurrent) {
      setCurrentSessionUser(updatedCurrent);
    }
  }

  return { success: true, record: newRecord, studentsCount };
}

export function deleteAdminOfficialAttendance(adminUser: AppUser, date: string): boolean {
  if (adminUser.role !== 'admin') return false;
  const records = getAllAdminOfficialAttendance();
  if (records[date]) {
    delete records[date];
    localStorage.setItem(OFFICIAL_ADMIN_ATTENDANCE_KEY, JSON.stringify(records));

    // Also remove from admin dailyLogs if exists
    const users = getAllUsers();
    const adminIdx = users.findIndex((u) => u.id === adminUser.id);
    if (adminIdx >= 0) {
      const filteredLogs = users[adminIdx].attendanceState.dailyLogs.filter((l) => l.date !== date);
      users[adminIdx] = {
        ...users[adminIdx],
        attendanceState: {
          ...users[adminIdx].attendanceState,
          dailyLogs: filteredLogs,
        },
      };
      saveAllUsers(users);
      const current = getCurrentSessionUser();
      if (current && current.id === adminUser.id) {
        setCurrentSessionUser(users[adminIdx]);
      }
    }
    return true;
  }
  return false;
}

