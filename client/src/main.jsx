import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const _fetch = window.fetch.bind(window);
window.fetch = (url, ...args) =>
  _fetch(typeof url === 'string' && url.startsWith('/api')
    ? 'https://staycompliant-production.up.railway.app' + url
    : url, ...args);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

And in `client/railway.toml` confirm the startCommand has `-s`:
```
startCommand = "npx serve dist -s -l $PORT"
