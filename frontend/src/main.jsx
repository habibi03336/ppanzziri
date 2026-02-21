import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './AdminApp.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = path === '/admin' ? AdminApp : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
