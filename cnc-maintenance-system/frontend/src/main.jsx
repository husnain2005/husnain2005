import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Aggiornamento automatico service worker — solo in produzione (build nginx).
// In dev (Vite) non serve: non c'è service worker attivo.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then(registration => {
    setInterval(() => registration.update(), 60 * 60 * 1000);
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
