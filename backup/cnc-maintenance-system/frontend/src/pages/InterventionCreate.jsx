import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interventionsApi, machinesApi, usersApi, issuesApi } from '../services/api';
import { ArrowLeft, Calendar, Save, AlertTriangle } from 'lucide-react';

function InterventionCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    machine_id: searchParams.get('machine_id') || '',
    issue_id: searchParams.get('issue_id') || '',
    assigned_to: '',
    scheduled_date: '',
    scheduled_end_date: '',
    description: '',
    problem_description: searchParams.get('problem') || '',
    is_billable: true,
    technicians: []
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.machine_id) {
      loadMachineIssues(formData.machine_id);
    }
  }, [formData.machine_id]);

  const loadInitialData = async () => {
    try {
      const [machinesRes, usersRes] = await Promise.all([
        machinesApi.getAll({ limit: 1000 }),
        usersApi.getAll()
      ]);
      setMachines(machinesRes.data.machines || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadMachineIssues = async (machineId) => {
    try {
      const response = await issuesApi.getAll({
        machine_id: machineId,
        status: 'aperta,in_lavorazione',
        limit: 100
      });
      setIssues(response.data.issues || []);
    } catch (err) {
      console.error('Failed to load issues:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechnicianToggle = (userId) => {
    setFormData(prev => {
      const techs = prev.technicians.includes(userId)
        ? prev.technicians.filter(id => id !== userId)
        : [...prev.technicians, userId];
      return { ...prev, technicians: techs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = { ...formData };
      Object.keys(data).forEach(key => {
        if (data[key] === '' || data[key] === null) {
          delete data[key];
        }
      });

      const response = await interventionsApi.create(data);
      navigate(`/interventions/${response.data.intervention.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la creazione');
      setLoading(false);
    }
  };

  const technicians = users.filter(u => u.role === 'tecnico' || u.role === 'admin');

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
        <h1 className="text-2xl font-bold text-gray-800">Nuovo Intervento</h1>
        <p className="text-gray-500">Programma un nuovo intervento tecnico</p>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Machine & Issue */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Macchina e Problematica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Macchina *
                </label>
                <select
                  required
                  value={formData.machine_id}
                  onChange={(e) => handleChange('machine_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleziona macchina</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.numero_commessa} - {machine.customer_name} ({machine.machine_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Problematica Collegata
                </label>
                <select
                  value={formData.issue_id}
                  onChange={(e) => handleChange('issue_id', e.target.value)}
                  disabled={!formData.machine_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                >
                  <option value="">Nessuna (intervento preventivo)</option>
                  {issues.map(issue => (
                    <option key={issue.id} value={issue.id}>
                      #{issue.id} - {issue.title?.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="mb-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              <Calendar className="inline mr-2" size={20} />
              Programmazione
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inizio *
                </label>
                <input
                  type="date"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) => handleChange('scheduled_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fine Prevista
                </label>
                <input
                  type="date"
                  value={formData.scheduled_end_date}
                  onChange={(e) => handleChange('scheduled_end_date', e.target.value)}
                  min={formData.scheduled_date}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="mb-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Assegnazione</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tecnico Responsabile
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Non assegnato</option>
                {technicians.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>

            {technicians.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Tecnici
                </label>
                <div className="flex flex-wrap gap-2">
                  {technicians.map(user => (
                    <label
                      key={user.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                        formData.technicians.includes(user.id)
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.technicians.includes(user.id)}
                        onChange={() => handleTechnicianToggle(user.id)}
                        className="sr-only"
                      />
                      {user.full_name || user.username}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dettagli</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione Problema
              </label>
              <textarea
                value={formData.problem_description}
                onChange={(e) => handleChange('problem_description', e.target.value)}
                rows={3}
                placeholder="Descrivi il problema che deve essere risolto..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Intervento
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Eventuali note o istruzioni per l'intervento..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_billable}
                  onChange={(e) => handleChange('is_billable', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Intervento fatturabile</span>
              </label>
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
                <>
                  <Save size={18} />
                  Crea Intervento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterventionCreate;
