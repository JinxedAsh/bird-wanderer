import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ResetPasswordScreen} from './components/ResetPasswordScreen';
import {recoveryTokenFromHash} from './lib/recovery';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import 'leaflet/dist/leaflet.css';
import './index.css';

const recoveryToken = recoveryTokenFromHash(window.location.hash);
if (recoveryToken !== undefined) {
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  const referrerPolicy = document.createElement('meta');
  referrerPolicy.name = 'referrer';
  referrerPolicy.content = 'no-referrer';
  document.head.appendChild(referrerPolicy);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>{recoveryToken === undefined ? <App /> : <ResetPasswordScreen token={recoveryToken} />}</AppErrorBoundary>
  </StrictMode>,
);
