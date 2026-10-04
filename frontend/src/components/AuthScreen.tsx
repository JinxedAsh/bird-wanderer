import React, { useState } from 'react';
import { auth, type AuthUser } from '../lib/auth';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  showToast: (message: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, showToast }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [observerName, setObserverName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const user = mode === 'signin'
        ? await auth.login(email, password)
        : await auth.register(observerName, email, password);
      if (user) onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setError('Password recovery is not connected yet. No reset email has been sent.');
  };



  return (
    <div className="flex flex-col w-full px-4 py-8 max-w-md mx-auto items-center justify-center min-h-[90vh]">
      {/* Brand & Identity Header */}
      <header className="flex flex-col items-center text-center mt-2 mb-6">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-[#ebeef3] mb-4 shadow-xs">
          <img
            src="/bird-wanderer-logo.svg"
            alt="Bird Wanderer Logo"
            className="w-16 h-16 rounded-full object-cover"
          />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#fe932c] text-white shadow-xs">
            <span className="material-symbols-outlined text-[14px]">eco</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f4f9] mb-2 border border-[#e0e3e8]">
          <span className="material-symbols-outlined text-[14px] text-[#3b6934]">nature</span>
          <span className="text-[10px] font-bold text-[#42493e] uppercase tracking-wider">
            Field Log & Journal
          </span>
        </div>

        <h1 className="text-[28px] font-bold text-[#181c20] tracking-tight">Bird Wanderer</h1>
        <p className="text-[17px] text-[#3b6934] mt-1 font-bold">Find birds. Go outside.</p>
        <p className="text-[13px] text-[#42493e] max-w-[280px] mt-2 leading-relaxed">
          Discover birds, photograph them, keep your field journal, and connect with other birders.
        </p>
      </header>

      {/* Form Card */}
      <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#f1f4f9] flex flex-col gap-4">
        {/* Tab Switcher */}
        <nav aria-label="Authentication modes" className="flex w-full bg-[#ebeef3] p-1 rounded-xl">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 min-h-11 py-2 rounded-lg text-[13px] transition-all font-bold ${
              mode === 'signin'
                ? 'bg-white text-[#181c20] shadow-xs'
                : 'text-[#42493e] hover:text-[#181c20]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 min-h-11 py-2 rounded-lg text-[13px] transition-all font-bold ${
              mode === 'signup'
                ? 'bg-white text-[#181c20] shadow-xs'
                : 'text-[#42493e] hover:text-[#181c20]'
            }`}
          >
            Create Account
          </button>
        </nav>

        {/* Form */}
        <form onSubmit={handleSubmit} aria-busy={isLoading} className="flex flex-col gap-3.5">
          {/* Name Field (Sign Up only) */}
          {mode === 'signup' && (
            <div className="flex flex-col gap-1 animate-in fade-in duration-200">
              <label htmlFor="auth-name" className="text-[11px] font-bold uppercase text-[#42493e] flex items-center justify-between">
                <span>Observer Name</span>
                <span className="text-[#3b6934] text-[10px]">Field alias</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#42493e] text-[18px] pointer-events-none">
                  badge
                </span>
                <input
                  id="auth-name"
                  aria-label="Observer Name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  value={observerName}
                  onChange={(e) => setObserverName(e.target.value)}
                  placeholder="Sourabh"
                  required
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#f1f4f9] text-[#181c20] text-[13px] placeholder:text-[#72796e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#154212] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-email" className="text-[11px] font-bold uppercase text-[#42493e] flex items-center justify-between">
              <span>Field Email</span>
              <span className="text-[#72796e] text-[10px]">Primary log ID</span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#42493e] text-[18px] pointer-events-none">
                alternate_email
              </span>
              <input
                type="email"
                id="auth-email"
                aria-label="Field Email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sourabh@wanderer.in"
                required
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#f1f4f9] text-[#181c20] text-[13px] placeholder:text-[#72796e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#154212] transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="auth-password" className="text-[11px] font-bold uppercase text-[#42493e]">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-semibold text-[#904d00] hover:text-[#663500]"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#42493e] text-[18px] pointer-events-none">
                key
              </span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                aria-label="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 pl-9 pr-10 rounded-xl bg-[#f1f4f9] text-[#181c20] text-[13px] placeholder:text-[#72796e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#154212] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                className="absolute right-0 flex h-11 w-11 items-center justify-center text-[#42493e] hover:text-[#181c20]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {mode === 'signup' && <p className="text-[11px] text-[#42493e]">Use 12–128 characters for your password.</p>}
          {error && <p role="alert" className="text-[12px] text-[#ba1a1a]">{error}</p>}
          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-[#2d5a27] hover:bg-[#154212] text-white font-bold text-[14px] tracking-wide flex items-center justify-center gap-2 mt-2 shadow-sm active:scale-[0.99] transition-all"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>CONNECTING TO FIELD...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div className="flex items-center justify-center text-center pt-1">
          <p className="text-[12px] text-[#42493e]">
            {mode === 'signin' ? 'New to the field?' : 'Already have an account?'}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-[#3b6934] font-bold hover:underline ml-1 inline-flex items-center gap-0.5"
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Observation Delight Badge */}
      <aside className="mt-6 flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[#f1f4f9] border border-[#e0e3e8]">
        <span className="flex h-2 w-2 rounded-full bg-[#904d00]"></span>
        <p className="text-[10px] font-bold text-[#42493e] tracking-wider uppercase">
          EXTERNAL DISCOVERY & FIELD PLANNING
        </p>
      </aside>
    </div>
  );
};
