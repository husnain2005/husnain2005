import api from './api';

let intervalId = null;

/**
 * Avvia il heartbeat: segnala al server ogni 30 secondi che l'utente è online.
 * Chiamato una volta dopo il login.
 */
export function startHeartbeat() {
  if (intervalId) return;

  // Prima chiamata immediata
  api.post('/presence/heartbeat').catch(() => {});

  intervalId = setInterval(() => {
    api.post('/presence/heartbeat').catch(() => {});
  }, 30 * 1000);
}

/**
 * Ferma il heartbeat. Chiamato al logout.
 */
export function stopHeartbeat() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
