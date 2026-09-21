import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Calendar,
  Search,
  BookOpen,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  FileText,
  Bell,
  Send,
  LogOut,
  Check,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppUser, DailyLog, HolidayType, UserRole } from '../types';
import {
  getAllUsers,
  addUserByAdmin,
  deleteUserByAdmin,
  rewriteUserDataByAdmin,
  rewriteUserDailyLogByAdmin,
  deleteUserDailyLogByAdmin,
  addUserDailyLogByAdmin,
  getAdminOfficialAttendance,
  saveAdminOfficialAttendance,
  deleteAdminOfficialAttendance,
  OfficialAdminAttendanceRecord,
  getAdminUniquePassword,
  updateAdminPassword,
} from '../utils/authStorage';
import {
  calculateAttendance,
  formatDateWithDay,
  formatDateWithFullDay,
  getTodayDateString,
  getScheduledClassesForDate,
  HOLIDAY_CONFIG,
} from '../utils/attendanceCalculations';

interface AdminPortalProps {
  currentUser: AppUser;
  onBackToApp: () => void;
  onRefreshUserState: () => void;
  onLogout?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  onBackToApp,
  onRefreshUserState,
  onLogout,
}) => {
  const [users, setUsers] = useState<AppUser[]>(() => getAllUsers());
  const [activeTab, setActiveTab] = useState<'directory' | 'addUser' | 'rewrite' | 'security'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');

  // Admin Unique Security Pass State
  const [adminSecurityNewPass, setAdminSecurityNewPass] = useState('');
  const [adminSecurityConfirmPass, setAdminSecurityConfirmPass] = useState('');
  const [showAdminSecurityPass, setShowAdminSecurityPass] = useState(false);
  const [adminSecurityError, setAdminSecurityError] = useState('');
  const [adminSecuritySuccess, setAdminSecuritySuccess] = useState('');

  const [adminTodayRecord, setAdminTodayRecord] = useState<OfficialAdminAttendanceRecord | null>(
    () => getAdminOfficialAttendance(getTodayDateString())
  );

  // Quick enter today's official college attendance by admin
  const handleAdminQuickPublishToday = (held: number, attended: number, syncStudents: boolean, isHoliday = false) => {
    const todayStr = getTodayDateString();
    const res = saveAdminOfficialAttendance(
      currentUser,
      {
        date: todayStr,
        classesHeld: isHoliday ? 0 : held,
        classesAttended: isHoliday ? 0 : attended,
        classesBunked: isHoliday ? 0 : Math.max(0, held - attended),
        isHoliday,
        holidayType: isHoliday ? 'festival' : undefined,
        note: isHoliday ? 'Official College Holiday declared by Administrator' : 'Official class attendance published by Administrator',
      },
      syncStudents
    );

    if (res.success) {
      setAdminTodayRecord(res.record);
      showToast(
        isHoliday
          ? `✓ College Holiday declared for today & synced to ${res.studentsCount} students!`
          : `✓ Official attendance (${held} held, ${attended} attended) recorded & synced to ${res.studentsCount} students!`
      );
      refreshLocalUsers();
    }
  };

  const handleDeleteAdminTodayPublish = () => {
    const todayStr = getTodayDateString();
    if (window.confirm("Remove today's official admin attendance record?")) {
      deleteAdminOfficialAttendance(currentUser, todayStr);
      setAdminTodayRecord(null);
      showToast("Today's official admin attendance record deleted.");
      refreshLocalUsers();
    }
  };

  // Rewrite / Editor State
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [editBaselineHeld, setEditBaselineHeld] = useState<number>(0);
  const [editBaselineAttended, setEditBaselineAttended] = useState<number>(0);
  const [editMinReq, setEditMinReq] = useState<number>(75);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editUsername, setEditUsername] = useState<string>('');
  const [editRollNumber, setEditRollNumber] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('student');

  // Edit Log Modal
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [logEditHeld, setLogEditHeld] = useState<number>(7);
  const [logEditAttended, setLogEditAttended] = useState<number>(7);
  const [logEditIsHoliday, setLogEditIsHoliday] = useState<boolean>(false);
  const [logEditHolidayType, setLogEditHolidayType] = useState<HolidayType>('other');
  const [logEditNote, setLogEditNote] = useState<string>('');

  // Add Log Modal
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [newLogDate, setNewLogDate] = useState(getTodayDateString());
  const [newLogHeld, setNewLogHeld] = useState(7);
  const [newLogAttended, setNewLogAttended] = useState(7);
  const [newLogIsHoliday, setNewLogIsHoliday] = useState(false);
  const [newLogHolidayType, setNewLogHolidayType] = useState<HolidayType>('festival');
  const [newLogNote, setNewLogNote] = useState('');

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('student123');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [newUserRollNumber, setNewUserRollNumber] = useState('');
  const [newUserBaselineHeld, setNewUserBaselineHeld] = useState(45);
  const [newUserBaselineAttended, setNewUserBaselineAttended] = useState(38);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshLocalUsers = () => {
    const updated = getAllUsers();
    setUsers(updated);
    onRefreshUserState();
  };

  // Sync selected user details into rewrite form whenever selectedUserId changes
  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  React.useEffect(() => {
    if (selectedUser) {
      setEditBaselineHeld(selectedUser.attendanceState.baselineHeld);
      setEditBaselineAttended(selectedUser.attendanceState.baselineAttended);
      setEditMinReq(selectedUser.attendanceState.minimumRequirement || 75);
      setEditName(selectedUser.name);
      setEditEmail(selectedUser.email);
      setEditUsername(selectedUser.username);
      setEditRollNumber(selectedUser.rollNumber || '');
      setEditRole(selectedUser.role);
    }
  }, [selectedUserId, users]);

  // Overall system metrics calculation
  const totalUsersCount = users.length;
  const studentsCount = users.filter((u) => u.role === 'student').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;

  const usersCalculations = users.map((u) => {
    const logsHeld = u.attendanceState.dailyLogs.reduce((acc, curr) => acc + curr.classesHeld, 0);
    const logsAttended = u.attendanceState.dailyLogs.reduce((acc, curr) => acc + curr.classesAttended, 0);
    const totalHeld = u.attendanceState.baselineHeld + logsHeld;
    const totalAttended = u.attendanceState.baselineAttended + logsAttended;
    return {
      user: u,
      calc: calculateAttendance(
        totalHeld,
        totalAttended,
        u.attendanceState.minimumRequirement
      ),
    };
  });

  const atRiskCount = usersCalculations.filter((item) => item.calc.percentage < 75).length;
  const avgAttendance =
    usersCalculations.length > 0
      ? (
          usersCalculations.reduce((acc, curr) => acc + curr.calc.percentage, 0) /
          usersCalculations.length
        ).toFixed(1)
      : '0.0';

  const todayDateKey = getTodayDateString();
  const studentsLoggedTodayCount = users
    .filter((u) => u.role === 'student')
    .filter((u) => u.attendanceState.dailyLogs.some((l) => l.date === todayDateKey)).length;
  const studentsPendingTodayCount = Math.max(0, studentsCount - studentsLoggedTodayCount);

  // Handle Add User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserUsername.trim()) {
      showToast('Name, Email, and Username are required.', 'error');
      return;
    }

    const res = addUserByAdmin(currentUser, {
      name: newUserName,
      email: newUserEmail,
      username: newUserUsername,
      password: newUserPassword,
      role: newUserRole,
      rollNumber: newUserRollNumber,
      baselineHeld: Number(newUserBaselineHeld) || 0,
      baselineAttended: Number(newUserBaselineAttended) || 0,
      minimumRequirement: 75,
    });

    if (res.success && res.user) {
      showToast(`User ${res.user.name} created successfully!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserUsername('');
      setNewUserRollNumber('');
      refreshLocalUsers();
      setActiveTab('directory');
    } else {
      showToast(res.error || 'Failed to create user.', 'error');
    }
  };

  // Handle Delete User
  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      showToast('You cannot delete your own active Admin account.', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user "${userName}" and all their attendance history?`)) {
      const res = deleteUserByAdmin(currentUser, userId);
      if (res.success) {
        showToast(`User "${userName}" deleted.`);
        refreshLocalUsers();
        if (selectedUserId === userId) {
          setSelectedUserId(currentUser.id);
        }
      } else {
        showToast(res.error || 'Failed to delete user.', 'error');
      }
    }
  };

  // Handle Save Rewrite Profile & Baseline
  const handleSaveProfileAndBaseline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = rewriteUserDataByAdmin(currentUser, selectedUser.id, {
      name: editName,
      email: editEmail,
      username: editUsername,
      role: editRole,
      rollNumber: editRollNumber,
      baselineHeld: Number(editBaselineHeld),
      baselineAttended: Number(editBaselineAttended),
      minimumRequirement: Number(editMinReq),
    });

    if (res.success) {
      showToast(`Profile & baseline for "${editName}" rewritten successfully!`);
      refreshLocalUsers();
    } else {
      showToast(res.error || 'Failed to update user data.', 'error');
    }
  };

  // Open Edit Log Modal
  const handleStartEditLog = (log: DailyLog) => {
    setEditingLog(log);
    setLogEditHeld(log.classesHeld);
    setLogEditAttended(log.classesAttended);
    setLogEditIsHoliday(!!log.isHoliday);
    setLogEditHolidayType(log.holidayType || 'other');
    setLogEditNote(log.note || '');
  };

  // Submit Save Rewritten Log
  const handleSaveRewrittenLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editingLog) return;

    const res = rewriteUserDailyLogByAdmin(currentUser, selectedUser.id, editingLog.id, {
      classesHeld: logEditIsHoliday ? 0 : Number(logEditHeld),
      classesAttended: logEditIsHoliday ? 0 : Number(logEditAttended),
      isHoliday: logEditIsHoliday,
      holidayType: logEditIsHoliday ? logEditHolidayType : undefined,
      note: logEditNote,
    });

    if (res.success) {
      showToast(`Log for ${formatDateWithDay(editingLog.date)} rewritten successfully!`);
      setEditingLog(null);
      refreshLocalUsers();
    } else {
      showToast(res.error || 'Failed to update log.', 'error');
    }
  };

  // Delete Individual Log
  const handleDeleteLog = (log: DailyLog) => {
    if (!selectedUser) return;
    if (window.confirm(`Delete attendance log for ${formatDateWithDay(log.date)}?`)) {
      const res = deleteUserDailyLogByAdmin(currentUser, selectedUser.id, log.id);
      if (res.success) {
        showToast(`Attendance entry for ${formatDateWithDay(log.date)} deleted.`);
        refreshLocalUsers();
      } else {
        showToast(res.error || 'Failed to delete log.', 'error');
      }
    }
  };

  // Add Log on behalf of user
  const handleAddLogOnBehalf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = addUserDailyLogByAdmin(currentUser, selectedUser.id, {
      date: newLogDate,
      classesHeld: newLogIsHoliday ? 0 : Number(newLogHeld),
      classesAttended: newLogIsHoliday ? 0 : Number(newLogAttended),
      classesBunked: newLogIsHoliday ? 0 : Math.max(0, Number(newLogHeld) - Number(newLogAttended)),
      isHoliday: newLogIsHoliday,
      holidayType: newLogIsHoliday ? newLogHolidayType : undefined,
      note: newLogNote,
    });

    if (res.success) {
      showToast(`Attendance for ${formatDateWithDay(newLogDate)} added on behalf of ${selectedUser.name}!`);
      setIsAddLogOpen(false);
      setNewLogNote('');
      refreshLocalUsers();
    } else {
      showToast(res.error || 'Failed to add log.', 'error');
    }
  };

  // Filtered Users List for Directory
  const filteredUsers = usersCalculations.filter(({ user }) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      (user.rollNumber && user.rollNumber.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  const todayFullDate = formatDateWithFullDay(getTodayDateString());

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onBackToApp}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Return to Student Attendance Tracker"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-black shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white leading-tight">
                    Admin Portal &amp; Authority Control
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 tracking-wider">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Logged in as <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.email})
                </p>
              </div>
            </div>

            {/* Date with Day Badge & Return Button */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{todayFullDate}</span>
              </div>

              <button
                type="button"
                onClick={onBackToApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs"
              >
                <span>Tracker View</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 border border-slate-700 text-xs font-semibold transition"
                  title="Sign Out of Admin Portal"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Date with day banner for mobile */}
        <div className="md:hidden mb-4 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Today: {todayFullDate}</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
            Admin
          </span>
        </div>

        {/* Today's Official College Attendance Status */}
        <div className="mb-6">
          {!adminTodayRecord ? (
            <div className="rounded-2xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                        Admin Has Not Entered Attendance
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{todayFullDate}</span>
                    </div>
                    <h2 className="text-base font-black text-slate-900 mt-1">
                      Today&apos;s College Attendance is Pending Admin Entry
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      You have not published official attendance for today. Students currently see that the admin has not entered attendance. You can publish with one click:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAdminQuickPublishToday(7, 7, true, false)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    Mark 7 Classes &amp; Sync All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminQuickPublishToday(0, 0, true, true)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition"
                  >
                    Declare College Holiday
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                        ✓ Official Attendance Published by Admin
                      </span>
                      <span className="text-xs text-slate-500">{todayFullDate}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {adminTodayRecord.log.isHoliday
                        ? 'College Holiday Declared (0 Classes Held)'
                        : `${adminTodayRecord.log.classesHeld} Classes Held • ${adminTodayRecord.log.classesAttended} Classes Attended`}
                      {' • '}
                      <span className="text-indigo-600 font-semibold">Synced to registered students</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdminQuickPublishToday(7, 7, true, false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Re-Sync Standard (7/7)
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAdminTodayPublish}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove today's official record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top 4 Summary Metrics (See All Information) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Registered</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalUsersCount}</div>
            <span className="text-[11px] text-slate-500">
              {studentsCount} students • {adminsCount} admins
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Attendance</span>
              <BookOpen className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-teal-700">{avgAttendance}%</div>
            <span className="text-[11px] text-slate-500">Across all registered users</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Detention Risk</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">{atRiskCount}</div>
            <span className="text-[11px] text-slate-500">Below 75% college minimum</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Admin Authority</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-900">FULL</div>
            <span className="text-[11px] text-slate-500">Rewrite &amp; user management unlocked</span>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'directory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Users Directory ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rewrite')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'rewrite'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Rewrite &amp; Override Tool</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addUser')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'addUser'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setAdminSecurityError('');
              setAdminSecuritySuccess('');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'security'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Admin Unique Pass</span>
          </button>
        </div>

        {/* TAB 1: ALL USERS DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Today's Daily Attendance Reminder & Submissions Monitor Bar */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-indigo-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Daily Student Reminder Monitor
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                      {studentsPendingTodayCount} Pending Today
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                    Today ({todayFullDate}): {studentsLoggedTodayCount} of {studentsCount} students marked attendance
                  </h2>
                  <p className="text-xs text-slate-300">
                    Daily reminders notify students automatically every day after classes conclude.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      studentsPendingTodayCount > 0
                        ? `📢 Daily Attendance Reminder broadcast sent to all ${studentsPendingTodayCount} pending students!`
                        : "All students have already recorded today's attendance!"
                    )
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs sm:text-sm font-black transition shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Reminder Now</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name, roll number, email..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1 text-xs bg-white p-1 rounded-lg border border-slate-200">
                  <span className="text-slate-400 px-2 font-medium">Role:</span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      roleFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('student')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      roleFilter === 'student' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('admin')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      roleFilter === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Admins
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('addUser')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add User</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Today&apos;s Status</th>
                    <th className="py-3 px-4">Baseline Held / Attended</th>
                    <th className="py-3 px-4">Daily Logs</th>
                    <th className="py-3 px-4">Overall Standing</th>
                    <th className="py-3 px-4">Safe Bunks</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No users matching the query &ldquo;{searchQuery}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(({ user, calc }) => {
                      const isCurrent = user.id === currentUser.id;
                      const isSafe = calc.percentage >= (user.attendanceState.minimumRequirement || 76);
                      const userTodayLog = user.attendanceState.dailyLogs.find((l) => l.date === todayDateKey);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition">
                          {/* User Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{user.email}</div>
                            {user.rollNumber && (
                              <div className="text-[10px] text-slate-400">Roll: {user.rollNumber}</div>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          {/* Today's Status & Reminder */}
                          <td className="py-3.5 px-4">
                            {userTodayLog ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  {userTodayLog.isHoliday
                                    ? 'Holiday'
                                    : `${userTodayLog.classesAttended}/${userTodayLog.classesHeld} Attended`}
                                </span>
                                {userTodayLog.classesBunked > 0 && (
                                  <span className="text-[10px] text-rose-600 font-medium">
                                    {userTodayLog.classesBunked} missed today
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Bell className="w-3 h-3 text-amber-600 animate-pulse" />
                                  Pending
                                </span>
                                {user.role === 'student' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      showToast(`🔔 Daily attendance reminder sent to ${user.name}!`)
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-bold transition border border-slate-200"
                                    title="Send reminder alert"
                                  >
                                    Remind
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Baseline */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <div>
                              <strong>{user.attendanceState.baselineAttended}</strong> / {user.attendanceState.baselineHeld}
                            </div>
                            <span className="text-[10px] text-slate-400">prior semester classes</span>
                          </td>

                          {/* Daily Logs */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold">
                              {user.attendanceState.dailyLogs.length} days
                            </span>
                          </td>

                          {/* Overall Percentage */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-black ${
                                  isSafe ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {calc.percentage}%
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isSafe
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-rose-50 text-rose-800'
                                }`}
                              >
                                {isSafe ? 'Safe' : 'Risk'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {calc.totalAttended} of {calc.totalHeld} total classes
                            </div>
                          </td>

                          {/* Safe Bunks */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-black ${
                                calc.safeBunks > 0 ? 'text-purple-700' : 'text-rose-600'
                              }`}
                            >
                              {calc.safeBunks} classes
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setActiveTab('rewrite');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition"
                                title="Rewrite baseline, logs, and information"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Rewrite</span>
                              </button>

                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete user account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* TAB 2: ADD NEW USER */}
        {activeTab === 'addUser' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add New User to Portal</h2>
                <p className="text-xs text-slate-500">
                  Create a new Student or Administrator account with pre-set baseline attendance.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Vikram Singh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Account Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="student">Student Account</option>
                    <option value="admin">Administrator Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="e.g. vikram22"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Default: student123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Roll Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUserRollNumber}
                    onChange={(e) => setNewUserRollNumber(e.target.value)}
                    placeholder="e.g. 23CS012"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Baseline Attendance */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800 mb-2">
                  Initial Starting Attendance Baseline (Classes Till Date)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Baseline Held
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newUserBaselineHeld}
                      onChange={(e) => setNewUserBaselineHeld(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Baseline Attended
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={newUserBaselineHeld}
                      value={newUserBaselineAttended}
                      onChange={(e) => setNewUserBaselineAttended(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Starting Percentage:{' '}
                  <strong className="text-indigo-600">
                    {newUserBaselineHeld > 0
                      ? ((newUserBaselineAttended / newUserBaselineHeld) * 100).toFixed(1)
                      : '100'}%
                  </strong>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: REWRITE & OVERRIDE TOOL ("Rewrite anything I want") */}
        {activeTab === 'rewrite' && selectedUser && (
          <div className="space-y-6">
            {/* Top Selector Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Administrator Rewrite Engine
                  </span>
                  <span className="text-xs bg-indigo-50 text-indigo-800 font-extrabold px-2 py-0.5 rounded">
                    Full Override Privileges
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Editing Data for: <strong className="text-indigo-900">{selectedUser.name}</strong>
                </h2>
                <p className="text-xs text-slate-500">
                  As Administrator, you can rewrite baseline attendance, edit or delete any daily log, or alter account settings.
                </p>
              </div>

              {/* User Dropdown Selector */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select User to Rewrite:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2-Column Grid: Section A (Baseline & Profile) and Section B (Daily Logs Rewrite) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Baseline & Account Rewrite Form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Rewrite Baseline &amp; Profile
                  </h3>
                </div>

                <form onSubmit={handleSaveProfileAndBaseline} className="space-y-4">
                  {/* Baseline Held & Attended */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-950 block mb-2">
                      Starting Baseline Classes
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Baseline Held
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editBaselineHeld}
                          onChange={(e) => setEditBaselineHeld(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-black text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Baseline Attended
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={editBaselineHeld}
                          value={editBaselineAttended}
                          onChange={(e) => setEditBaselineAttended(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-black text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-indigo-700 mt-2">
                      Baseline Standing:{' '}
                      <strong>
                        {editBaselineHeld > 0
                          ? ((editBaselineAttended / editBaselineHeld) * 100).toFixed(1)
                          : '100'}%
                      </strong>
                    </div>
                  </div>

                  {/* College Minimum Requirement */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Minimum Requirement %
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={editMinReq}
                      onChange={(e) => setEditMinReq(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  {/* Email & Username */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Roll Number & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        value={editRollNumber}
                        onChange={(e) => setEditRollNumber(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Role
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="student">Student</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Baseline &amp; Profile Updates</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right 2 Columns: Section B (Rewrite Any Daily Attendance Log) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Daily Attendance Logs for {selectedUser.name} ({selectedUser.attendanceState.dailyLogs.length})
                    </h3>
                  </div>

                  {/* Add Log On Behalf Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddLogOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Log for User</span>
                  </button>
                </div>

                {/* Daily Logs Table */}
                {selectedUser.attendanceState.dailyLogs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No daily logs recorded yet for this user.</p>
                    <p className="mt-1 text-slate-400">
                      Attendance is currently derived entirely from the baseline classes. You can add logs using the button above.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date with Day</th>
                          <th className="py-2.5 px-3">Held</th>
                          <th className="py-2.5 px-3">Attended</th>
                          <th className="py-2.5 px-3">Bunked</th>
                          <th className="py-2.5 px-3">Status / Notes</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedUser.attendanceState.dailyLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{formatDateWithDay(log.date)}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-bold text-slate-700">
                              {log.isHoliday ? '0 (Holiday)' : log.classesHeld}
                            </td>

                            <td className="py-3 px-3 font-bold text-emerald-600">
                              {log.isHoliday ? '0' : log.classesAttended}
                            </td>

                            <td className="py-3 px-3 font-bold">
                              <span className={log.classesBunked > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                {log.isHoliday ? '0' : log.classesBunked}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-slate-600">
                              {log.isHoliday ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {log.holidayName || 'Holiday'}
                                </span>
                              ) : log.note ? (
                                <span className="truncate block max-w-xs text-[11px] italic text-slate-500">
                                  &ldquo;{log.note}&rdquo;
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">Regular</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLog(log)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                                  title="Edit classes held, attended or holiday"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT DAILY LOG */}
        {editingLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Rewrite Log: {formatDateWithDay(editingLog.date)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRewrittenLog} className="space-y-4">
                {/* Holiday Toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Mark as Holiday</span>
                  <input
                    type="checkbox"
                    checked={logEditIsHoliday}
                    onChange={(e) => setLogEditIsHoliday(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>

                {logEditIsHoliday ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Holiday Type
                    </label>
                    <select
                      value={logEditHolidayType}
                      onChange={(e) => setLogEditHolidayType(e.target.value as HolidayType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="festival">Festival Holiday</option>
                      <option value="state">State / Government Holiday</option>
                      <option value="sudden">Sudden Closure / Heavy Rain</option>
                      <option value="other">General Holiday</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Classes Held
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={logEditHeld}
                        onChange={(e) => setLogEditHeld(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Classes Attended
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={logEditHeld}
                        value={logEditAttended}
                        onChange={(e) => setLogEditAttended(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-emerald-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={logEditNote}
                    onChange={(e) => setLogEditNote(e.target.value)}
                    placeholder="e.g. Approved medical leave or tutorial bunk"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingLog(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Save Rewritten Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN UNIQUE PASS & SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                  Security &amp; Access Control
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Admin Unique Security Pass
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  As the primary administrator, manage your unique personal passkey/password for the portal.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {/* Current Profile Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Current Admin Account:</span>
                  <strong className="text-slate-900 font-bold text-sm">{currentUser.name}</strong>
                  <div className="text-slate-600 font-mono mt-0.5">{currentUser.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Unique Pass Protected
                  </span>
                </div>
              </div>

              {/* Update Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAdminSecurityError('');
                  setAdminSecuritySuccess('');
                  if (adminSecurityNewPass.trim().length < 6) {
                    setAdminSecurityError('Unique admin pass must be at least 6 characters.');
                    return;
                  }
                  if (adminSecurityNewPass !== adminSecurityConfirmPass) {
                    setAdminSecurityError('New pass and confirmation do not match.');
                    return;
                  }
                  const res = updateAdminPassword(adminSecurityNewPass.trim());
                  if (res.success) {
                    setAdminSecuritySuccess('Your unique admin pass has been updated successfully!');
                    setAdminSecurityNewPass('');
                    setAdminSecurityConfirmPass('');
                    onRefreshUserState();
                    setUsers(getAllUsers());
                  } else {
                    setAdminSecurityError(res.error || 'Failed to update admin pass.');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    New Unique Admin Pass
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showAdminSecurityPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminSecurityNewPass}
                      onChange={(e) => setAdminSecurityNewPass(e.target.value)}
                      placeholder="Enter new unique admin pass / password"
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminSecurityPass(!showAdminSecurityPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showAdminSecurityPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Choose a strong, unique password only you know.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Unique Pass
                  </label>
                  <input
                    type={showAdminSecurityPass ? 'text' : 'password'}
                    required
                    value={adminSecurityConfirmPass}
                    onChange={(e) => setAdminSecurityConfirmPass(e.target.value)}
                    placeholder="Re-enter new unique pass"
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {adminSecurityError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {adminSecurityError}
                  </div>
                )}

                {adminSecuritySuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{adminSecuritySuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Update Unique Admin Pass</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD LOG ON BEHALF */}
        {isAddLogOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Log on Behalf of {selectedUser.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddLogOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddLogOnBehalf} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newLogDate}
                    onChange={(e) => {
                      setNewLogDate(e.target.value);
                      const sched = getScheduledClassesForDate(e.target.value);
                      setNewLogHeld(sched.classesHeld);
                      setNewLogAttended(sched.classesHeld);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-[11px] text-indigo-600 font-semibold block mt-1">
                    {formatDateWithDay(newLogDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Mark as Holiday</span>
                  <input
                    type="checkbox"
                    checked={newLogIsHoliday}
                    onChange={(e) => setNewLogIsHoliday(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                {!newLogIsHoliday ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Held
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newLogHeld}
                        onChange={(e) => setNewLogHeld(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Attended
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={newLogHeld}
                        value={newLogAttended}
                        onChange={(e) => setNewLogAttended(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-emerald-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Holiday Type
                    </label>
                    <select
                      value={newLogHolidayType}
                      onChange={(e) => setNewLogHolidayType(e.target.value as HolidayType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="festival">Festival Holiday</option>
                      <option value="state">State Holiday</option>
                      <option value="sudden">Sudden Holiday</option>
                      <option value="other">General College Off</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="Admin entry note"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAddLogOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Save Log Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
