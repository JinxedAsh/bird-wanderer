import React, { useEffect, useRef, useState } from 'react';
import { auth, SessionExpiredError } from '../lib/auth';
import { useDialogFocus } from '../lib/useDialogFocus';

export function ChangePasswordSheet({ onClose, onSessionExpired, showToast }: {
  onClose: () => void;
  onSessionExpired?: () => void;
  showToast: (message: string) => void;
}) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => { if (!pending.current) onClose(); };
  const dialog = useDialogFocus(true, close);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (password !== confirmation) { setError('The new passwords do not match.'); return; }
    if (current === password) { setError('Choose a different new password.'); return; }
    pending.current = true;
    setBusy(true); setError('');
    const request = new AbortController();
    controller.current = request;
    try {
      await auth.changePassword(current, password, request.signal);
      if (request.signal.aborted) return;
      window.dispatchEvent(new Event('bird-session-changed'));
      showToast('Password changed. Other sessions and push registrations were removed; enable push again if needed.');
      onClose();
    } catch (failure) {
      if (request.signal.aborted) return;
      if (failure instanceof SessionExpiredError) onSessionExpired?.();
      else setError(failure instanceof Error ? failure.message : 'The change was not confirmed. Please retry.');
    } finally {
      pending.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-2 sm:p-4">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label="Change password" tabIndex={-1} className="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-2xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Change password</h2><button type="button" disabled={busy} onClick={close} aria-label="Close password change" className="min-h-11 min-w-11">×</button></div>
      <p className="text-sm text-[#42493e]">Confirm your current password. Other signed-in sessions and all push registrations will be removed. This device receives a new session; saved records stay in your account.</p>
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-sm">{error}</p>}
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">Current password<input type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={event=>setCurrent(event.target.value)} className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2" /></label>
          <label className="block text-sm">New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2" /></label>
          <p className="text-xs text-[#42493e]">Use 12–128 characters. A long, unique passphrase is easier to remember.</p>
          <label className="block text-sm">Confirm new password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={event=>setConfirmation(event.target.value)} className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2" /></label>
        </fieldset>
        <div className="flex gap-2"><button type="submit" disabled={busy} className="min-h-11 flex-1 rounded-xl bg-[#154212] px-3 text-white disabled:opacity-50">{busy?'Changing…':'Save new password'}</button><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl bg-[#ebeef3] px-3">Cancel</button></div>
      </form>
    </section>
  </div>;
}
