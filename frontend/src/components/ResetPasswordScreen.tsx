import React, { useEffect, useRef, useState } from 'react';
import { recovery } from '../lib/recovery';

export function ResetPasswordScreen({ token }: { token: string | null }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!token || pending.current) return;
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    pending.current = true; setBusy(true); setError('');
    const request = new AbortController(); controller.current = request;
    try {
      await recovery.reset(token, password, request.signal);
      if (!request.signal.aborted) { setPassword(''); setConfirmation(''); setDone(true); }
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { if (!request.signal.aborted) { pending.current = false; setBusy(false); } }
  };
  return <main className="min-h-dvh bg-[#f1f4f9] flex items-center justify-center p-4 text-[#181c20]">
    <section className="bg-white rounded-2xl p-5 w-full max-w-md space-y-4">
      <img src="/bird-wanderer-logo.svg" alt="Bird Wanderer" className="w-16 h-16 mx-auto" />
      <h1 className="text-xl font-bold">Reset your password</h1>
      {done ? <p role="status">Your password was reset. All sessions for this account were signed out. Sign in with your new password.</p> : !token ? <p role="alert">This reset link is invalid. Return to sign-in and request a new link.</p> : <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-[#42493e]">Use 12–128 characters. After resetting, sign in again. If you refresh this page, reopen the original email link.</p>
        <label className="block text-sm font-semibold">New password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className="mt-1 block w-full rounded-xl border border-[#d2d6ce] p-3" /></label>
        <label className="block text-sm font-semibold">Confirm password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} className="mt-1 block w-full rounded-xl border border-[#d2d6ce] p-3" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-[#154212] text-white font-semibold disabled:opacity-50">{busy ? 'Resetting...' : 'Reset password'}</button>
      </form>}
      <a href="/" className="min-h-11 flex items-center justify-center font-semibold underline">Return to Bird Wanderer</a>
    </section>
  </main>;
}
