import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { interventionsApi, usersApi } from '../services/api';
import {
  Search, Filter, Plus, Calendar, Clock, User, Wrench,
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, MapPin
} from 'lucide-react';

const statusColors = {
  programmato: 'bg-blue-100 text-blue-700',
  in_corso: 'bg-yellow-100 text-yellow-700',
  completato: 'bg-green-100 text-green-700',
  annullato: 'bg-gray-100 text-gray-700'
};

const statusLabels = {
  programmato: 'Programmato',
  in_corso: 'In Corso',
  completato: 'Completato',
  annullato: 'Annullato'
};

function Interventions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [interventions, setInterventions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    numero_commessa: searchParams.get('numero_commessa') || '',
    from_date: searchParams.get('from_date') || '',
    to_date: searchParams.get('to_date') || ''
  });

  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadInterventions();
    updateSearchParams();
  }, [filters, page]);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadInterventions = async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit, offset: (page - 1) * limit };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await interventionsApi.getAll(params);
      setInterventions(response.data.interventions);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load interventions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (page > 1) params.set('page', page.toString());
    setSearchParams(params);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      assigned_to: '',
      numero_commessa: '',
      from_date: '',
      to_date: ''
    });
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Interventi</h1>
          <p className="text-gray-500">Gestione interventi programmati e completati</p>
        </div>
        <Link
          to="/interventions/new"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Nuovo Intervento
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filters.numero_commessa}
              onChange={(e) => handleFilterChange('numero_commessa', e.target.value)}
              placeholder="Cerca per numero commessa..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              showFilters ? 'bg-primary-50 border-primary-500 text-primary-600' : 'border-gray-300 text-gray-600'
            }`}
          >
            <Filter size={18} />
            Filtri
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Stato</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                <option value="programmato">Programmato</option>
                <option value="in_corso">In Corso</option>
                <option value="completato">Completato</option>
                <option value="annullato">Annullato</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tecnico</label>
              <select
                value={filters.assigned_to}
                onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Da Data</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">A Data</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Pulisci filtri
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="loader"></div>
          </div>
        ) : interventions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            Nessun intervento trovato
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Commessa</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Macchina</th>
                    <th className="px-6 py-3 font-medium">Tecnico</th>
                    <th className="px-6 py-3 font-medium">Stato</th>
                    <th className="px-6 py-3 font-medium">Giorni</th>
                    <th className="px-6 py-3 font-medium">Ore</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {interventions.map(intervention => (
                    <tr key={intervention.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/interventions/${intervention.id}`}
                          className="flex items-center gap-2 text-primary-600 hover:underline"
                        >
                          <Calendar size={16} />
                          {formatDate(intervention.scheduled_date)}
                        </Link>
                        {intervention.scheduled_end_date && intervention.scheduled_end_date !== intervention.scheduled_date && (
                          <div className="text-xs text-gray-500">
                            → {formatDate(intervention.scheduled_end_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/machines/${intervention.machine_id}`}
                          className="font-mono text-sm text-primary-600 hover:underline"
                        >
                          {intervention.numero_commessa}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{intervention.customer_name}</div>
                        <div className="text-xs text-gray-500">{intervention.customer_city}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {intervention.machine_type} - {intervention.model_name}
                        </div>
                        {intervention.size_value && (
                          <div className="text-xs text-gray-500">Taglia: {intervention.size_value}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-sm">{intervention.assigned_to_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[intervention.status]}`}>
                          {intervention.status === 'completato' ? (
                            <CheckCircle size={12} />
                          ) : intervention.status === 'in_corso' ? (
                            <Clock size={12} />
                          ) : (
                            <Calendar size={12} />
                          )}
                          {statusLabels[intervention.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {intervention.total_days || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {intervention.total_hours ? parseFloat(intervention.total_hours).toFixed(1) : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} di {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Pagina {page} di {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Interventions;
