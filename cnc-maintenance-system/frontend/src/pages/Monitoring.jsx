import React, { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { machinesApi } from '../services/api';
import {
  Wifi, WifiOff, Activity, Thermometer, Zap, Gauge,
  Droplets, Wind, RefreshCw, Circle
} from 'lucide-react';

// URL broker MQTT (WebSocket)
const MQTT_URL = `ws://${window.location.hostname}:9001`;

// Struttura dati sensori attesi per macchina
const SENSOR_CONFIG = [
  { key: 'status',       label: 'Stato',        unit: '',     icon: Circle,      color: 'text-gray-500' },
  { key: 'temperature',  label: 'Temperatura',  unit: '°C',   icon: Thermometer, color: 'text-orange-500' },
  { key: 'humidity',     label: 'Umidità',      unit: '%',    icon: Droplets,    color: 'text-blue-500' },
  { key: 'vibration',    label: 'Vibrazione',   unit: 'mm/s', icon: Activity,    color: 'text-purple-500' },
  { key: 'current',      label: 'Corrente',     unit: 'A',    icon: Zap,         color: 'text-yellow-500' },
  { key: 'voltage',      label: 'Tensione',     unit: 'V',    icon: Zap,         color: 'text-indigo-500' },
  { key: 'motor_torque', label: 'Coppia Motore',unit: 'Nm',   icon: Gauge,       color: 'text-red-500' },
  { key: 'motor_speed',  label: 'Velocità',     unit: 'rpm',  icon: Wind,        color: 'text-teal-500' },
];

// Badge stato macchina
function StatusBadge({ status }) {
  if (status === 'on' || status === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        ON
      </span>
    );
  }
  if (status === 'off' || status === 'stopped') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        OFF
      </span>
    );
  }
  if (status === 'alarm' || status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        ALLARME
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      N/D
    </span>
  );
}

