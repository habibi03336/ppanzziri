import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp.jsx';
import PresentationApp from './PresentationApp.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isPresentationRoute = path === '/presentation';
const RootApp = isPresentationRoute ? PresentationApp : AdminApp;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (isPresentationRoute) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    } else {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  });
}

document.body.classList.remove('app-mode', 'presentation-mode');
document.body.classList.add(isPresentationRoute ? 'presentation-mode' : 'app-mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
