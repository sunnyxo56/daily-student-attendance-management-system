import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  User,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  AlertCircle,
  Hash,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Inbox,
  Send,
  Loader2,
  ChevronUp,
  ChevronsUp,
  ChevronDown,
  GripHorizontal,
  Save,
} from 'lucide-react';
import { AppUser } from '../types';
import {
  authenticateUser,
  registerStudent,
  DEFAULT_ADMIN,
  findUserByEmail,
  sendEmailVerificationCode,
  verifyCodeAndSavePassword,
  getAdminUniquePassword,
  updateAdminPassword,
  hasAdminSetUniquePass,
  isAdminEmail,
} from '../utils/authStorage';
import { formatDateWithFullDay, getTodayDateString } from '../utils/attendanceCalculations';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  initialNotice?: string | null;
}

type MainTab = 'email_flow' | 'direct_signin' | 'register';
type EmailFlowStep = 'enter_email' | 'create_password' | 'enter_code';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, initialNotice }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('direct_signin');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialNotice || '');

  // Check if viewing on small mobile screens (<640px)
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth < 640 : false;

  // Draggable card animation state: on mobile, open directly so mobile users never get blocked
  const [isCardRevealed, setIsCardRevealed] = useState(() => Boolean(initialNotice) || isMobileScreen);

  // Smooth sign in transition state
  const [signingInUser, setSigningInUser] = useState<AppUser | null>(null);

  // -------------------------------------------------------------
  // Flow: Enter Email -> Create Password -> Enter Verification Code
  // -------------------------------------------------------------
  const [emailStep, setEmailStep] = useState<EmailFlowStep>('enter_email');
  const [emailInput, setEmailInput] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification Code State
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [activeCodeNotice, setActiveCodeNotice] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Direct Sign In Form State
  const [directUsernameOrEmail, setDirectUsernameOrEmail] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [showDirectPassword, setShowDirectPassword] = useState(false);

  // Admin Unique Pass Setup State
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  const [adminPassMessage, setAdminPassMessage] = useState('');
  const [adminPassError, setAdminPassError] = useState('');

  // Register New Student Form State (Full baseline)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regBaselineHeld, setRegBaselineHeld] = useState<number>(415);
  const [regBaselineAttended, setRegBaselineAttended] = useState<number>(320);

  // OTP input refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const todayDateWithDay = formatDateWithFullDay(getTodayDateString());

  // Countdown timer for resend code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Detected existing user based on emailInput
  const detectedUser = emailInput.trim() ? findUserByEmail(emailInput.trim()) : null;

  // Smooth login completion helper
  const completeLoginSmoothly = (user: AppUser, customMsg?: string) => {
    setSigningInUser(user);
    if (customMsg) setSuccessMessage(customMsg);
    setTimeout(() => {
      onLoginSuccess(user);
    }, 650);
  };

  // -------------------------------------------------------------
  // Step 1: Submit Email
  // -------------------------------------------------------------
  const handleProceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your college or personal email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. student@college.edu).');
      return;
    }

    setEmailStep('create_password');
  };

  // -------------------------------------------------------------
  // Step 2: Submit Password Creation & Send Verification Code
  // -------------------------------------------------------------
  const handleSendVerificationCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword) {
      setErrorMessage('Please create a password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    // Generate and send verification code
    const result = sendEmailVerificationCode(emailInput, newPassword);
    setActiveCodeNotice(result.code);
    setResendCountdown(30);
    setVerificationCode(['', '', '', '', '', '']);
    setEmailStep('enter_code');

    setSuccessMessage(`Verification code dispatched to ${emailInput.trim()}! Please check below.`);

    // Focus first OTP box
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 150);
  };

  // -------------------------------------------------------------
  // Resend Code
  // -------------------------------------------------------------
  const handleResendCode = () => {
    if (resendCountdown > 0) return;
    setErrorMessage('');
    const result = sendEmailVerificationCode(emailInput, newPassword);
    setActiveCodeNotice(result.code);
    setResendCountdown(30);
    setSuccessMessage(`A fresh verification code was sent to ${emailInput}!`);
  };

  // -------------------------------------------------------------
  // OTP Input Handling
  // -------------------------------------------------------------
  const handleOtpChange = (index: number, value: string) => {
    // If pasted string
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...verificationCode];
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setVerificationCode(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...verificationCode];
    newOtp[index] = digit;
    setVerificationCode(newOtp);

    // Auto-advance
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-fill code helper
  const handleAutoFillCode = () => {
    if (activeCodeNotice && activeCodeNotice.length === 6) {
      const digits = activeCodeNotice.split('');
      setVerificationCode(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (activeCodeNotice) {
      navigator.clipboard.writeText(activeCodeNotice);
      setHasCopiedCode(true);
      setTimeout(() => setHasCopiedCode(false), 2000);
    }
  };

  // -------------------------------------------------------------
  // Step 3: Verify Code and Log In
  // -------------------------------------------------------------
  const handleVerifyCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const fullCode = verificationCode.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      const result = verifyCodeAndSavePassword(
        emailInput,
        fullCode,
        newPassword,
        studentNameInput || undefined
      );

      setIsVerifying(false);

      if (result.success && result.user) {
        completeLoginSmoothly(
          result.user,
          result.isNewUser
            ? 'Account created and verified successfully!'
            : 'Email verified and password established!'
        );
      } else {
        setErrorMessage(result.error || 'Verification failed. Please check the code.');
      }
    }, 350);
  };

  // -------------------------------------------------------------
  // Direct Password Login
  // -------------------------------------------------------------
  const handleDirectSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const target = directUsernameOrEmail.trim();
    if (!target) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    // Only if admin enters their admin Gmail:
    if (isAdminEmail(target)) {
      if (!hasAdminSetUniquePass()) {
        // Admin must set unique pass first
        setAdminPassError('');
        setAdminPassMessage('');
        setAdminNewPass('');
        setAdminConfirmPass('');
        setShowAdminPassModal(true);
        return;
      }
    }

    const result = authenticateUser(target, directPassword);
    if (result.success && result.user) {
      completeLoginSmoothly(result.user, 'Welcome back!');
    } else {
      if (result.needsAdminPassSetup) {
        setAdminPassError('');
        setAdminPassMessage('');
        setAdminNewPass('');
        setAdminConfirmPass('');
        setShowAdminPassModal(true);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
      }
    }
  };

  // -------------------------------------------------------------
  // Set / Update Admin Unique Pass
  // -------------------------------------------------------------
  const handleSaveUniqueAdminPass = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    setAdminPassMessage('');

    if (adminNewPass.trim().length < 6) {
      setAdminPassError('Your unique admin pass must be at least 6 characters.');
      return;
    }

    if (adminNewPass !== adminConfirmPass) {
      setAdminPassError('Passwords do not match. Please re-enter.');
      return;
    }

    const res = updateAdminPassword(adminNewPass.trim());
    if (res.success) {
      setAdminPassMessage('Your unique admin pass has been saved! Launching portal...');
      setDirectUsernameOrEmail('yunussubhansk@gmail.com');
      setDirectPassword(adminNewPass.trim());
      setTimeout(() => {
        setShowAdminPassModal(false);
        const auth = authenticateUser('yunussubhansk@gmail.com', adminNewPass.trim());
        if (auth.success && auth.user) {
          completeLoginSmoothly(auth.user, 'Unique pass saved successfully. Welcome back!');
        } else {
          setSuccessMessage('Unique admin pass saved successfully! You can now sign in.');
        }
      }, 900);
    } else {
      setAdminPassError(res.error || 'Failed to update admin pass.');
    }
  };

  // -------------------------------------------------------------
  // Full Registration Form
  // -------------------------------------------------------------
  const handleRegisterFull = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim() || !regEmail.trim() || !regUsername.trim()) {
      setErrorMessage('Please fill in all required fields (Name, Email, Username).');
      return;
    }

    const result = registerStudent({
      name: regName,
      email: regEmail,
      username: regUsername,
      password: regPassword || 'student123',
      rollNumber: regRollNumber,
      baselineHeld: Number(regBaselineHeld) || 415,
      baselineAttended: Number(regBaselineAttended) || 320,
    });

    if (result.success && result.user) {
      completeLoginSmoothly(result.user, 'Student account initialized successfully!');
    } else {
      setErrorMessage(result.error || 'Registration failed. Please check your details.');
    }
  };

  // If currently completing smooth sign-in transition
  if (signingInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full text-center space-y-4 transition-all duration-300">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg ${
                signingInUser.role === 'admin'
                  ? 'bg-purple-600 shadow-purple-200'
                  : 'bg-indigo-600 shadow-indigo-200'
              }`}
            >
              {signingInUser.role === 'admin' ? 'A' : signingInUser.name.charAt(0)}
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]">
              ✓
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              Welcome, {signingInUser.name}!
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Verified College Session</span>
              <span className="text-xs text-slate-400">• 76% Safety Rule</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Launching your daily attendance dashboard and calculating safe bunk limits...
          </p>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-pulse w-4/5 transition-all duration-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-indigo-50/40 to-slate-200 flex flex-col justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8 relative overflow-x-hidden overflow-y-auto">
      {/* Ambient background decoration */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-300/20 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {!isCardRevealed ? (
          /* ============================================================ */
          /* DRAGGABLE COVER CARD: Drag / Slide up to reveal login page   */
          /* ============================================================ */
          <motion.div
            key="cover-card-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -160, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-md mx-auto px-4 z-10"
          >
            {/* Top Date Badge */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{todayDateWithDay}</span>
              </div>
            </div>

            {/* DRAGGABLE CARD */}
            <motion.div
              drag="y"
              dragConstraints={{ top: -240, bottom: 0 }}
              dragElastic={0.35}
              onDragEnd={(_, info) => {
                // If user drags up more than 50px or flicks up with velocity
                if (info.offset.y < -50 || info.velocity.y < -250) {
                  setIsCardRevealed(true);
                }
              }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.99, cursor: 'grabbing' }}
              className="relative cursor-grab active:cursor-grabbing rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl shadow-indigo-950/40 border border-indigo-400/25 overflow-hidden select-none transition-shadow hover:shadow-indigo-500/20"
            >
              {/* Radial gradient sheen */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_50%)] pointer-events-none" />
              <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                      Academic Portal Pass
                    </span>
                    <h2 className="text-lg font-extrabold text-white tracking-tight leading-tight">
                      College Attendance
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Portal Active</span>
                </div>
              </div>

              {/* Security EMV Chip & Threshold Details */}
              <div className="relative z-10 flex items-center justify-between mb-8">
                {/* Chip graphic */}
                <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-400 border border-amber-400/60 shadow-inner flex items-center justify-center relative overflow-hidden">
                  <div className="w-full h-px bg-amber-600/40 absolute top-2.5" />
                  <div className="w-full h-px bg-amber-600/40 absolute bottom-2.5" />
                  <div className="h-full w-px bg-amber-600/40 absolute left-3.5" />
                  <div className="h-full w-px bg-amber-600/40 absolute right-3.5" />
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Threshold Engine
                  </div>
                  <div className="text-xs font-black text-indigo-300">
                    76% Safe Bunk System
                  </div>
                </div>
              </div>

              {/* Card Number Line */}
              <div className="relative z-10 mb-8 font-mono text-sm tracking-widest text-slate-300 flex justify-between">
                <span>••••</span>
                <span>••••</span>
                <span>••••</span>
                <span className="text-white font-bold">2026</span>
              </div>

              {/* DRAGGABLE INTERACTION CALLOUT */}
              <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col items-center gap-2 text-center">
                {/* Animated chevrons moving upwards */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="flex flex-col items-center text-indigo-300"
                >
                  <ChevronsUp className="w-5 h-5" />
                </motion.div>

                <div className="text-xs font-bold text-white">
                  Drag card up to show login page
                </div>
                <span className="text-[11px] text-slate-400">
                  Swipe up with touch or drag up with mouse
                </span>

                {/* Instant Tap/Click Button */}
                <button
                  type="button"
                  onClick={() => setIsCardRevealed(true)}
                  className="mt-2.5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Or Click to Open Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ============================================================ */
          /* REVEALED LOGIN FORM: Shown when card is dragged up           */
          /* ============================================================ */
          <motion.div
            key="login-page-view"
            initial={{ opacity: 0, y: 70, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="sm:mx-auto sm:w-full sm:max-w-lg px-4 z-10"
          >
            {/* Drag down bar & Return back */}
            <div className="mb-3 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setIsCardRevealed(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Card</span>
              </button>

              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 120 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 50 || info.velocity.y > 200) {
                    setIsCardRevealed(false);
                  }
                }}
                className="cursor-grab active:cursor-grabbing inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/90 hover:bg-slate-300 text-[11px] font-semibold text-slate-600 transition select-none shadow-2xs"
                title="Drag down to close login page"
              >
                <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Drag down to close</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </motion.div>
            </div>

            {/* Top Banner Date and Day */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3 shadow-2xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{todayDateWithDay}</span>
              </div>

              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <GraduationCap className="w-7 h-7" />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                College Attendance Portal
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Email Verification, Custom Password Creation &amp; 76% Attendance Safety
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-white py-7 px-5 sm:px-9 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
              {/* Top Tabs */}
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('direct_signin');
                    setErrorMessage('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold transition border-b-2 text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'direct_signin'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Email &amp; Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('email_flow');
                    setErrorMessage('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold transition border-b-2 text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'email_flow'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Verification Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold transition border-b-2 text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'register'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>New Student</span>
                </button>
              </div>

              {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: EMAIL VERIFICATION & PASSWORD CREATION FLOW         */}
          {/* ========================================================= */}
          {activeTab === 'email_flow' && (
            <div>
              {/* Stepper Header */}
              <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div
                    className={`flex items-center gap-1.5 ${
                      emailStep === 'enter_email'
                        ? 'text-indigo-600 font-bold'
                        : 'text-emerald-600'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        emailStep === 'enter_email'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {emailStep !== 'enter_email' ? '✓' : '1'}
                    </span>
                    <span>1. Enter Email</span>
                  </div>

                  <span className="text-slate-300">&rarr;</span>

                  <div
                    className={`flex items-center gap-1.5 ${
                      emailStep === 'create_password'
                        ? 'text-indigo-600 font-bold'
                        : emailStep === 'enter_code'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        emailStep === 'create_password'
                          ? 'bg-indigo-600 text-white'
                          : emailStep === 'enter_code'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {emailStep === 'enter_code' ? '✓' : '2'}
                    </span>
                    <span>2. Create Password</span>
                  </div>

                  <span className="text-slate-300">&rarr;</span>

                  <div
                    className={`flex items-center gap-1.5 ${
                      emailStep === 'enter_code'
                        ? 'text-indigo-600 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        emailStep === 'enter_code'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      3
                    </span>
                    <span>3. Verify Code</span>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* STEP 1: ENTER EMAIL                                  */}
              {/* ---------------------------------------------------- */}
              {emailStep === 'enter_email' && (
                <form onSubmit={handleProceedToPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      College or Personal Email Address *
                    </label>
                    <div className="relative rounded-lg shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="e.g. name@college.edu or student@college.edu"
                        className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Enter your email to create your password and receive a 6-digit verification code.
                    </span>
                  </div>

                  {/* Account recognition preview */}
                  {emailInput.trim().length > 3 && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      {detectedUser ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Recognized User: <strong>{detectedUser.name}</strong>
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-600 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-indigo-500" />
                          <span>New student email. An account will be initialized upon verification.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* If new email, let them specify their full name optionally */}
                  {!detectedUser && emailInput.trim().length > 3 && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Full Student Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={studentNameInput}
                        onChange={(e) => setStudentNameInput(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                    >
                      <span>Continue &amp; Create Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 2: CREATE OWN PASSWORD                          */}
              {/* ---------------------------------------------------- */}
              {emailStep === 'create_password' && (
                <form onSubmit={handleSendVerificationCode} className="space-y-4">
                  {/* Selected Email Badge */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                    <div className="flex items-center gap-2 text-indigo-950 font-medium">
                      <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-[240px] sm:max-w-[300px]">{emailInput}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailStep('enter_email')}
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline text-xs"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Create Your Password *
                    </label>
                    <div className="relative rounded-lg shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password (min. 6 characters)"
                        className="block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative rounded-lg shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password to confirm"
                        className="block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && confirmPassword && (
                      <span
                        className={`text-[11px] mt-1 block font-medium ${
                          newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {newPassword === confirmPassword
                          ? '✓ Passwords match'
                          : '✗ Passwords do not match'}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Next Step:</p>
                    <p>
                      Clicking below will dispatch a 6-digit verification code to <strong>{emailInput}</strong>.
                      Entering the code confirms your email and establishes your new password.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEmailStep('enter_email')}
                      className="py-2.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center gap-1.5 transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Verification Code to Email</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 3: ENTER VERIFICATION CODE                      */}
              {/* ---------------------------------------------------- */}
              {emailStep === 'enter_code' && (
                <div className="space-y-5">
                  {/* Email Target Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Verification code sent to:</span>
                      <strong className="text-indigo-950 font-bold">{emailInput}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailStep('create_password')}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline"
                    >
                      Edit Password
                    </button>
                  </div>

                  {/* Simulated College Email Dispatch Box (Instant & Visible) */}
                  {activeCodeNotice && (
                    <div className="p-4 rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-indigo-50 shadow-md animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-2.5">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Inbox className="w-4 h-4 text-indigo-600" />
                          Simulated College Mail Delivery
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 uppercase tracking-wider">
                          New Email
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 mb-2">
                        <div className="font-semibold text-slate-900">
                          Subject: College Portal - Your Attendance Verification Code
                        </div>
                        <div className="text-[11px] text-slate-500">
                          To: {emailInput} • From: verification@college-attendance.edu
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-indigo-200 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            Your 6-Digit Code
                          </span>
                          <span className="text-2xl font-black text-indigo-600 tracking-widest font-mono">
                            {activeCodeNotice}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                            title="Copy code"
                          >
                            {hasCopiedCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleAutoFillCode}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Auto-Fill</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6-Digit OTP Input Form */}
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                        Enter 6-Digit Verification Code
                      </label>
                      <div className="flex justify-center gap-2 sm:gap-2.5">
                        {verificationCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none transition bg-white text-slate-900 shadow-2xs"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCountdown > 0}
                        className={`font-semibold flex items-center gap-1 ${
                          resendCountdown > 0
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${resendCountdown > 0 ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCountdown > 0
                            ? `Resend code in ${resendCountdown}s`
                            : 'Resend Verification Code'}
                        </span>
                      </button>

                      <span className="text-[11px] text-slate-400">Valid for 10 minutes</span>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEmailStep('create_password')}
                        className="py-2.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center gap-1.5 transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying || verificationCode.join('').length !== 6}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Code...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Verify &amp; Enter Portal</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: DIRECT EMAIL/PASSWORD SIGN IN                     */}
          {/* ========================================================= */}
          {activeTab === 'direct_signin' && (() => {
            const isTargetAdmin = isAdminEmail(directUsernameOrEmail);
            const isPassEstablished = hasAdminSetUniquePass();

            return (
              <form onSubmit={handleDirectSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address or Username
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={directUsernameOrEmail}
                      onChange={(e) => setDirectUsernameOrEmail(e.target.value)}
                      placeholder="Enter your registered email address or username"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* ONLY after entering admin gmail: admin must set a unique pass */}
                  {isTargetAdmin && !isPassEstablished && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-purple-950 font-bold">
                        <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>Admin Account Detected</span>
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        To protect administrator access, you must set your private unique pass before accessing the portal.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminPassError('');
                          setAdminPassMessage('');
                          setAdminNewPass('');
                          setAdminConfirmPass('');
                          setShowAdminPassModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Set Unique Admin Pass</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {isTargetAdmin ? 'Unique Admin Pass' : 'Password'}
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showDirectPassword ? 'text' : 'password'}
                      value={directPassword}
                      onChange={(e) => setDirectPassword(e.target.value)}
                      placeholder={
                        isTargetAdmin
                          ? isPassEstablished
                            ? 'Enter your unique admin pass'
                            : 'Set your unique pass above first'
                          : 'Enter your password'
                      }
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDirectPassword(!showDirectPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showDirectPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                  >
                    <span>
                      {isTargetAdmin && !isPassEstablished
                        ? 'Set Unique Pass & Continue'
                        : 'Sign In with Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className={`flex items-center pt-1 ${isTargetAdmin ? 'justify-between' : 'justify-end'}`}>
                  {isTargetAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPassError('');
                        setAdminPassMessage('');
                        setAdminNewPass('');
                        setAdminConfirmPass('');
                        setShowAdminPassModal(true);
                      }}
                      className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 hover:underline"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isPassEstablished ? 'Change Unique Admin Pass' : 'Set Unique Admin Pass'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('email_flow');
                      setEmailStep('enter_email');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Email verification code
                  </button>
                </div>
              </form>
            );
          })()}

          {/* ========================================================= */}
          {/* TAB 3: REGISTER NEW STUDENT (WITH CUSTOM BASELINE)        */}
          {/* ========================================================= */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterFull} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. rahul"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Default: student123"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Roll / Reg Number
                  </label>
                  <input
                    type="text"
                    value={regRollNumber}
                    onChange={(e) => setRegRollNumber(e.target.value)}
                    placeholder="e.g. 23CS045"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Baseline Attendance */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  Initial Baseline Classes (Prior Semester / Till Date)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Classes Held
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={regBaselineHeld}
                      onChange={(e) => setRegBaselineHeld(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Classes Attended
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={regBaselineHeld}
                      value={regBaselineAttended}
                      onChange={(e) => setRegBaselineAttended(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Starting Attendance:{' '}
                  <strong className="text-indigo-600">
                    {regBaselineHeld > 0
                      ? ((regBaselineAttended / regBaselineHeld) * 100).toFixed(1)
                      : '100'}
                    %
                  </strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <span>Complete Student Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Secure Authentication Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure Portal Authentication
            </span>
            <span className="text-slate-400">Attendance &amp; Safe Bunk Monitor</span>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Admin Unique Pass Setup Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Set Unique Admin Pass
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a private, custom password for the administrator account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminPassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUniqueAdminPass} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/80 text-xs">
                <span className="text-purple-950 font-semibold block">
                  Administrator Account:
                </span>
                <span className="text-slate-600 font-mono">
                  {directUsernameOrEmail.trim() || 'yunussubhansk@gmail.com'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Unique Admin Pass
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showAdminNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={adminNewPass}
                    onChange={(e) => setAdminNewPass(e.target.value)}
                    placeholder="Enter your unique password / passkey"
                    className="block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showAdminNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Minimum 6 characters. Must be unique to your admin account.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Unique Pass
                </label>
                <input
                  type={showAdminNewPass ? 'text' : 'password'}
                  required
                  value={adminConfirmPass}
                  onChange={(e) => setAdminConfirmPass(e.target.value)}
                  placeholder="Re-enter your unique pass"
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {adminPassError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {adminPassError}
                </div>
              )}

              {adminPassMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{adminPassMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPassModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Unique Pass &amp; Log In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
