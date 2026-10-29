import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ResetPasswordScreen} from './components/ResetPasswordScreen';
import {recoveryTokenFromHash} from './lib/recovery';
import {verificationTokenFromHash} from './lib/verification';
import {VerifyEmailScreen} from './components/VerifyEmailScreen';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import 'leaflet/dist/leaflet.css';
import './index.css';

let accountLinkSequence = 0;
function captureAccountLink() {
  const recoveryToken = recoveryTokenFromHash(window.location.hash);
  const verificationToken = verificationTokenFromHash(window.location.hash);
  const token = recoveryToken !== undefined ? recoveryToken : verificationToken;
  if (token !== undefined) {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    let policy = document.querySelector<HTMLMetaElement>('meta[data-bird-recovery-referrer]');
    if (!policy) {
      policy = document.createElement('meta');
      policy.name = 'referrer';
      policy.dataset.birdRecoveryReferrer = 'true';
      document.head.appendChild(policy);
    }
    policy.content = 'no-referrer';
  }
  return token === undefined ? undefined : { token, purpose: recoveryToken !== undefined ? 'recovery' : 'verification', sequence: ++accountLinkSequence } as const;
}
const initialAccountLink = captureAccountLink();

function EntryScreen() {
  const [link, setLink] = useState(initialAccountLink);
  useEffect(() => {
    const changed = (event: Event) => {
      const next = captureAccountLink();
      if (next !== undefined) {
        // A same-document link can emit popstate before hashchange. Consume
        // account links first so App's normal route canonicalization cannot lose them.
        event.stopImmediatePropagation();
        setLink(next);
      }
    };
    window.addEventListener('popstate', changed, true);
    window.addEventListener('hashchange', changed, true);
    return () => {
      window.removeEventListener('popstate', changed, true);
      window.removeEventListener('hashchange', changed, true);
    };
  }, []);
  return link === undefined ? <App /> : link.purpose === 'recovery' ?
    <ResetPasswordScreen key={`recovery:${link.sequence}`} token={link.token} /> :
    <VerifyEmailScreen key={`verification:${link.sequence}`} token={link.token} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><EntryScreen /></AppErrorBoundary>
  </StrictMode>,
);
