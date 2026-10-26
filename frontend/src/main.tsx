import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ResetPasswordScreen} from './components/ResetPasswordScreen';
import {recoveryTokenFromHash} from './lib/recovery';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import 'leaflet/dist/leaflet.css';
import './index.css';

function captureRecoveryToken() {
  const token = recoveryTokenFromHash(window.location.hash);
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
  return token;
}
const initialRecoveryToken = captureRecoveryToken();

function EntryScreen() {
  const [token, setToken] = useState(initialRecoveryToken);
  useEffect(() => {
    const changed = (event: Event) => {
      const next = captureRecoveryToken();
      if (next !== undefined) {
        // A same-document link can emit popstate before hashchange. Consume
        // recovery first so App's normal route canonicalization cannot lose it.
        event.stopImmediatePropagation();
        setToken(next);
      }
    };
    window.addEventListener('popstate', changed, true);
    window.addEventListener('hashchange', changed, true);
    return () => {
      window.removeEventListener('popstate', changed, true);
      window.removeEventListener('hashchange', changed, true);
    };
  }, []);
  return token === undefined ? <App /> : <ResetPasswordScreen key={token || 'invalid'} token={token} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><EntryScreen /></AppErrorBoundary>
  </StrictMode>,
);
