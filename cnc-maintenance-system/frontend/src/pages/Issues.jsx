import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { issuesApi } from '../services/api';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function Issues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    numero_commessa: searchParams.get('numero_commessa') || '',
    status: searchParams.get('status') || '',
    issue_type: searchParams.get('issue_type') || '',
    priority: searchParams.get('priority') || '',
    issue_group_id: searchParams.get('issue_group_id') || '',
  });

  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const limit = 20;

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadIssues();
    updateSearchParams();
  }, [filters, page]);

  const loadGroups = async () => {
    try {
      const response = await issuesApi.getGroups();
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadIssues = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        limit,
        offset: (page - 1) * limit
      };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await issuesApi.getAll(params);
      setIssues(response.data.issues);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load issues:', error);
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
      status: '',
      issue_type: '',
      priority: '',
      issue_group_id: '',
    });
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Problematiche</h1>
          <p className="text-gray-500">Gestione problematiche e manutenzioni</p>
        </div>
        <Link
          to="/issues/new"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Nuova Problematica
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
                <option value="aperta">Aperta</option>
                <option value="in_lavorazione">In Lavorazione</option>
                <option value="risolta">Risolta</option>
                <option value="chiusa">Chiusa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo</label>
              <select
                value={filters.issue_type}
                onChange={(e) => handleFilterChange('issue_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                <option value="ELETTRICO">Elettrico</option>
                <option value="MECCANICO">Meccanico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Priorità</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutte</option>
                <option value="bassa">Bassa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Critica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Gruppo</label>
              <select
                value={filters.issue_group_id}
                onChange={(e) => handleFilterChange('issue_group_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Tutti</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">
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
        ) : issues.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nessuna problematica trovata
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Titolo</th>
                    <th className="px-6 py-3 font-medium">N. Commessa</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Gruppo</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Stato</th>
                    <th className="px-6 py-3 font-medium">Priorità</th>
                    <th className="px-6 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {issues.map(issue => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/issues/${issue.id}`}
                          className="text-primary-600 hover:underline font-medium flex items-center gap-1"
                        >
                          {issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title}
                          {issue.attachments_count > 0 && (
                            <Paperclip size={14} className="text-gray-400" />
                          )}
                        </Link>
                        <p className="text-xs text-gray-500">{issue.created_by_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        {issue.numero_commessa ? (
                          <Link
                            to={`/machines/${issue.numero_commessa}`}
                            className="font-mono text-sm text-primary-600 hover:underline"
                          >
                            {issue.numero_commessa}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {issue.customer_name || issue.customer_fallback || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {issue.issue_group_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium type-${issue.issue_type}`}>
                          {issue.issue_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${issue.status}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${issue.priority}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(issue.created_at), 'dd/MM/yyyy', { locale: it })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

export default Issues;
