import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './AdminApp.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = path === '/admin' ? AdminApp : App;
const isAdminRoute = path === '/admin';

document.body.classList.remove('app-mode', 'admin-mode');
document.body.classList.add(isAdminRoute ? 'admin-mode' : 'app-mode');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
