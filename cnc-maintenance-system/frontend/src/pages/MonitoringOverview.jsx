import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Wifi, WifiOff, AlertCircle, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { machinesApi, telemetryApi } from '../services/api';

const STATUS_CONFIG = {
  critical: { label: 'Critico',     bg: 'bg-red-50',    border: 'border-red-300',    dot: 'bg-red-500',    text: 'text-red-700'    },
  warning:  { label: 'Attenzione',  bg: 'bg-yellow-50', border: 'border-yellow-300', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  normal:   { label: 'Normale',     bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500',  text: 'text-green-700'  },
  no_data:  { label: 'Nessun dato', bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-300',   text: 'text-gray-500'   },
};

function getMachineStatus(sensors) {
  if (!sensors || sensors.length === 0) return 'no_data';
  const hasValue = sensors.some(s => s.current_value !== null);
  if (!hasValue) return 'no_data';
  const hasCritical = sensors.some(s => {
    const v = parseFloat(s.current_value);
    return (s.max_critical && v >= parseFloat(s.max_critical)) || (s.min_critical && v <= parseFloat(s.min_critical));
  });
  if (hasCritical) return 'critical';
  const hasWarning = sensors.some(s => {
    const v = parseFloat(s.current_value);
    return (s.max_warning && v >= parseFloat(s.max_warning)) || (s.min_warning && v <= parseFloat(s.min_warning));
  });
  if (hasWarning) return 'warning';
  return 'normal';
}

function MachineCard({ machine, telemetry, loading }) {
  const sensors = telemetry?.sensors || [];
  const stato = telemetry?.stato;
  const status = getMachineStatus(sensors);
  const cfg = STATUS_CONFIG[status];
  const hasData = sensors.some(s => s.current_value !== null);

  const STATO_COLOR = { RUN: 'bg-green-500', IDLE: 'bg-yellow-400', ALARM: 'bg-red-600', OFF: 'bg-gray-400' };
  const STATO_LABEL = { RUN: 'In funzione', IDLE: 'Fermo', ALARM: 'Allarme', OFF: 'Spento' };

  return (
    <Link
      to={`/machines/${machine.id}/monitoring`}
      className={`block rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-base truncate">{machine.numero_commessa}</h3>
          <p className="text-sm text-gray-500 truncate">{machine.customer_name || 'Cliente non assegnato'}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Modello */}
      <p className="text-xs text-gray-400 mb-3">{machine.model_name || '—'}</p>

      {/* Stato PLC */}
      {stato && stato.value_text && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full ${STATO_COLOR[stato.value_text] || 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700">{STATO_LABEL[stato.value_text] || stato.value_text}</span>
        </div>
      )}

      {/* Sensori riassunto */}
      {loading ? (
        <div className="flex gap-1.5 flex-wrap">
          {[1,2,3].map(i => <div key={i} className="h-6 w-16 bg-gray-200 rounded animate-pulse" />)}
        </div>
      ) : hasData ? (
        <div className="flex gap-1.5 flex-wrap">
          {sensors.slice(0, 4).map(s => {
            const v = s.current_value !== null ? parseFloat(s.current_value).toFixed(1) : '—';
            return (
              <span key={s.sensor_key} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                {v} {s.unit}
              </span>
            );
          })}
          {sensors.length > 4 && (
            <span className="text-xs text-gray-400">+{sensors.length - 4} altro</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <WifiOff size={12} />
          <span>In attesa dati PLC</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
        <span>{machine.customer_city || ''}</span>
        <span className="text-blue-600 font-medium">Apri dashboard →</span>
      </div>
    </Link>
  );
}

export default function MonitoringOverview() {
  const [machines, setMachines] = useState([]);
  const [telemetry, setTelemetry] = useState({});
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    machinesApi.getAll({ limit: 100 })
      .then(res => {
        const list = res.data.machines || res.data || [];
        setMachines(list);
        setLoadingMachines(false);
        list.forEach(m => fetchTelemetry(m.id));
      })
      .catch(() => setLoadingMachines(false));
  }, []);

  const fetchTelemetry = async (machineId) => {
    setLoadingTelemetry(prev => ({ ...prev, [machineId]: true }));
    try {
      const res = await telemetryApi.getLatest(machineId);
      setTelemetry(prev => ({ ...prev, [machineId]: res.data }));
    } catch {
      setTelemetry(prev => ({ ...prev, [machineId]: null }));
    } finally {
      setLoadingTelemetry(prev => ({ ...prev, [machineId]: false }));
    }
  };

  // Polling ogni 10 secondi
  useEffect(() => {
    if (machines.length === 0) return;
    pollRef.current = setInterval(() => {
      machines.forEach(m => fetchTelemetry(m.id));
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(pollRef.current);
  }, [machines]);

  const statusCounts = machines.reduce((acc, m) => {
    const s = getMachineStatus(telemetry[m.id]?.sensors || []);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity size={24} className="text-blue-600" />
            Monitoraggio Macchine
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Seleziona una macchina per aprire la dashboard completa
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Aggiornato: {lastUpdate.toLocaleTimeString('it-IT')}
            </span>
          )}
          <button
            onClick={() => { machines.forEach(m => fetchTelemetry(m.id)); setLastUpdate(new Date()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Aggiorna
          </button>
        </div>
      </div>

      {/* Riepilogo stato */}
      {!loadingMachines && machines.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'critical', icon: AlertCircle,   color: 'text-red-600',    bg: 'bg-red-50',    label: 'Critici'     },
            { key: 'warning',  icon: AlertTriangle,  color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Attenzione'  },
            { key: 'normal',   icon: CheckCircle,    color: 'text-green-600',  bg: 'bg-green-50',  label: 'Normali'     },
            { key: 'no_data',  icon: WifiOff,        color: 'text-gray-400',   bg: 'bg-gray-50',   label: 'Offline'     },
          ].map(({ key, icon: Icon, color, bg, label }) => (
            <div key={key} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
              <Icon size={22} className={color} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista macchine */}
      {loadingMachines ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nessuna macchina trovata</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map(m => (
            <MachineCard
              key={m.id}
              machine={m}
              telemetry={telemetry[m.id]}
              loading={loadingTelemetry[m.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
