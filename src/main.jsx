import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

const hash = window.location.hash || '';
const isAuthResponse = /(?:^|[#&])(code|state|error|id_token|access_token)=/.test(hash);
const isPopupOrIframe = (window.opener && window.opener !== window) || window.self !== window.top;

if (isAuthResponse && isPopupOrIframe) {
  // This window is the MSAL popup (or hidden iframe) that just received the auth
  // response. Do not mount the full app or touch the hash — the opener reads the
  // response from this window's URL and closes it automatically.
  rootElement.innerHTML =
    '<p style="font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#c9c9d4">Completing sign-in…</p>';
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
