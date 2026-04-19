import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { machinesApi, customersApi } from '../services/api';
import AxisTypeSelect from '../components/AxisTypeSelect';
import CustomerSelect from '../components/CustomerSelect';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Wrench,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Plus,
  ChevronRight,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTecnico = user?.role === 'admin' || user?.role === 'tecnico';

  const [machine, setMachine] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Data for dropdowns
  const [models, setModels] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Form data for editing
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadMachine();
    loadDropdownData();
  }, [id]);

  useEffect(() => {
    if (formData.model_id) {
      loadSizes(formData.model_id);
    } else {
      setSizes([]);
    }
  }, [formData.model_id]);

  const loadMachine = async () => {
    try {
      const response = await machinesApi.getById(id);
      setMachine(response.data.machine);
      setIssues(response.data.issues);
      setFormData({
        numero_commessa: response.data.machine.numero_commessa || '',
        model_id: response.data.machine.model_id || '',
        size_id: response.data.machine.size_id || '',
        customer_id: response.data.machine.customer_id || '',
        axis_type: response.data.machine.axis_type || '',
        control_type: response.data.machine.control_type || '',
        serial_number: response.data.machine.serial_number || '',
        manufacturing_year: response.data.machine.manufacturing_year || '',
        installation_date: response.data.machine.installation_date?.split('T')[0] || '',
        warranty_expiry: response.data.machine.warranty_expiry?.split('T')[0] || '',
        address: response.data.machine.address || '',
        notes: response.data.machine.notes || '',
      });
    } catch (err) {
      setError('Macchina non trovata');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [modelsRes, customersRes] = await Promise.all([
        machinesApi.getModels(),
        customersApi.getAll()
      ]);
      setModels(modelsRes.data.models);
      setCustomers(customersRes.data.customers);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
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
    return missing;
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);

    try {
      const data = { ...formData };
      Object.keys(data).forEach(key => {
        if (!data[key]) delete data[key];
      });

      await machinesApi.update(id, data);

      // Check completeness
      const missing = checkCompleteness();
      if (missing.length > 0) {
        setNotification({
          type: 'warning',
          message: `Macchina aggiornata. Dati ancora mancanti: ${missing.join(', ')}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Macchina aggiornata con successo! Tutti i dati sono completi.'
        });
      }

      // Reload machine data
      await loadMachine();
      setEditMode(false);

      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);

    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Errore durante il salvataggio'
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      numero_commessa: machine.numero_commessa || '',
      model_id: machine.model_id || '',
      size_id: machine.size_id || '',
      customer_id: machine.customer_id || '',
      axis_type: machine.axis_type || '',
      control_type: machine.control_type || '',
      serial_number: machine.serial_number || '',
      manufacturing_year: machine.manufacturing_year || '',
      installation_date: machine.installation_date?.split('T')[0] || '',
      warranty_expiry: machine.warranty_expiry?.split('T')[0] || '',
      address: machine.address || '',
      notes: machine.notes || '',
    });
    setEditMode(false);
  };

  // Check if machine data is incomplete
  const isMachineIncomplete = () => {
    return !machine?.model_name || !machine?.customer_name || !machine?.control_type;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || 'Macchina non trovata'}
        </div>
        <Link to="/machines" className="mt-4 inline-flex items-center text-primary-600">
          <ArrowLeft size={18} className="mr-2" />
          Torna alle macchine
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          notification.type === 'warning' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> :
           notification.type === 'warning' ? <AlertCircle size={18} /> :
           <AlertTriangle size={18} />}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Incomplete Machine Warning */}
      {isMachineIncomplete() && !editMode && (
        <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2 bg-orange-50 text-orange-700 border border-orange-200">
          <AlertCircle size={18} />
          <span className="flex-1">Dati macchina incompleti. Clicca "Modifica" per completare le informazioni.</span>
          {isTecnico && (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              Completa dati
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link to="/machines" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <ArrowLeft size={18} />
          Torna alle macchine
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-mono">
              {machine.numero_commessa}
            </h1>
            <p className="text-gray-500">
              {machine.machine_type || 'Tipo non specificato'} {machine.model_name || ''} {machine.size_value && `- ${machine.size_value}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/machines/${id}/monitoring`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Activity size={18} />
              Monitoraggio
            </Link>
            {isTecnico && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-2 border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50"
              >
                <Edit3 size={18} />
                Modifica
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  <X size={18} />
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="loader w-4 h-4 border-2"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salva
                    </>
                  )}
                </button>
              </>
            )}
            <Link
              to={`/issues/new?machine_id=${machine.id}&numero_commessa=${machine.numero_commessa}`}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus size={18} />
              Nuova Problematica
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Technical Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wrench size={20} className="text-primary-600" />
              Dettagli Tecnici
            </h2>

            {editMode ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Numero Commessa</label>
                  <input
                    type="text"
                    value={formData.numero_commessa}
                    onChange={(e) => handleChange('numero_commessa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Modello</label>
                  <select
                    value={formData.model_id}
                    onChange={(e) => handleChange('model_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
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
                  <label className="block text-sm text-gray-500 mb-1">Taglia</label>
                  <select
                    value={formData.size_id}
                    onChange={(e) => handleChange('size_id', e.target.value)}
                    disabled={!formData.model_id || sizes.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
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
                  <label className="block text-sm text-gray-500 mb-1">Assi</label>
                  <AxisTypeSelect
                    value={formData.axis_type}
                    onChange={(v) => handleChange('axis_type', v)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Controllo</label>
                  <select
                    value={formData.control_type}
                    onChange={(e) => handleChange('control_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Seleziona controllo</option>
                    <option value="FANUC">FANUC</option>
                    <option value="SINUMERIK_ONE">SINUMERIK ONE</option>
                    <option value="CSE">CSE</option>
                    <option value="FAGOR">FAGOR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Numero Seriale</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => handleChange('serial_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Anno Produzione</label>
                  <input
                    type="number"
                    value={formData.manufacturing_year}
                    onChange={(e) => handleChange('manufacturing_year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-sm text-gray-500 mb-1">Note</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium">{machine.machine_type || '-'}</p>
                  </div>
                  {machine.category && (
                    <div>
                      <p className="text-sm text-gray-500">Categoria</p>
                      <p className="font-medium">{machine.category}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Modello</p>
                    <p className="font-medium">{machine.model_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taglia</p>
                    <p className="font-medium">{machine.size_value || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assi</p>
                    <p className="font-medium">{machine.axis_type?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Controllo</p>
                    <p className="font-medium">{machine.control_type?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Numero Seriale</p>
                    <p className="font-medium font-mono">{machine.serial_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Anno Produzione</p>
                    <p className="font-medium">{machine.manufacturing_year || '-'}</p>
                  </div>
                </div>
                {machine.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">Note</p>
                    <p className="text-gray-700">{machine.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Issues List */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Problematiche ({issues.length})
            </h2>
            {issues.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nessuna problematica registrata
              </p>
            ) : (
              <div className="space-y-3">
                {issues.map(issue => (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.id}`}
                    className="block p-4 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium status-${issue.status}`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium type-${issue.issue_type}`}>
                            {issue.issue_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium priority-${issue.priority}`}>
                            {issue.priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-800">{issue.title}</h3>
                        {issue.issue_group_name && (
                          <p className="text-sm text-gray-500">{issue.issue_group_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(issue.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                          {issue.created_by_name && ` - ${issue.created_by_name}`}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary-600" />
              Cliente
            </h2>

            {editMode ? (
              <CustomerSelect
                value={formData.customer_id}
                onChange={(v) => handleChange('customer_id', v)}
                customers={customers}
                onCustomerAdded={(updated) => setCustomers(updated)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            ) : machine.customer_name ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-800">{machine.customer_name}</p>
                  <p className="text-sm text-gray-500">{machine.customer_code}</p>
                </div>
                {machine.customer_address && (
                  <div>
                    <p className="text-sm text-gray-700">{machine.customer_address}</p>
                    <p className="text-sm text-gray-500">{machine.customer_city}</p>
                  </div>
                )}
                {machine.customer_phone && (
                  <div>
                    <p className="text-sm text-gray-500">Telefono</p>
                    <p className="text-sm">{machine.customer_phone}</p>
                  </div>
                )}
                {machine.customer_email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a href={`mailto:${machine.customer_email}`} className="text-sm text-primary-600">
                      {machine.customer_email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Cliente non specificato</p>
            )}
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Posizione
            </h2>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Indirizzo</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Via, Città, CAP"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                {machine.address ? (
                  <p className="text-gray-700 text-sm">{machine.address}</p>
                ) : (
                  <p className="text-gray-500 text-sm">Indirizzo non specificato</p>
                )}
                {machine.latitude && machine.longitude && (
                  <Link
                    to={`/map?lat=${machine.latitude}&lng=${machine.longitude}&machine=${machine.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-primary-600 text-sm hover:underline"
                  >
                    Visualizza sulla mappa
                    <ChevronRight size={16} />
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary-600" />
              Date Importanti
            </h2>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Data Installazione</label>
                  <input
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => handleChange('installation_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Scadenza Garanzia</label>
                  <input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => handleChange('warranty_expiry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Installazione</span>
                  <span>
                    {machine.installation_date
                      ? format(new Date(machine.installation_date), 'dd MMM yyyy', { locale: it })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Scad. Garanzia</span>
                  <span className={machine.warranty_expiry && new Date(machine.warranty_expiry) < new Date() ? 'text-red-600' : ''}>
                    {machine.warranty_expiry
                      ? format(new Date(machine.warranty_expiry), 'dd MMM yyyy', { locale: it })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Registrazione</span>
                  <span>{format(new Date(machine.created_at), 'dd MMM yyyy', { locale: it })}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MachineDetail;
