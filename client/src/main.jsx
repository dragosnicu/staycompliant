import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Prepend backend URL to all /api calls
const API_BASE = import.meta.env.VITE_API_URL || '';
if (API_BASE) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (url, ...args) =>
    _fetch(typeof url === 'string' && url.startsWith('/api') ? API_BASE + url : url, ...args);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