// Card singola macchina
function MachineCard({ machine, sensorData, lastUpdate }) {
  const data = sensorData || {};
  const status = data.status || null;

  const sensorsToShow = SENSOR_CONFIG.filter(s => s.key !== 'status');

  return (
    <div className={`bg-white rounded-xl shadow border-2 transition-all ${
      status === 'on' || status === 'running' ? 'border-green-200' :
      status === 'off' || status === 'stopped' ? 'border-red-200' :
      status === 'alarm' ? 'border-yellow-300' :
      'border-gray-100'
    }`}>
      {/* Header macchina */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">
            {machine.serial_number || `Macchina #${machine.id}`}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {machine.machine_type} {machine.model_name ? `— ${machine.model_name}` : ''}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Griglia sensori */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {sensorsToShow.map(sensor => {
          const val = data[sensor.key];
          const Icon = sensor.icon;
          return (
            <div key={sensor.key} className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg bg-gray-50 ${sensor.color}`}>
                <Icon size={14} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{sensor.label}</p>
                <p className="text-sm font-semibold text-gray-700">
                  {val !== undefined && val !== null
                    ? `${typeof val === 'number' ? val.toFixed(1) : val}${sensor.unit}`
                    : <span className="text-gray-300">—</span>
                  }
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer aggiornamento */}
      {lastUpdate && (
        <div className="px-4 pb-3 text-xs text-gray-400 text-right">
          Aggiornato: {new Date(lastUpdate).toLocaleTimeString('it-IT')}
        </div>
      )}
    </div>
  );
}

export default function Monitoring() {
  const [machines, setMachines] = useState([]);
  const [sensorData, setSensorData] = useState({}); // { machine_id: { status, temperature, ... } }
  const [lastUpdate, setLastUpdate] = useState({}); // { machine_id: timestamp }
  const [mqttStatus, setMqttStatus] = useState('connecting'); // connecting | connected | disconnected | error
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [rawMessages, setRawMessages] = useState([]); // ultimi messaggi ricevuti (debug)
  const clientRef = useRef(null);

  // Carica macchine dal DB
  useEffect(() => {
    machinesApi.getAll({ limit: 200 }).then(res => {
      setMachines(res.data.machines || []);
    }).catch(() => {}).finally(() => setLoadingMachines(false));
  }, []);

  // Connessione MQTT
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
    }

    setMqttStatus('connecting');

    const client = mqtt.connect(MQTT_URL, {
      clientId: `gestionale_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    client.on('connect', () => {
      setMqttStatus('connected');
      // Sottoscrivi a tutti i topic delle macchine
      client.subscribe('cnc/machines/#', { qos: 0 });
    });

    client.on('message', (topic, payload) => {
      try {
        const msg = payload.toString();
        // Topic atteso: cnc/machines/{machine_id} o cnc/machines/{machine_id}/{sensore}
        const parts = topic.split('/');
        if (parts.length < 3) return;

        const machineId = parts[2];
        let data = {};

        // Prova a fare il parse del JSON
        try {
          data = JSON.parse(msg);
        } catch {
          // Se non è JSON, gestisci come valore singolo
          const sensorKey = parts[3] || 'status';
          data = { [sensorKey]: isNaN(msg) ? msg : parseFloat(msg) };
        }

        setSensorData(prev => ({
          ...prev,
          [machineId]: { ...(prev[machineId] || {}), ...data }
        }));
        setLastUpdate(prev => ({ ...prev, [machineId]: Date.now() }));

        // Log messaggi (ultimi 10)
        setRawMessages(prev => [
          { topic, payload: msg, time: new Date().toLocaleTimeString('it-IT') },
          ...prev.slice(0, 9)
        ]);
      } catch (e) {
        console.error('MQTT message error:', e);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
      setMqttStatus('error');
    });

    client.on('offline', () => setMqttStatus('disconnected'));
    client.on('reconnect', () => setMqttStatus('connecting'));
    client.on('close', () => setMqttStatus('disconnected'));

    clientRef.current = client;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) clientRef.current.end(true);
    };
  }, [connect]);

  const statusColor = {
    connected: 'text-green-600 bg-green-50',
    connecting: 'text-yellow-600 bg-yellow-50',
    disconnected: 'text-red-600 bg-red-50',
    error: 'text-red-600 bg-red-50',
  }[mqttStatus];

  const statusLabel = {
    connected: 'Connesso',
    connecting: 'Connessione...',
    disconnected: 'Disconnesso',
    error: 'Errore',
  }[mqttStatus];

  const machinesOn = machines.filter(m => {
    const s = sensorData[m.id]?.status;
    return s === 'on' || s === 'running';
  }).length;
  const machinesOff = machines.filter(m => {
    const s = sensorData[m.id]?.status;
    return s === 'off' || s === 'stopped';
  }).length;
  const machinesAlarm = machines.filter(m => {
    const s = sensorData[m.id]?.status;
    return s === 'alarm' || s === 'error';
  }).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoraggio Real-Time</h1>
          <p className="text-sm text-gray-500 mt-1">
            Broker: <code className="bg-gray-100 px-1 rounded text-xs">{MQTT_URL}</code>
            &nbsp;· Topic: <code className="bg-gray-100 px-1 rounded text-xs">cnc/machines/#</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stato connessione */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${statusColor}`}>
            {mqttStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
            {statusLabel}
          </div>
          {/* Riconnetti manuale */}
          <button
            onClick={connect}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
          >
            <RefreshCw size={15} />
            Riconnetti
          </button>
        </div>
      </div>

      {/* Statistiche rapide */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{machinesOn}</p>
          <p className="text-sm text-green-700">Macchine ON</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{machinesOff}</p>
          <p className="text-sm text-red-700">Macchine OFF</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{machinesAlarm}</p>
          <p className="text-sm text-yellow-700">Allarmi</p>
        </div>
      </div>

      {/* Griglia macchine */}
      {loadingMachines ? (
        <div className="flex justify-center py-12">
          <div className="loader" />
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nessuna macchina trovata</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {machines.map(machine => (
            <MachineCard
              key={machine.id}
              machine={machine}
              sensorData={sensorData[machine.id]}
              lastUpdate={lastUpdate[machine.id]}
            />
          ))}
        </div>
      )}

      {/* Log messaggi MQTT ricevuti */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Activity size={14} />
          Ultimi messaggi MQTT ricevuti
        </h2>
        {rawMessages.length === 0 ? (
          <p className="text-gray-500 text-xs italic">In attesa di messaggi dal broker...</p>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {rawMessages.map((m, i) => (
              <div key={i} className="flex gap-3 text-gray-300">
                <span className="text-gray-500 shrink-0">{m.time}</span>
                <span className="text-green-400 shrink-0">{m.topic}</span>
                <span className="text-gray-200 truncate">{m.payload}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guida topic */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Formato messaggi atteso dal PLCnext:</p>
        <div className="font-mono text-xs space-y-1">
          <p><span className="text-blue-600">Topic:</span> cnc/machines/<span className="text-orange-600">{'{machine_id}'}</span></p>
          <p><span className="text-blue-600">Payload JSON:</span> {`{"status":"on","temperature":45.2,"humidity":60,"vibration":1.2,"current":12.5,"voltage":380,"motor_torque":85,"motor_speed":1500}`}</p>
          <p className="mt-2 text-blue-600">Oppure topic separati per sensore:</p>
          <p><span className="text-blue-600">Topic:</span> cnc/machines/<span className="text-orange-600">{'{machine_id}'}</span>/temperature &nbsp;→&nbsp; <span className="text-blue-600">Payload:</span> 45.2</p>
        </div>
      </div>
    </div>
  );
}
