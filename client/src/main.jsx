import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Hardcoded backend URL — no env var needed
const API_BASE = 'https://staycompliant-production.up.railway.app';

const _fetch = window.fetch.bind(window);
window.fetch = (url, ...args) =>
  _fetch(typeof url === 'string' && url.startsWith('/api') ? API_BASE + url : url, ...args);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
