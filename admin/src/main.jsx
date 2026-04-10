import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp.jsx';
import PresentationApp from './PresentationApp.jsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  });
}

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isPresentationRoute = path === '/presentation';
const RootApp = isPresentationRoute ? PresentationApp : AdminApp;

document.body.classList.remove('app-mode', 'presentation-mode');
document.body.classList.add(isPresentationRoute ? 'presentation-mode' : 'app-mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
