import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.fetch = (function(orig){
  return function(url, opts){
    if (typeof url === 'string' && url.indexOf('/api') === 0) {
      url = 'https://staycompliant-production.up.railway.app' + url;
    }
    return orig(url, opts);
  };
})(window.fetch);

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(App, null)
  )
);
