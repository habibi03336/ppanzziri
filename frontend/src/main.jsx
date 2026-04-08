import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import PresentationApp from './PresentationApp.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = path === '/presentation' ? PresentationApp : App;
const isPresentationRoute = path === '/presentation';

document.body.classList.remove('app-mode', 'presentation-mode');
document.body.classList.add(isPresentationRoute ? 'presentation-mode' : 'app-mode');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
