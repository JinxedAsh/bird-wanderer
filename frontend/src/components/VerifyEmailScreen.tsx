import React, { useEffect, useRef, useState } from 'react';
import { verification } from '../lib/verification';

export function VerifyEmailScreen({ token }: { token: string | null }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!token || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    const request = new AbortController(); controller.current = request;
    try { await verification.confirm(token, request.signal); if (!request.signal.aborted) setDone(true); }
    catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { if (!request.signal.aborted) { pending.current = false; setBusy(false); } }
  };
  return <main className="min-h-dvh bg-[#f1f4f9] flex items-center justify-center p-4 text-[#181c20]">
    <section className="bg-white rounded-2xl p-5 w-full max-w-md space-y-4">
      <img src="/bird-wanderer-logo.svg" alt="Bird Wanderer" className="w-16 h-16 mx-auto" />
      <h1 className="text-xl font-bold">Verify your email</h1>
      {done ? <p role="status">Email verified for the account that requested this link. Your password and current sign-in have not changed.</p> : !token ?
        <p role="alert">This verification link is invalid. Sign in and request a new link in Settings.</p> : <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-[#42493e]">Confirm the email for the account that requested this link. This does not sign you in or change your password. If you refresh, reopen the original email link.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-[#154212] text-white font-semibold disabled:opacity-50">{busy ? 'Verifying...' : 'Verify email'}</button>
        </form>}
      <a href="/" className="min-h-11 flex items-center justify-center font-semibold underline">Return to Bird Wanderer</a>
    </section>
  </main>;
}
