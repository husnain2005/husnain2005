const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { heartbeat, getOnlineUsers } = require('../controllers/presenceController');

// GET /api/presence/online — lista utenti online
router.get('/online', authenticate, getOnlineUsers);

// POST /api/presence/heartbeat — segnala utente attivo
router.post('/heartbeat', authenticate, heartbeat);

module.exports = router;
