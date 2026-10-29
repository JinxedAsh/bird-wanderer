import React, { useEffect, useRef, useState } from 'react';
import { verification } from '../lib/verification';
import { SessionExpiredError } from '../lib/auth';

export function EmailVerification({ onSessionExpired }: { onSessionExpired?: () => void }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const load = async (resend = false) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage(''); setError('');
    const request = new AbortController(); controller.current = request;
    try {
      const status = await verification.status(request.signal);
      if (!request.signal.aborted) setVerified(status);
      if (resend && !status) {
        const result = await verification.resend(request.signal);
        if (!request.signal.aborted) setMessage(result);
      }
    } catch (error) {
      if (!request.signal.aborted) {
        if (error instanceof SessionExpiredError) onSessionExpired?.();
        setError(error instanceof Error ? error.message : 'Please try again.');
      }
    } finally { if (!request.signal.aborted) { pending.current = false; setBusy(false); } }
  };
  useEffect(() => {
    void load();
    return () => { controller.current?.abort(); pending.current = false; };
  }, []);
  return <div className="px-4 py-3 border-t border-[#f1f4f9] text-[12px] text-[#42493e] space-y-2">
    <p role="status">{verified === null ? 'Email verification status not loaded.' : verified ? 'Email verified' : 'Email not verified. Sign-in remains available.'}</p>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-x-4">
      {verified === false && <button type="button" disabled={busy} onClick={() => void load(true)} className="min-h-11 font-semibold underline disabled:opacity-50">Send verification email</button>}
      <button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 font-semibold underline disabled:opacity-50">{busy ? 'Checking...' : 'Check verification status'}</button>
    </div>
  </div>;
}
