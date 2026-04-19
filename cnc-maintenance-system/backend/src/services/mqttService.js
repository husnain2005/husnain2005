/**
 * mqttService.js
 * Si connette al broker Mosquitto, si sottoscrive ai topic dei sensori CNC
 * e scrive i dati in PostgreSQL gestendo alert automatici.
 *
 * Topic:   cnc/machines/{numero_commessa}/telemetry
 * Payload: { ts, temp_olio, temp_mandrino, vibrazione,
 *             corrente_motore, pressione_idraulica,
 *             velocita_mandrino, ore_funzionamento, stato }
 */

const mqtt = require('mqtt');
const db   = require('../config/database');
const { logger } = require('../config/logger');

// ─── Soglie di default per sensori noti ──────────────────────────────────────
const DEFAULT_SENSOR_DEFS = {
  temp_olio: {
    sensor_name: 'Temperatura Olio', unit: '°C',
    min_normal: 20,  max_normal: 60,
    max_warning: 75, max_critical: 85,
  },
  temp_mandrino: {
    sensor_name: 'Temperatura Mandrino', unit: '°C',
    min_normal: 15,  max_normal: 50,
    max_warning: 65, max_critical: 75,
  },
  vibrazione: {
    sensor_name: 'Vibrazione Mandrino', unit: 'mm/s',
    min_normal: 0, max_normal: 4,
    max_warning: 6, max_critical: 9,
  },
  corrente_motore: {
    sensor_name: 'Corrente Motore', unit: 'A',
    min_normal: 0, max_normal: 35,
    max_warning: 42, max_critical: 50,
  },
  pressione_idraulica: {
    sensor_name: 'Pressione Idraulica', unit: 'bar',
    min_normal: 55,  max_normal: 85,
    min_warning: 45, min_critical: 35,
    max_warning: 95, max_critical: 105,
  },
  velocita_mandrino: {
    sensor_name: 'Velocità Mandrino', unit: 'RPM',
    min_normal: 0, max_normal: 3000,
    max_warning: 3200, max_critical: 3500,
  },
  ore_funzionamento: {
    sensor_name: 'Ore Funzionamento', unit: 'h',
    min_normal: 0, max_normal: 999999,
  },
};

const TOPIC_SUBSCRIBE = 'cnc/machines/+/telemetry';

let client = null;

