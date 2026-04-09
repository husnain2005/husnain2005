// Mappa in memoria: userId -> { userId, username, fullName, lastSeen, onlineSince }
// Non serve il DB: i dati di presenza sono effimeri e si resettano al riavvio del server.
const onlineUsers = new Map();
const TIMEOUT_MS = 90 * 1000; // 90 secondi senza heartbeat = offline

// Pulizia automatica ogni 2 minuti
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of onlineUsers.entries()) {
    if (now - data.lastSeen > TIMEOUT_MS) {
      onlineUsers.delete(userId);
    }
  }
}, 2 * 60 * 1000);

/**
 * POST /api/presence/heartbeat
 * Il frontend chiama questo endpoint ogni 30 secondi per segnalare che l'utente è attivo.
 */
const heartbeat = (req, res) => {
  const { id, username, full_name } = req.user;
  const now = Date.now();
  const existing = onlineUsers.get(id);

  onlineUsers.set(id, {
    userId: id,
    username,
    fullName: full_name,
    lastSeen: now,
    onlineSince: existing ? existing.onlineSince : now
  });

  res.json({ ok: true });
};

/**
 * GET /api/presence/online
 * Restituisce la lista degli utenti attivi nelle ultime 90 secondi.
 */
const getOnlineUsers = (req, res) => {
  const now = Date.now();
  const online = [];

  for (const data of onlineUsers.values()) {
    if (now - data.lastSeen <= TIMEOUT_MS) {
      online.push({
        userId: data.userId,
        username: data.username,
        fullName: data.fullName,
        onlineSince: data.onlineSince,
        onlineForMs: now - data.onlineSince
      });
    }
  }

  // Ordina per chi è online da più tempo
  online.sort((a, b) => a.onlineSince - b.onlineSince);

  res.json({ users: online });
};

module.exports = { heartbeat, getOnlineUsers };
