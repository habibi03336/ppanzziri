import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './AdminApp.jsx';
import PresentationApp from './PresentationApp.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = path === '/admin' ? AdminApp : path === '/presentation' ? PresentationApp : App;
const isAdminRoute = path === '/admin';
const isPresentationRoute = path === '/presentation';
const manifestLink = document.querySelector('link[rel="manifest"]');

if (manifestLink) {
  manifestLink.setAttribute('href', isAdminRoute ? '/manifest-admin.webmanifest' : '/manifest.webmanifest');
}

document.body.classList.remove('app-mode', 'admin-mode', 'presentation-mode');
document.body.classList.add(isAdminRoute ? 'admin-mode' : isPresentationRoute ? 'presentation-mode' : 'app-mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
