import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Admin from './pages/Admin';

const container = document.getElementById('root');
const root = createRoot(container);

// Verifica se está na página de admin
const isAdminPage = window.location.pathname === '/admin';

root.render(
  <React.StrictMode>
    {isAdminPage ? <Admin /> : <App />}
  </React.StrictMode>
);