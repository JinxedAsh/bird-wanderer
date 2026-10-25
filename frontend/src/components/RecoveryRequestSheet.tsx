import React, { useEffect, useRef, useState } from 'react';
import { recovery } from '../lib/recovery';
import { useDialogFocus } from '../lib/useDialogFocus';

export function RecoveryRequestSheet({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => { if (!pending.current) onClose(); };
  const dialog = useDialogFocus(true, close);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    const request = new AbortController(); controller.current = request;
    try { const result = await recovery.request(email, request.signal); if (!request.signal.aborted) setMessage(result); }
    catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { if (!request.signal.aborted) { pending.current = false; setBusy(false); } }
  };
  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={close}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="recovery-request-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto text-[#181c20]">
      <h2 id="recovery-request-title" className="text-lg font-bold">Reset your password</h2>
      <p className="mt-2 text-sm text-[#42493e]">Enter your account email to request a single-use reset link. Email recovery needs a configured mail service.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm font-semibold">Account email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className="mt-1 block w-full rounded-xl border border-[#d2d6ce] p-3" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-[#154212] text-white font-semibold disabled:opacity-50">{busy ? 'Requesting...' : 'Request reset link'}</button>
        <button type="button" disabled={busy} onClick={close} className="w-full min-h-11 font-semibold">Close</button>
      </form>
    </section>
  </div>;
}
