import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log("React entry point loaded");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

console.log("Root element found, mounting React app...");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("React app mounted");