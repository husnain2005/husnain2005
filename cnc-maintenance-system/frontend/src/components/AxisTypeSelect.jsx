import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AxisTypeSelect({ value, onChange, className }) {
  const [axisTypes, setAxisTypes] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/machines/axis-types')
      .then(res => setAxisTypes(res.data.axis_types))
      .catch(() => setAxisTypes(['SINGOLA_XZ', 'DOPPIA_XZ', 'DOPPIA_CON_Y']));
  }, []);

  const formatLabel = (v) => v.replace(/_/g, ' ');

  const handleSelectChange = (e) => {
    if (e.target.value === '__nuovo__') {
      setShowNew(true);
      setNewValue('');
      setError('');
    } else {
      setShowNew(false);
      onChange(e.target.value);
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/machines/axis-types', { value: newValue.trim() });
      const { axis_types, value: addedValue, already_exists } = res.data;
      setAxisTypes(axis_types);
      onChange(addedValue);
      setShowNew(false);
      setNewValue('');
      if (already_exists) setError('Tipo già esistente, selezionato automaticamente.');
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante l\'aggiunta');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowNew(false);
    setNewValue('');
    setError('');
  };

  return (
    <div className="space-y-2">
      <select
        value={showNew ? '__nuovo__' : (value || '')}
        onChange={handleSelectChange}
        className={className}
      >
        <option value="">Seleziona tipo assi</option>
        {axisTypes.map(t => (
          <option key={t} value={t}>{formatLabel(t)}</option>
        ))}
        <option value="__nuovo__">+ Aggiungi nuovo tipo...</option>
      </select>

      {showNew && (
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={newValue}
              onChange={e => { setNewValue(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="es. Tripla XYZ"
              className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Verrà salvato come: <span className="font-mono font-semibold text-gray-600">
                {newValue.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || '...'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || !newValue.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? '...' : 'Aggiungi'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 whitespace-nowrap"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}
