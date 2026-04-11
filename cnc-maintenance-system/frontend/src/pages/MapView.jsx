import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { machinesApi, customersApi } from '../services/api';
import { Wrench, AlertTriangle, Building2, ExternalLink, Search, X } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createPinIcon = (color, letter) => new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:32px;height:38px;">
    <div style="width:32px;height:32px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:700;line-height:1;">${letter}</span>
    </div>
  </div>`,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -40],
});

const iconMachineOk    = createPinIcon('#22c55e', '⚙');
const iconMachineIssue = createPinIcon('#ef4444', '⚙');
const iconCustOnly     = createPinIcon('#3b82f6', 'C');
const iconCustMachine  = createPinIcon('#8b5cf6', 'C');
const iconCustIssue    = createPinIcon('#f97316', 'C');

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom || 12); }, [center, zoom, map]);
  return null;
}

function MapView() {
  const [searchParams] = useSearchParams();
  const [machines, setMachines]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [layer, setLayer]           = useState('all');
  const [selected, setSelected]     = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const mapRef = useRef(null);

  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const machineId = searchParams.get('machine');
  const center      = lat && lng ? [lat, lng] : [44.0, 11.0];
  const defaultZoom = lat && lng ? 14 : 6;

  useEffect(() => {
    Promise.all([
      machinesApi.getForMap().catch(() => ({ data: { machines: [] } })),
      customersApi.getForMap().catch(() => ({ data: { customers: [] } })),
    ]).then(([mRes, cRes]) => {
      const ms = mRes.data.machines || [];
      const cs = cRes.data.customers || [];
      setMachines(ms);
      setCustomers(cs);
      if (machineId) {
        const m = ms.find(m => m.id === parseInt(machineId));
        if (m) { setSelected(m); setSelectedType('machine'); }
      }
    }).finally(() => setLoading(false));
  }, []);

  const showMachines  = layer === 'all' || layer === 'machines';
  const showCustomers = layer === 'all' || layer === 'customers';
  const visMachines   = showMachines  ? machines.filter(m => m.latitude && m.longitude)  : [];
  const visCust       = showCustomers ? customers.filter(c => c.latitude && c.longitude) : [];

  const q = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    const results = [];
    machines.forEach(m => {
      if (
        (m.numero_commessa || '').toLowerCase().includes(q) ||
        (m.machine_type || '').toLowerCase().includes(q) ||
        (m.model_name || '').toLowerCase().includes(q) ||
        (m.customer_name || '').toLowerCase().includes(q) ||
        (m.serial_number || '').toLowerCase().includes(q)
      ) {
        results.push({ ...m, _type: 'machine' });
      }
    });
    customers.forEach(c => {
      if (
        (c.name || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      ) {
        results.push({ ...c, _type: 'customer' });
      }
    });
    return results.slice(0, 8);
  }, [q, machines, customers]);

  const handleSelectResult = (item) => {
    setSelected(item);
    setSelectedType(item._type);
    setSearchQuery('');
    setSearchFocused(false);
    if (item.latitude && item.longitude && mapRef.current) {
      mapRef.current.setView([item.latitude, item.longitude], 14);
    }
  };

  const getMachineIcon  = (m) => m.open_issues_count > 0 ? iconMachineIssue : iconMachineOk;
  const getCustomerIcon = (c) => {
    if (c.open_issues_count > 0) return iconCustIssue;
    if (c.machines_count > 0)    return iconCustMachine;
    return iconCustOnly;
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mappa</h1>
          <p className="text-xs text-gray-500">{visMachines.length} macchine · {visCust.length} clienti</p>
        </div>

        {/* Barra di ricerca */}
        <div className="relative" ref={searchRef}>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-64 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cerca cliente, macchina, città..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown risultati */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[2000] overflow-hidden">
              {searchResults.map((item, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSelectResult(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                >
                  {item._type === 'machine' ? (
                    <div className="p-1.5 bg-primary-100 rounded-lg shrink-0">
                      <Wrench size={13} className="text-primary-600" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                      <Building2 size={13} className="text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item._type === 'machine' ? item.numero_commessa : item.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item._type === 'machine'
                        ? `${item.machine_type || ''} ${item.model_name || ''} · ${item.customer_name || ''}`
                        : `${item.city || ''} ${item.address || ''}`}
                    </p>
                  </div>
                  {!item.latitude && (
                    <span className="text-xs text-gray-300 shrink-0">no GPS</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Nessun risultato */}
          {searchFocused && q && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[2000] px-4 py-3 text-sm text-gray-400">
              Nessun risultato per "<strong>{q}</strong>"
            </div>
          )}
        </div>

        {/* Toggle layer */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          {[['all','Tutto'],['machines','Macchine'],['customers','Clienti']].map(([k,l]) => (
            <button key={k} onClick={() => setLayer(k)}
              className={`px-3 py-1.5 transition-colors ${layer===k ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {showMachines && <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Macchina OK</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>Macchina con problemi</span>
          </>}
          {showCustomers && <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/>Cliente (no macchine)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/>Cliente con macchine</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"/>Cliente con problemi</span>
          </>}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="loader"/>
          </div>
        ) : (
          <MapContainer center={center} zoom={defaultZoom} className="h-full w-full" scrollWheelZoom ref={mapRef}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={lat && lng ? center : null} zoom={14}/>

            {visMachines.map(m => (
              <Marker key={`m-${m.id}`} position={[m.latitude, m.longitude]} icon={getMachineIcon(m)}
                eventHandlers={{ click: () => { setSelected(m); setSelectedType('machine'); } }}>
                <Popup maxWidth={280}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-primary-700"><Wrench size={14}/>{m.numero_commessa}</div>
                    <p className="text-sm text-gray-600">{m.machine_type} – {m.model_name}</p>
                    {m.customer_name && <p className="text-sm text-gray-500 flex items-center gap-1"><Building2 size={12}/>{m.customer_name}</p>}
                    {m.address && <p className="text-xs text-gray-400">{m.address}</p>}
                    {m.open_issues_count > 0 && <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle size={12}/>{m.open_issues_count} problematiche aperte</p>}
                    <Link to={`/machines/${m.id}`} className="inline-flex items-center gap-1 text-primary-600 text-sm hover:underline"><ExternalLink size={11}/>Dettagli macchina</Link>
                  </div>
                </Popup>
              </Marker>
            ))}

            {visCust.map(c => (
              <Marker key={`c-${c.id}`} position={[c.latitude, c.longitude]} icon={getCustomerIcon(c)}
                eventHandlers={{ click: () => { setSelected(c); setSelectedType('customer'); } }}>
                <Popup maxWidth={280}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-blue-700"><Building2 size={14}/>{c.name}</div>
                    <p className="text-sm text-gray-500">{[c.city, c.country].filter(Boolean).join(', ')}</p>
                    {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                    <p className="text-sm text-gray-600">{c.machines_count} macchine · {c.open_issues_count} problemi aperti</p>
                    {c.phone && <p className="text-xs text-gray-500">📞 {c.phone}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Pannello dettaglio */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg p-4 z-[1000]">
            <div className="flex items-start justify-between mb-2">
              <div>
                {selectedType === 'machine' ? (
                  <><p className="font-mono font-semibold text-primary-600">{selected.numero_commessa}</p>
                  <p className="text-sm text-gray-500">{selected.machine_type} – {selected.model_name}</p></>
                ) : (
                  <><p className="font-semibold text-blue-700">{selected.name}</p>
                  <p className="text-sm text-gray-500">{[selected.city, selected.country].filter(Boolean).join(', ')}</p></>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {selectedType === 'machine' && selected.customer_name && (
              <p className="text-sm text-gray-600 flex items-center gap-1 mb-1"><Building2 size={14}/>{selected.customer_name}</p>
            )}
            {selectedType === 'customer' && (
              <p className="text-sm text-gray-600 mb-1">{selected.machines_count} macchine associate</p>
            )}
            {selected.open_issues_count > 0 && (
              <p className="text-sm text-red-600 flex items-center gap-1 mb-2"><AlertTriangle size={14}/>{selected.open_issues_count} problematiche aperte</p>
            )}

            <div className="flex gap-2 mt-3">
              {selectedType === 'machine' ? (
                <>
                  <Link to={`/machines/${selected.id}`} className="flex-1 text-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Dettagli</Link>
                  <Link to={`/issues/new?machine_id=${selected.id}`} className="flex-1 text-center px-3 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm hover:bg-primary-50">Nuovo Problema</Link>
                </>
              ) : (
                <Link to="/customers" className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Vedi Clienti</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
