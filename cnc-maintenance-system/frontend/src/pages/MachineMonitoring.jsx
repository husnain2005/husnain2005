import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft, Activity, AlertTriangle, AlertCircle,
  CheckCircle, Clock, Wifi, WifiOff, Settings, Bell,
} from 'lucide-react';
import { telemetryApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Costanti ────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 5000; // ms

const STATUS_CONFIG = {
  normal:  { label: 'Normale',     dot: 'bg-green-500',  bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700'  },
  warning: { label: 'Attenzione',  dot: 'bg-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
  critical:{ label: 'Critico',     dot: 'bg-red-500',    bg: 'bg-red-50',    border: 'border-red-300',   text: 'text-red-700'    },
  no_data: { label: 'Nessun dato', dot: 'bg-gray-300',   bg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-500'   },
};

const STATO_CONFIG = {
  RUN:   { label: 'In funzione', color: 'bg-green-500' },
  IDLE:  { label: 'Fermo',       color: 'bg-yellow-400' },
  ALARM: { label: 'Allarme',     color: 'bg-red-600' },
  OFF:   { label: 'Spento',      color: 'bg-gray-400' },
};

const TIME_RANGES = [
  { label: '1h',  hours: 1  },
  { label: '6h',  hours: 6  },
  { label: '24h', hours: 24 },
  { label: '7g',  hours: 168 },
];

// ─── Utility ─────────────────────────────────────────────────────────────────
function getSensorStatus(value, def) {
  if (value === null || value === undefined) return 'no_data';
  const v = parseFloat(value);
  if (def.max_critical != null && v >= parseFloat(def.max_critical)) return 'critical';
  if (def.min_critical != null && v <= parseFloat(def.min_critical)) return 'critical';
  if (def.max_warning  != null && v >= parseFloat(def.max_warning))  return 'warning';
  if (def.min_warning  != null && v <= parseFloat(def.min_warning))  return 'warning';
  return 'normal';
}

function getOverallStatus(sensors) {
  if (sensors.some(s => getSensorStatus(s.current_value, s) === 'critical')) return 'critical';
  if (sensors.some(s => getSensorStatus(s.current_value, s) === 'warning'))  return 'warning';
  if (sensors.some(s => s.current_value != null)) return 'normal';
  return 'no_data';
}

function formatValue(value, unit) {
  if (value === null || value === undefined) return '---';
  const v = parseFloat(value);
  const formatted = Number.isInteger(v) ? v.toString() : v.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatTime(ts) {
  if (!ts) return '';
  try { return format(new Date(ts), 'HH:mm:ss', { locale: it }); } catch { return ''; }
}

function formatDateTime(ts) {
  if (!ts) return '';
  try { return format(new Date(ts), 'dd/MM HH:mm:ss', { locale: it }); } catch { return ''; }
}

// ─── Componente SensorCard ────────────────────────────────────────────────────
function SensorCard({ sensor, onClick, selected }) {
  const status = getSensorStatus(sensor.current_value, sensor);
  const cfg = STATUS_CONFIG[status];
  const value = parseFloat(sensor.current_value);

  // Percentuale per la barra (tra min_normal e max_normal)
  let pct = 0;
  if (!isNaN(value) && sensor.max_normal != null && sensor.min_normal != null) {
    const range = parseFloat(sensor.max_normal) - parseFloat(sensor.min_normal);
    pct = range > 0 ? Math.min(100, Math.max(0, ((value - parseFloat(sensor.min_normal)) / range) * 100)) : 0;
  }

  const barColor = status === 'critical' ? 'bg-red-500'
                 : status === 'warning'  ? 'bg-yellow-400'
                 : 'bg-green-500';

  return (
    <button
      onClick={() => onClick(sensor.sensor_key)}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all hover:shadow-md
        ${selected ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : cfg.border + ' ' + cfg.bg}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {sensor.sensor_name}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-${status === 'critical' ? 'pulse' : 'none'}`} />
          {cfg.label}
        </span>
      </div>

      <div className={`text-2xl font-bold mb-2 ${cfg.text}`}>
        {sensor.current_value != null
          ? formatValue(sensor.current_value, sensor.unit)
          : <span className="text-gray-400 text-lg">Nessun dato</span>
        }
      </div>

      {sensor.max_normal != null && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{sensor.min_normal ?? 0} {sensor.unit}</span>
            <span>{sensor.max_normal} {sensor.unit}</span>
          </div>
        </div>
      )}

      {sensor.last_reading_at && (
        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
          <Clock size={10} />
          {formatTime(sensor.last_reading_at)}
        </div>
      )}
    </button>
  );
}

// ─── Componente AlertBadge ────────────────────────────────────────────────────
function AlertBanner({ alerts, onAcknowledge }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`flex items-start justify-between rounded-lg border p-3 gap-3
            ${alert.alert_level === 'critical'
              ? 'bg-red-50 border-red-300'
              : 'bg-yellow-50 border-yellow-300'}`}
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {alert.alert_level === 'critical'
              ? <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
              : <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            }
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${alert.alert_level === 'critical' ? 'text-red-800' : 'text-yellow-800'}`}>
                {alert.message}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDateTime(alert.triggered_at)}
                {alert.acknowledged_by_name && ` · Preso in carico: ${alert.acknowledged_by_name}`}
              </p>
            </div>
          </div>
          {!alert.acknowledged_by && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="text-xs font-medium px-2.5 py-1 rounded bg-white border border-gray-300 hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
            >
              Prendi in carico
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tooltip personalizzato per Recharts ─────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-800">
        {parseFloat(payload[0].value).toFixed(2)} {unit}
      </p>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function MachineMonitoring() {
  const { id } = useParams();
  const { user } = useAuth();
  const isTecnico = user?.role === 'admin' || user?.role === 'tecnico';

  const [machine,   setMachine]   = useState(null);
  const [sensors,   setSensors]   = useState([]);
  const [stato,     setStato]     = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [history,   setHistory]   = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [timeRange, setTimeRange] = useState(1);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [online,    setOnline]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const pollRef = useRef(null);

  // ─── Carica dati macchina una volta sola ──────────────────────────────────
  useEffect(() => {
    machinesApi.getById(id).then(res => setMachine(res.data)).catch(() => {});
  }, [id]);

  // ─── Polling dati live ────────────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    try {
      const res = await telemetryApi.getLatest(id);
      setSensors(res.data.sensors || []);
      setStato(res.data.stato);
      setOnline(true);

      if (res.data.sensors?.length > 0 && !selectedSensor) {
        setSelectedSensor(res.data.sensors[0].sensor_key);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch {
      setOnline(false);
      setLoading(false);
    }
  }, [id, selectedSensor]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await telemetryApi.getAlerts(id);
      setAlerts(res.data.alerts || []);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchLatest();
    fetchAlerts();

    pollRef.current = setInterval(() => {
      fetchLatest();
      fetchAlerts();
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [fetchLatest, fetchAlerts]);

  // ─── Storico per grafico ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSensor) return;
    telemetryApi.getHistory(id, selectedSensor, timeRange)
      .then(res => {
        const readings = (res.data.readings || []).map(r => ({
          time:  formatTime(r.recorded_at),
          value: parseFloat(r.value),
        }));
        setHistory(readings);
      })
      .catch(() => setHistory([]));
  }, [id, selectedSensor, timeRange]);

  // ─── Azioni ───────────────────────────────────────────────────────────────
  async function handleAcknowledge(alertId) {
    try {
      await telemetryApi.acknowledgeAlert(id, alertId);
      fetchAlerts();
    } catch {}
  }

  // ─── Stato generale ───────────────────────────────────────────────────────
  const overallStatus = getOverallStatus(sensors);
  const overallCfg    = STATUS_CONFIG[overallStatus];
  const selectedDef   = sensors.find(s => s.sensor_key === selectedSensor);
  const statoInfo     = stato ? (STATO_CONFIG[stato.value_text] || { label: stato.value_text, color: 'bg-gray-400' }) : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to={`/machines/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              Monitoraggio — {machine?.numero_commessa || `Macchina ${id}`}
            </h1>
            {machine && (
              <p className="text-sm text-gray-500">
                {machine.model_name} · {machine.customer_name || 'Cliente non assegnato'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stato ON/OFF macchina */}
          {statoInfo && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
              <span className={`w-2.5 h-2.5 rounded-full ${statoInfo.color}`} />
              {statoInfo.label}
            </span>
          )}

          {/* Live indicator */}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            ${online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {online
              ? <><Wifi size={14} /><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span> LIVE</>
              : <><WifiOff size={14} /> Offline</>
            }
          </span>

          {lastUpdate && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Aggiornato: {formatTime(lastUpdate)}
            </span>
          )}

          {isTecnico && (
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${showSettings ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}`}
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Stato generale */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${overallCfg.border} ${overallCfg.bg}`}>
        {overallStatus === 'critical' ? <AlertCircle size={24} className="text-red-600" /> :
         overallStatus === 'warning'  ? <AlertTriangle size={24} className="text-yellow-600" /> :
         overallStatus === 'normal'   ? <CheckCircle size={24} className="text-green-600" /> :
                                        <Activity size={24} className="text-gray-400" />}
        <div>
          <p className={`font-bold text-lg ${overallCfg.text}`}>
            Stato generale: {overallCfg.label}
          </p>
          {sensors.length > 0 && (
            <p className="text-sm text-gray-500">
              {sensors.filter(s => getSensorStatus(s.current_value, s) === 'critical').length} critici ·{' '}
              {sensors.filter(s => getSensorStatus(s.current_value, s) === 'warning').length} in attenzione ·{' '}
              {sensors.filter(s => getSensorStatus(s.current_value, s) === 'normal').length} normali
            </p>
          )}
        </div>
        {alerts.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full animate-pulse">
            <Bell size={14} />
            {alerts.length} alert
          </span>
        )}
      </div>

      {/* Alert attivi */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} onAcknowledge={handleAcknowledge} />
      )}

      {/* Nessun dato */}
      {sensors.length === 0 && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nessun dato telemetrico ricevuto</p>
          <p className="text-sm mt-1">
            Il PLC deve pubblicare sul topic:{' '}
            <code className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              cnc/machines/{machine?.numero_commessa || '{numero_commessa}'}/telemetry
            </code>
          </p>
        </div>
      )}

      {/* Griglia sensori */}
      {sensors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sensors.map(sensor => (
            <SensorCard
              key={sensor.sensor_key}
              sensor={sensor}
              onClick={setSelectedSensor}
              selected={selectedSensor === sensor.sensor_key}
            />
          ))}
        </div>
      )}

      {/* Grafico storico */}
      {sensors.length > 0 && selectedDef && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-800">
                Storico — {selectedDef.sensor_name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {history.length} letture
              </p>
            </div>

            {/* Selector sensore */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedSensor}
                onChange={e => setSelectedSensor(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {sensors.map(s => (
                  <option key={s.sensor_key} value={s.sensor_key}>{s.sensor_name}</option>
                ))}
              </select>

              {/* Time range */}
              <div className="flex gap-1">
                {TIME_RANGES.map(({ label, hours }) => (
                  <button
                    key={hours}
                    onClick={() => setTimeRange(hours)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                      ${timeRange === hours
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Nessun dato nel periodo selezionato
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}`}
                  unit={selectedDef.unit ? ` ${selectedDef.unit}` : ''}
                />
                <Tooltip content={<CustomTooltip unit={selectedDef.unit} />} />

                {/* Linee di soglia */}
                {selectedDef.max_warning != null && (
                  <ReferenceLine y={parseFloat(selectedDef.max_warning)} stroke="#f59e0b" strokeDasharray="4 4"
                    label={{ value: 'Attenzione', fontSize: 10, fill: '#f59e0b', position: 'insideTopRight' }} />
                )}
                {selectedDef.max_critical != null && (
                  <ReferenceLine y={parseFloat(selectedDef.max_critical)} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: 'Critico', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
                )}
                {selectedDef.min_warning != null && (
                  <ReferenceLine y={parseFloat(selectedDef.min_warning)} stroke="#f59e0b" strokeDasharray="4 4" />
                )}
                {selectedDef.min_critical != null && (
                  <ReferenceLine y={parseFloat(selectedDef.min_critical)} stroke="#ef4444" strokeDasharray="4 4" />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Pannello impostazioni soglie */}
      {showSettings && isTecnico && sensors.length > 0 && (
        <ThresholdSettings
          machineId={id}
          sensors={sensors}
          onSaved={fetchLatest}
        />
      )}
    </div>
  );
}

// ─── Pannello impostazioni soglie ─────────────────────────────────────────────
function ThresholdSettings({ machineId, sensors, onSaved }) {
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    const initial = {};
    sensors.forEach(s => {
      initial[s.id] = {
        min_warning:  s.min_warning  ?? '',
        max_warning:  s.max_warning  ?? '',
        min_critical: s.min_critical ?? '',
        max_critical: s.max_critical ?? '',
      };
    });
    setEditData(initial);
  }, [sensors]);

  async function handleSave(sensor) {
    setSaving(sensor.id);
    try {
      const d = editData[sensor.id];
      await telemetryApi.updateSensor(machineId, sensor.id, {
        sensor_name:  sensor.sensor_name,
        unit:         sensor.unit,
        min_normal:   sensor.min_normal,
        max_normal:   sensor.max_normal,
        min_warning:  d.min_warning  !== '' ? parseFloat(d.min_warning)  : null,
        max_warning:  d.max_warning  !== '' ? parseFloat(d.max_warning)  : null,
        min_critical: d.min_critical !== '' ? parseFloat(d.min_critical) : null,
        max_critical: d.max_critical !== '' ? parseFloat(d.max_critical) : null,
      });
      setSaved(sensor.id);
      setTimeout(() => setSaved(null), 2000);
      onSaved();
    } catch {}
    setSaving(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Settings size={18} className="text-blue-600" />
        Impostazioni soglie allarme
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">Sensore</th>
              <th className="text-center py-2 px-2 text-yellow-600 font-medium">Min attenzione</th>
              <th className="text-center py-2 px-2 text-yellow-600 font-medium">Max attenzione</th>
              <th className="text-center py-2 px-2 text-red-600 font-medium">Min critico</th>
              <th className="text-center py-2 px-2 text-red-600 font-medium">Max critico</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {sensors.map(sensor => {
              const d = editData[sensor.id] || {};
              return (
                <tr key={sensor.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    <span className="font-medium text-gray-800">{sensor.sensor_name}</span>
                    <span className="text-gray-400 ml-1">({sensor.unit})</span>
                  </td>
                  {['min_warning','max_warning','min_critical','max_critical'].map(field => (
                    <td key={field} className="py-2 px-2">
                      <input
                        type="number"
                        value={d[field] ?? ''}
                        onChange={e => setEditData(prev => ({
                          ...prev,
                          [sensor.id]: { ...prev[sensor.id], [field]: e.target.value }
                        }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleSave(sensor)}
                      disabled={saving === sensor.id}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                        ${saved === sensor.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
                    >
                      {saved === sensor.id ? '✓ Salvato' : saving === sensor.id ? '...' : 'Salva'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
