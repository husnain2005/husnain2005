/**
 * telemetryController.js
 * Endpoint REST per consultare i dati telemetrici MQTT della macchina.
 */

const db = require('../config/database');

// ─── GET /api/telemetry/:machineId/latest ─────────────────────────────────────
// Ultima lettura per ogni sensore + definizioni soglie
async function getLatest(req, res) {
  const machineId = parseInt(req.params.machineId, 10);

  try {
    // Verifica accesso alla macchina
    const machineRes = await db.query(
      'SELECT id, numero_commessa FROM machines WHERE id = $1',
      [machineId]
    );
    if (!machineRes.rows.length) {
      return res.status(404).json({ error: 'Macchina non trovata' });
    }

    // Sensori con ultima lettura (LATERAL join)
    const result = await db.query(
      `SELECT
         sd.id, sd.sensor_key, sd.sensor_name, sd.unit,
         sd.min_normal, sd.max_normal,
         sd.min_warning, sd.max_warning,
         sd.min_critical, sd.max_critical,
         lr.value          AS current_value,
         lr.value_text     AS current_value_text,
         lr.recorded_at    AS last_reading_at
       FROM sensor_definitions sd
       LEFT JOIN LATERAL (
         SELECT value, value_text, recorded_at
         FROM sensor_readings
         WHERE machine_id = sd.machine_id AND sensor_key = sd.sensor_key
         ORDER BY recorded_at DESC
         LIMIT 1
       ) lr ON true
       WHERE sd.machine_id = $1 AND sd.is_active = true
       ORDER BY sd.sensor_name`,
      [machineId]
    );

    // Stato macchina (testo)
    const statoRes = await db.query(
      `SELECT value_text, recorded_at
       FROM sensor_readings
       WHERE machine_id = $1 AND sensor_key = 'stato'
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [machineId]
    );

    res.json({
      machine_id: machineId,
      sensors: result.rows,
      stato: statoRes.rows[0] || null,
    });
  } catch (err) {
    console.error('telemetry.getLatest error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── GET /api/telemetry/:machineId/history ────────────────────────────────────
// Storico letture per un sensore specifico
// Query params: sensor (key), hours (default 1), limit (default 500)
async function getHistory(req, res) {
  const machineId  = parseInt(req.params.machineId, 10);
  const sensorKey  = req.query.sensor;
  const hours      = Math.min(parseInt(req.query.hours || '1', 10), 168); // max 7 giorni
  const limit      = Math.min(parseInt(req.query.limit || '500', 10), 2000);

  if (!sensorKey) {
    return res.status(400).json({ error: 'Parametro "sensor" obbligatorio' });
  }

  try {
    const result = await db.query(
      `SELECT value, value_text, recorded_at
       FROM sensor_readings
       WHERE machine_id = $1
         AND sensor_key = $2
         AND recorded_at >= NOW() - ($3 || ' hours')::INTERVAL
       ORDER BY recorded_at ASC
       LIMIT $4`,
      [machineId, sensorKey, hours, limit]
    );

    res.json({ machine_id: machineId, sensor_key: sensorKey, hours, readings: result.rows });
  } catch (err) {
    console.error('telemetry.getHistory error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── GET /api/telemetry/:machineId/alerts ─────────────────────────────────────
// Alert attivi (e ultimi 50 risolti)
async function getAlerts(req, res) {
  const machineId = parseInt(req.params.machineId, 10);
  const includeResolved = req.query.resolved === 'true';

  try {
    let query, params;
    if (includeResolved) {
      query = `SELECT sa.*, u.full_name AS acknowledged_by_name
               FROM sensor_alerts sa
               LEFT JOIN users u ON u.id = sa.acknowledged_by
               WHERE sa.machine_id = $1
               ORDER BY sa.triggered_at DESC
               LIMIT 50`;
      params = [machineId];
    } else {
      query = `SELECT sa.*, u.full_name AS acknowledged_by_name
               FROM sensor_alerts sa
               LEFT JOIN users u ON u.id = sa.acknowledged_by
               WHERE sa.machine_id = $1 AND sa.is_active = true
               ORDER BY sa.alert_level DESC, sa.triggered_at DESC`;
      params = [machineId];
    }

    const result = await db.query(query, params);
    res.json({ machine_id: machineId, alerts: result.rows });
  } catch (err) {
    console.error('telemetry.getAlerts error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── POST /api/telemetry/:machineId/alerts/:alertId/acknowledge ───────────────
// Conferma presa in carico di un alert
async function acknowledgeAlert(req, res) {
  const alertId = parseInt(req.params.alertId, 10);
  const userId  = req.user?.id;

  try {
    const result = await db.query(
      `UPDATE sensor_alerts
       SET acknowledged_by=$1, acknowledged_at=NOW()
       WHERE id=$2 AND is_active=true AND acknowledged_by IS NULL
       RETURNING *`,
      [userId, alertId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Alert non trovato o già confermato' });
    }
    res.json({ alert: result.rows[0] });
  } catch (err) {
    console.error('telemetry.acknowledgeAlert error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── GET /api/telemetry/:machineId/sensors ────────────────────────────────────
// Definizioni sensori con soglie (per pagina impostazioni)
async function getSensors(req, res) {
  const machineId = parseInt(req.params.machineId, 10);

  try {
    const result = await db.query(
      'SELECT * FROM sensor_definitions WHERE machine_id = $1 ORDER BY sensor_name',
      [machineId]
    );
    res.json({ sensors: result.rows });
  } catch (err) {
    console.error('telemetry.getSensors error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── PUT /api/telemetry/:machineId/sensors/:sensorId ─────────────────────────
// Aggiorna soglie di un sensore (solo admin/tecnico)
async function updateSensor(req, res) {
  const sensorId = parseInt(req.params.sensorId, 10);
  const {
    sensor_name, unit,
    min_normal, max_normal,
    min_warning, max_warning,
    min_critical, max_critical,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE sensor_definitions
       SET sensor_name=$1, unit=$2,
           min_normal=$3, max_normal=$4,
           min_warning=$5, max_warning=$6,
           min_critical=$7, max_critical=$8,
           updated_at=NOW()
       WHERE id=$9
       RETURNING *`,
      [sensor_name, unit, min_normal, max_normal, min_warning, max_warning, min_critical, max_critical, sensorId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Sensore non trovato' });
    }
    res.json({ sensor: result.rows[0] });
  } catch (err) {
    console.error('telemetry.updateSensor error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

// ─── GET /api/telemetry/overview ─────────────────────────────────────────────
// Riepilogo stato di tutte le macchine con telemetria attiva (per dashboard)
async function getOverview(req, res) {
  try {
    const result = await db.query(
      `SELECT
         m.id, m.numero_commessa,
         mm.model_name, mm.machine_type,
         c.name AS customer_name,
         COUNT(CASE WHEN sa.alert_level = 'critical' AND sa.is_active THEN 1 END) AS critical_count,
         COUNT(CASE WHEN sa.alert_level = 'warning'  AND sa.is_active THEN 1 END) AS warning_count,
         (SELECT recorded_at FROM sensor_readings sr
          WHERE sr.machine_id = m.id ORDER BY recorded_at DESC LIMIT 1) AS last_reading_at
       FROM machines m
       LEFT JOIN machine_models mm ON mm.id = m.model_id
       LEFT JOIN customers c ON c.id = m.customer_id
       INNER JOIN sensor_definitions sd ON sd.machine_id = m.id
       LEFT JOIN sensor_alerts sa ON sa.machine_id = m.id
       WHERE m.is_active = true
       GROUP BY m.id, m.numero_commessa, mm.model_name, mm.machine_type, c.name
       ORDER BY critical_count DESC, warning_count DESC, m.numero_commessa`
    );

    res.json({ machines: result.rows });
  } catch (err) {
    console.error('telemetry.getOverview error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}

module.exports = {
  getLatest,
  getHistory,
  getAlerts,
  acknowledgeAlert,
  getSensors,
  updateSensor,
  getOverview,
};
