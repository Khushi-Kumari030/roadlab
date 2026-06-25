import React, { useState } from 'react';
import { useRoadLab } from '../../context/RoadLabContext';
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, signup, forgotPassword, resetPassword, authLoading, authError } = useRoadLab();

  // Mode: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSwitchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setValidationError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setResetToken('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Common Email check
    if (mode !== 'reset' && !validateEmail(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (mode === 'login') {
      if (!password) {
        setValidationError('Password is required.');
        return;
      }
      try {
        await login(email, password);
      } catch (err: any) {
        // Handled via context authError
      }
    } else if (mode === 'signup') {
      if (!name.trim()) {
        setValidationError('Full Name is required.');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
      try {
        await signup(email, password, name);
        setSuccessMessage('Account created successfully! Logging you in...');
      } catch (err: any) {
        // Handled via context
      }
    } else if (mode === 'forgot') {
      try {
        const msg = await forgotPassword(email);
        setSuccessMessage(msg || 'Password reset link sent to your email.');
        // Switch to reset mode for easy testing
        setTimeout(() => {
          setMode('reset');
          setSuccessMessage('Enter the reset token sent to your email to configure your new password.');
        }, 2000);
      } catch (err: any) {
        // Handled via context
      }
    } else if (mode === 'reset') {
      if (!resetToken.trim()) {
        setValidationError('Reset token is required.');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
      try {
        const msg = await resetPassword(resetToken, password);
        setSuccessMessage(msg || 'Password has been reset successfully. Please log in.');
        setTimeout(() => {
          handleSwitchMode('login');
        }, 2500);
      } catch (err: any) {
        // Handled via context
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300">
      
      {/* Background Decorative Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[35rem] h-[35rem] rounded-full bg-brand-blue/5 dark:bg-brand-blue/10 blur-3xl" />
        <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-brand-sky/5 dark:bg-brand-sky/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 transition-workspace flex flex-col">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-sky text-white font-bold text-2xl shadow-xl shadow-brand-blue/20 mb-3 animate-pulse">
            R
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-850 dark:text-gray-100 flex items-center">
            <span>RoadLab</span>
            <span className="ml-1 text-xs text-brand-sky px-1.5 py-0.5 rounded bg-brand-sky/10 font-bold uppercase tracking-wider">Auth</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1 max-w-[280px]">
            AI-Driven Distress Analytics & Homography Measurement
          </p>
        </div>

        {/* Validation / Request Errors */}
        {(validationError || authError) && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-start space-x-2 animate-shake">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{validationError || authError}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-xs flex items-start space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-sky focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Reset Token (Reset Password only) */}
          {mode === 'reset' && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Verification Reset Token
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Sparkles className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Paste token received in email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-sky focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Email Address (Not for Reset Password) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-sky focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Password (Login, Signup, Reset Password) */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot')}
                    className="text-[11px] font-semibold text-brand-blue dark:text-brand-sky hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-sky focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (Signup, Reset Password) */}
          {(mode === 'signup' || mode === 'reset') && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-sky focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 px-4 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:bg-brand-blue/60 transition-all shadow-md shadow-brand-blue/20 font-bold text-sm flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            {authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                {mode === 'reset' && 'Reset Password'}
              </span>
            )}
          </button>
        </form>

        {/* Form Footer Toggles */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-850 flex items-center justify-center text-xs">
          {mode === 'login' && (
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => handleSwitchMode('signup')}
                className="font-bold text-brand-blue dark:text-brand-sky hover:underline"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => handleSwitchMode('login')}
                className="font-bold text-brand-blue dark:text-brand-sky hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => handleSwitchMode('login')}
              className="flex items-center space-x-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
export default AuthScreen;