// ─── Inizializzazione connessione ─────────────────────────────────────────────
function initMqtt() {
  const host = process.env.MQTT_HOST || 'localhost';
  const port = parseInt(process.env.MQTT_PORT || '1883', 10);
  const brokerUrl = `mqtt://${host}:${port}`;

  logger.info(`MQTT: connessione a ${brokerUrl} ...`);

  client = mqtt.connect(brokerUrl, {
    clientId: `cnc_backend_${process.pid}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    logger.info('MQTT: connesso al broker');
    client.subscribe(TOPIC_SUBSCRIBE, { qos: 1 }, (err) => {
      if (err) {
        logger.error('MQTT: errore subscription:', err);
      } else {
        logger.info(`MQTT: sottoscritto a ${TOPIC_SUBSCRIBE}`);
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      await handleMessage(topic, message.toString());
    } catch (err) {
      logger.error(`MQTT: errore elaborazione messaggio [${topic}]:`, err);
    }
  });

  client.on('error', (err) => {
    logger.error('MQTT: errore connessione:', err.message);
  });

  client.on('reconnect', () => {
    logger.warn('MQTT: tentativo di riconnessione...');
  });

  client.on('offline', () => {
    logger.warn('MQTT: broker offline');
  });

  // Cron giornaliero: pulizia letture più vecchie di 90 giorni
  scheduleDailyCleanup();

  return client;
}

// ─── Gestione messaggio in arrivo ─────────────────────────────────────────────
async function handleMessage(topic, rawMessage) {
  // topic: cnc/machines/{numero_commessa}/telemetry
  const parts = topic.split('/');
  if (parts.length < 4) return;
  const numero_commessa = parts[2];

  let payload;
  try {
    payload = JSON.parse(rawMessage);
  } catch {
    logger.warn(`MQTT: payload JSON non valido dal topic ${topic}`);
    return;
  }

  // Trova la macchina nel gestionale
  const machineRes = await db.query(
    'SELECT id FROM machines WHERE numero_commessa = $1 AND is_active = true',
    [numero_commessa]
  );

  if (!machineRes.rows.length) {
    logger.warn(`MQTT: macchina non trovata per commessa "${numero_commessa}"`);
    return;
  }

  const machineId = machineRes.rows[0].id;
  const ts = payload.ts ? new Date(payload.ts) : new Date();

  // Chiavi numeriche (sensori analogici)
  const numericKeys = Object.keys(payload).filter(
    (k) => !['ts', 'stato'].includes(k) && typeof payload[k] === 'number'
  );

  // Inserisci letture numeriche
  for (const key of numericKeys) {
    await db.query(
      `INSERT INTO sensor_readings (machine_id, sensor_key, value, recorded_at)
       VALUES ($1, $2, $3, $4)`,
      [machineId, key, payload[key], ts]
    );
  }

  // Inserisci stato come testo
  if (payload.stato) {
    await db.query(
      `INSERT INTO sensor_readings (machine_id, sensor_key, value_text, recorded_at)
       VALUES ($1, 'stato', $2, $3)`,
      [machineId, payload.stato, ts]
    );
  }

  // Crea sensor_definitions automaticamente se non esistono
  await ensureSensorDefinitions(machineId, numericKeys);

  // Controllo soglie e gestione alert
  await checkThresholds(machineId, payload, numericKeys, ts);
}

// ─── Auto-crea sensor_definitions con soglie di default ───────────────────────
async function ensureSensorDefinitions(machineId, sensorKeys) {
  for (const key of sensorKeys) {
    const def = DEFAULT_SENSOR_DEFS[key] || {
      sensor_name: key.replace(/_/g, ' '),
      unit: '',
    };

    await db.query(
      `INSERT INTO sensor_definitions
         (machine_id, sensor_key, sensor_name, unit,
          min_normal, max_normal,
          min_warning, max_warning,
          min_critical, max_critical)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (machine_id, sensor_key) DO NOTHING`,
      [
        machineId, key, def.sensor_name, def.unit ?? '',
        def.min_normal  ?? null, def.max_normal  ?? null,
        def.min_warning ?? null, def.max_warning ?? null,
        def.min_critical ?? null, def.max_critical ?? null,
      ]
    );
  }
}

// ─── Controllo soglie e creazione/risoluzione alert ───────────────────────────
async function checkThresholds(machineId, payload, numericKeys, ts) {
  for (const key of numericKeys) {
    const value = parseFloat(payload[key]);

    const defRes = await db.query(
      'SELECT * FROM sensor_definitions WHERE machine_id = $1 AND sensor_key = $2',
      [machineId, key]
    );
    if (!defRes.rows.length) continue;
    const def = defRes.rows[0];

    // Calcola livello di alert
    let alertLevel = null;
    let threshold  = null;

    const maxCrit = def.max_critical != null ? parseFloat(def.max_critical) : null;
    const minCrit = def.min_critical != null ? parseFloat(def.min_critical) : null;
    const maxWarn = def.max_warning  != null ? parseFloat(def.max_warning)  : null;
    const minWarn = def.min_warning  != null ? parseFloat(def.min_warning)  : null;

    if ((maxCrit !== null && value >= maxCrit) || (minCrit !== null && value <= minCrit)) {
      alertLevel = 'critical';
      threshold  = (maxCrit !== null && value >= maxCrit) ? maxCrit : minCrit;
    } else if ((maxWarn !== null && value >= maxWarn) || (minWarn !== null && value <= minWarn)) {
      alertLevel = 'warning';
      threshold  = (maxWarn !== null && value >= maxWarn) ? maxWarn : minWarn;
    }

    // Alert esistente attivo per questo sensore
    const existRes = await db.query(
      'SELECT id, alert_level FROM sensor_alerts WHERE machine_id = $1 AND sensor_key = $2 AND is_active = true',
      [machineId, key]
    );

    if (alertLevel) {
      const message = `${def.sensor_name}: ${value} ${def.unit} (soglia ${alertLevel === 'critical' ? 'critica' : 'attenzione'}: ${threshold} ${def.unit})`;

      if (!existRes.rows.length) {
        // Nuovo alert
        await db.query(
          `INSERT INTO sensor_alerts
             (machine_id, sensor_key, sensor_name, alert_level, value, threshold, message, triggered_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [machineId, key, def.sensor_name, alertLevel, value, threshold, message, ts]
        );
        logger.warn(`MQTT ALERT [${alertLevel.toUpperCase()}] macchina ${machineId}: ${message}`);
      } else if (existRes.rows[0].alert_level !== alertLevel) {
        // Aggiorna livello se cambiato (es. da warning a critical)
        await db.query(
          `UPDATE sensor_alerts
           SET alert_level=$1, value=$2, threshold=$3, message=$4
           WHERE id=$5`,
          [alertLevel, value, threshold, message, existRes.rows[0].id]
        );
      }
    } else if (existRes.rows.length) {
      // Valore tornato normale → risolvi alert
      await db.query(
        `UPDATE sensor_alerts
         SET is_active=false, resolved_at=$1
         WHERE machine_id=$2 AND sensor_key=$3 AND is_active=true`,
        [ts, machineId, key]
      );
      logger.info(`MQTT: alert risolto per macchina ${machineId} sensore ${key}`);
    }
  }
}

// ─── Pulizia dati storici (>90 giorni) ───────────────────────────────────────
function scheduleDailyCleanup() {
  // Prima esecuzione dopo 1 minuto, poi ogni 24h
  setTimeout(runCleanup, 60 * 1000);
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
}

async function runCleanup() {
  try {
    const result = await db.query(
      `DELETE FROM sensor_readings WHERE recorded_at < NOW() - INTERVAL '90 days'`
    );
    if (result.rowCount > 0) {
      logger.info(`MQTT cleanup: eliminati ${result.rowCount} letture sensori > 90 giorni`);
    }
  } catch (err) {
    logger.error('MQTT cleanup error:', err);
  }
}

// ─── Pubblica dati (usato per test) ───────────────────────────────────────────
function publish(topic, payload, options = {}) {
  if (!client || !client.connected) {
    logger.warn('MQTT: impossibile pubblicare, client non connesso');
    return;
  }
  client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false, ...options });
}

function getClient() {
  return client;
}

module.exports = { initMqtt, publish, getClient };
