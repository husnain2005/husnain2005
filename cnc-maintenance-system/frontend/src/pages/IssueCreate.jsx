import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { issuesApi, machinesApi, usersApi } from '../services/api';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

function IssueCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    numero_commessa: searchParams.get('numero_commessa') || '',
    machine_id: searchParams.get('machine_id') || '',
    machine_type_fallback: '',
    model_fallback: '',
    customer_fallback: '',
    issue_group_id: '',
    issue_type: 'MECCANICO',
    title: '',
    description: '',
    priority: 'media',
    assigned_to: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        issuesApi.getGroups(),
        usersApi.getAll().catch(() => ({ data: { users: [] } }))
      ]);
      setGroups(groupsRes.data.groups);
      setUsers(usersRes.data.users?.filter(u => u.role !== 'lettura') || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data
      const data = { ...formData };
      if (!data.machine_id) delete data.machine_id;
      if (!data.issue_group_id) delete data.issue_group_id;
      if (!data.assigned_to) delete data.assigned_to;

      // Remove empty fallbacks
      if (!data.machine_type_fallback) delete data.machine_type_fallback;
      if (!data.model_fallback) delete data.model_fallback;
      if (!data.customer_fallback) delete data.customer_fallback;

      const response = await issuesApi.create(data);
      navigate(`/issues/${response.data.issue.id}`);
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
        <h1 className="text-2xl font-bold text-gray-800">Nuova Problematica</h1>
        <p className="text-gray-500">Registra una nuova problematica o manutenzione</p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Machine Identification */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Identificazione Macchina</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Commessa *
                </label>
                <input
                  type="text"
                  value={formData.numero_commessa}
                  onChange={(e) => handleChange('numero_commessa', e.target.value)}
                  placeholder="es. COM-2024-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se la macchina esiste nel sistema verrà automaticamente collegata
                </p>
              </div>

              <div className="md:col-span-2 text-center text-gray-400 text-sm py-2">
                — oppure se non conosci il numero commessa —
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Macchina
                </label>
                <select
                  value={formData.machine_type_fallback}
                  onChange={(e) => handleChange('machine_type_fallback', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleziona tipo</option>
                  <option value="TORNIO">Tornio</option>
                  <option value="FORATRICE">Foratrice</option>
                  <option value="PICO">PICO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modello
                </label>
                <input
                  type="text"
                  value={formData.model_fallback}
                  onChange={(e) => handleChange('model_fallback', e.target.value)}
                  placeholder="es. GGTRONIC"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={formData.customer_fallback}
                  onChange={(e) => handleChange('customer_fallback', e.target.value)}
                  placeholder="Nome cliente"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Issue Details */}
          <div className="mb-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dettagli Problema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Descrizione breve del problema"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Problema *
                </label>
                <select
                  value={formData.issue_type}
                  onChange={(e) => handleChange('issue_type', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="MECCANICO">Meccanico</option>
                  <option value="ELETTRICO">Elettrico</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gruppo Macchina
                </label>
                <select
                  value={formData.issue_group_id}
                  onChange={(e) => handleChange('issue_group_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleziona gruppo</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priorità
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="bassa">Bassa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assegna a
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => handleChange('assigned_to', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Non assegnato</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione Dettagliata
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={5}
                  placeholder="Descrivi il problema in dettaglio: sintomi, quando si presenta, condizioni operative, ecc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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
                'Crea Problematica'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IssueCreate;
