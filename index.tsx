import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Add .tsx file extension for component import
import App from './App.tsx';

// Initialize debug agent for monitoring and diagnostics
import './services/debugAgent';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
