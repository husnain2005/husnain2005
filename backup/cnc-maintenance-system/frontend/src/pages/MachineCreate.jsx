import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { machinesApi, customersApi } from '../services/api';
import { ArrowLeft, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import AxisTypeSelect from '../components/AxisTypeSelect';
import CustomerSelect from '../components/CustomerSelect';

function MachineCreate() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [formData, setFormData] = useState({
    numero_commessa: '',
    model_id: '',
    size_id: '',
    customer_id: '',
    axis_type: '',
    control_type: '',
    serial_number: '',
    manufacturing_year: '',
    installation_date: '',
    warranty_expiry: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.model_id) {
      loadSizes(formData.model_id);
    } else {
      setSizes([]);
      setFormData(prev => ({ ...prev, size_id: '' }));
    }
  }, [formData.model_id]);

  const loadInitialData = async () => {
    try {
      const [modelsRes, customersRes] = await Promise.all([
        machinesApi.getModels(),
        customersApi.getAll()
      ]);
      setModels(modelsRes.data.models);
      setCustomers(customersRes.data.customers);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadSizes = async (modelId) => {
    try {
      const response = await machinesApi.getSizes(modelId);
      setSizes(response.data.sizes);
    } catch (err) {
      console.error('Failed to load sizes:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const checkCompleteness = () => {
    const missing = [];
    if (!formData.model_id) missing.push('Modello');
    if (!formData.customer_id) missing.push('Cliente');
    if (!formData.control_type) missing.push('Controllo');
    if (!formData.size_id && sizes.length > 0) missing.push('Taglia');
    return missing;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotifications([]);

    try {
      // Prepare data
      const data = { ...formData };
      Object.keys(data).forEach(key => {
        if (!data[key]) delete data[key];
      });

      const response = await machinesApi.create(data);
      const newNotifications = [];

      // Success notification
      newNotifications.push({
        type: 'success',
        message: `Macchina ${formData.numero_commessa} creata con successo!`
      });

      // Check completeness
      const missing = checkCompleteness();
      if (missing.length > 0) {
        newNotifications.push({
          type: 'warning',
          message: `Dati incompleti: mancano ${missing.join(', ')}`
        });
      }

      if (newNotifications.length > 0) {
        setNotifications(newNotifications);
        setLoading(false);
        setTimeout(() => {
          navigate(`/machines/${response.data.machine.id}`);
        }, 2500);
      } else {
        navigate(`/machines/${response.data.machine.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la creazione');
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={18} />
          Indietro
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Nuova Macchina</h1>
        <p className="text-gray-500">Registra una nuova macchina CNC nel sistema</p>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {notifications.length > 0 && (
            <div className="mb-6 space-y-2">
              {notifications.map((notif, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                    notif.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}
                >
                  {notif.type === 'success' ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  {notif.message}
                </div>
              ))}
              <p className="text-sm text-gray-500 text-center">Reindirizzamento in corso...</p>
            </div>
          )}

          {/* Identification */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Identificazione</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Commessa *
                </label>
                <input
                  type="text"
                  value={formData.numero_commessa}
                  onChange={(e) => handleChange('numero_commessa', e.target.value)}
                  placeholder="es. 24_0033 o 25_0052"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modello
                </label>
                <select
                  value={formData.model_id}
                  onChange={(e) => handleChange('model_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleziona modello</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.machine_type} - {model.model_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taglia
                </label>
                <select
                  value={formData.size_id}
                  onChange={(e) => handleChange('size_id', e.target.value)}
                  disabled={!formData.model_id || sizes.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                >
                  <option value="">Seleziona taglia</option>
                  {sizes.map(size => (
                    <option key={size.id} value={size.id}>
                      {size.size_value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <CustomerSelect
                  value={formData.customer_id}
                  onChange={(v) => handleChange('customer_id', v)}
                  customers={customers}
                  onCustomerAdded={(updated) => setCustomers(updated)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Controllo
                </label>
                <select
                  value={formData.control_type}
                  onChange={(e) => handleChange('control_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleziona controllo</option>
                  <option value="FANUC">FANUC</option>
                  <option value="SINUMERIK_ONE">SINUMERIK ONE</option>
                  <option value="CSE">CSE</option>
                  <option value="FAGOR">FAGOR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Assi
                </label>
                <AxisTypeSelect
                  value={formData.axis_type}
                  onChange={(v) => handleChange('axis_type', v)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Seriale
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => handleChange('serial_number', e.target.value)}
                  placeholder="es. SN-GGT-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dates and Info */}
          <div className="mb-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Date e Informazioni</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anno di Produzione
                </label>
                <input
                  type="number"
                  value={formData.manufacturing_year}
                  onChange={(e) => handleChange('manufacturing_year', e.target.value)}
                  placeholder="es. 2024"
                  min="1990"
                  max="2030"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Installazione
                </label>
                <input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => handleChange('installation_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scadenza Garanzia
                </label>
                <input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => handleChange('warranty_expiry', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo Installazione
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Via, Città, CAP"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Note aggiuntive sulla macchina..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="loader w-4 h-4 border-2"></div>
                  Creazione...
                </>
              ) : (
                'Crea Macchina'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MachineCreate;
