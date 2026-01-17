import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { machinesApi } from '../services/api';
import { Wrench, AlertTriangle, Building2, ExternalLink } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const greenIcon = createIcon('#22c55e');
const redIcon = createIcon('#ef4444');
const blueIcon = createIcon('#3b82f6');

// Component to center map on selected location
function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 12);
    }
  }, [center, zoom, map]);

  return null;
}

function MapView() {
  const [searchParams] = useSearchParams();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const machineId = searchParams.get('machine');

  const center = lat && lng ? [lat, lng] : [45.4642, 9.1900]; // Default: Milan
  const defaultZoom = lat && lng ? 14 : 6;

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await machinesApi.getForMap();
      setMachines(response.data.machines);

      if (machineId) {
        const machine = response.data.machines.find(m => m.id === parseInt(machineId));
        if (machine) {
          setSelectedMachine(machine);
        }
      }
    } catch (error) {
      console.error('Failed to load machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerIcon = (machine) => {
    if (machine.open_issues_count > 0) return redIcon;
    return greenIcon;
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mappa Macchine</h1>
          <p className="text-sm text-gray-500">
            {machines.length} macchine geolocalizzate
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>OK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>Problemi attivi</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="loader"></div>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={defaultZoom}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController center={lat && lng ? center : null} zoom={14} />

            {machines.map(machine => (
              <Marker
                key={machine.id}
                position={[machine.latitude, machine.longitude]}
                icon={getMarkerIcon(machine)}
                eventHandlers={{
                  click: () => setSelectedMachine(machine),
                }}
              >
                <Popup maxWidth={300}>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench size={16} className="text-primary-600" />
                      <span className="font-semibold">{machine.numero_commessa}</span>
                    </div>

                    <div className="space-y-1 text-sm mb-3">
                      <p className="text-gray-600">
                        {machine.machine_type} - {machine.model_name}
                      </p>
                      {machine.customer_name && (
                        <p className="flex items-center gap-1 text-gray-600">
                          <Building2 size={12} />
                          {machine.customer_name}
                        </p>
                      )}
                      {machine.address && (
                        <p className="text-gray-500 text-xs">{machine.address}</p>
                      )}
                    </div>

                    {machine.open_issues_count > 0 && (
                      <div className="flex items-center gap-1 text-red-600 text-sm mb-3">
                        <AlertTriangle size={14} />
                        {machine.open_issues_count} problematiche aperte
                      </div>
                    )}

                    <Link
                      to={`/machines/${machine.id}`}
                      className="inline-flex items-center gap-1 text-primary-600 text-sm hover:underline"
                    >
                      Dettagli macchina
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Selected Machine Panel */}
        {selectedMachine && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg p-4 z-[1000]">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono font-semibold text-primary-600">
                  {selectedMachine.numero_commessa}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedMachine.machine_type} - {selectedMachine.model_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {selectedMachine.customer_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 size={14} />
                {selectedMachine.customer_name}
              </div>
            )}

            {selectedMachine.open_issues_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 mb-3">
                <AlertTriangle size={14} />
                {selectedMachine.open_issues_count} problematiche aperte
              </div>
            )}

            <div className="flex gap-2">
              <Link
                to={`/machines/${selectedMachine.id}`}
                className="flex-1 text-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
              >
                Dettagli
              </Link>
              <Link
                to={`/issues/new?machine_id=${selectedMachine.id}&numero_commessa=${selectedMachine.numero_commessa}`}
                className="flex-1 text-center px-3 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm hover:bg-primary-50"
              >
                Nuovo Problema
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
