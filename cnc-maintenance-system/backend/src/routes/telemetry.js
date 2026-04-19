const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getLatest,
  getHistory,
  getAlerts,
  acknowledgeAlert,
  getSensors,
  updateSensor,
  getOverview,
} = require('../controllers/telemetryController');

// Tutti gli endpoint richiedono autenticazione
router.use(authenticate);

// Panoramica tutte le macchine con telemetria
router.get('/overview', getOverview);

// Dati per una macchina specifica
router.get('/:machineId/latest',  getLatest);
router.get('/:machineId/history', getHistory);
router.get('/:machineId/alerts',  getAlerts);
router.get('/:machineId/sensors', getSensors);

// Azioni
router.post('/:machineId/alerts/:alertId/acknowledge', acknowledgeAlert);
router.put('/:machineId/sensors/:sensorId', authorize('admin', 'tecnico'), updateSensor);

module.exports = router;
