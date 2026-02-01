import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { machinesApi, customersApi } from '../services/api';
import { Search, Filter, AlertTriangle, MapPin, ChevronLeft, ChevronRight, Plus, AlertCircle } from 'lucide-react';

function Machines() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [machines, setMachines] = useState([]);
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    numero_commessa: searchParams.get('numero_commessa') || '',
    machine_type: searchParams.get('machine_type') || '',
    model_id: searchParams.get('model_id') || '',
    customer_id: searchParams.get('customer_id') || '',
    control_type: searchParams.get('control_type') || '',
  });

  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const limit = 20;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMachines();
    updateSearchParams();
  }, [filters, page]);

  const loadInitialData = async () => {
    try {
      const [modelsRes, customersRes] = await Promise.all([
        machinesApi.getModels(),
        customersApi.getAll()
      ]);
      setModels(modelsRes.data.models);
      setCustomers(customersRes.data.customers);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadMachines = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        limit,
        offset: (page - 1) * limit
      };
      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await machinesApi.getAll(params);
      setMachines(response.data.machines);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load machines:', error);
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
      numero_commessa: '',
      machine_type: '',
      model_id: '',
      customer_id: '',
      control_type: '',
    });
    setPage(1);
  };

  // Check if machine data is incomplete
  const isMachineIncomplete = (machine) => {
    return !machine.model_name || !machine.customer_name || !machine.control_type;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Macchine</h1>
          <p className="text-gray-500">Gestione e ricerca macchine CNC</p>
        </div>
        <Link
          to="/machines/new"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Nuova Macchina
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filters.numero_commessa}
              onChange={(e) => handleFilterChange('numero_commessa', e.target.value)}
              placeholder="Cerca per numero commessa..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo Macchina</label>
              <select
                value={filters.machine_type}
                onChange={(e) => handleFilterChange('machine_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                <option value="TORNIO">Tornio</option>
                <option value="FORATRICE">Foratrice</option>
                <option value="PICO">PICO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Modello</label>
              <select
                value={filters.model_id}
                onChange={(e) => handleFilterChange('model_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.model_name} ({model.machine_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cliente</label>
              <select
                value={filters.customer_id}
                onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Controllo</label>
              <select
                value={filters.control_type}
                onChange={(e) => handleFilterChange('control_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                <option value="FANUC">FANUC</option>
                <option value="SINUMERIK_ONE">SINUMERIK ONE</option>
                <option value="CSE">CSE</option>
                <option value="FAGOR">FAGOR</option>
              </select>
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
        ) : machines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nessuna macchina trovata
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">N. Commessa</th>
                    <th className="px-6 py-3 font-medium">Tipo / Modello</th>
                    <th className="px-6 py-3 font-medium">Taglia</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Controllo</th>
                    <th className="px-6 py-3 font-medium">Assi</th>
                    <th className="px-6 py-3 font-medium">Problemi</th>
                    <th className="px-6 py-3 font-medium">Località</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {machines.map(machine => (
                    <tr key={machine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/machines/${machine.id}`}
                            className="font-mono text-primary-600 hover:underline font-medium"
                          >
                            {machine.numero_commessa}
                          </Link>
                          {isMachineIncomplete(machine) && (
                            <span className="text-orange-500" title="Dati incompleti">
                              <AlertCircle size={16} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="font-medium">{machine.machine_type}</span>
                          {machine.category && (
                            <span className="text-gray-500"> - {machine.category}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{machine.model_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {machine.size_value ? `${machine.size_value}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{machine.customer_name}</div>
                        <div className="text-xs text-gray-500">{machine.customer_city}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {machine.control_type?.replace('_', ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {machine.axis_type?.replace('_', ' ') || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {machine.open_issues_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs">
                            <AlertTriangle size={12} />
                            {machine.open_issues_count}
                          </span>
                        ) : (
                          <span className="text-green-600 text-sm">OK</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {machine.latitude && machine.longitude ? (
                          <Link
                            to={`/map?lat=${machine.latitude}&lng=${machine.longitude}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <MapPin size={18} />
                          </Link>
                        ) : (
                          <span className="text-gray-300">
                            <MapPin size={18} />
                          </span>
                        )}
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
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Pagina {page} di {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default Machines;
