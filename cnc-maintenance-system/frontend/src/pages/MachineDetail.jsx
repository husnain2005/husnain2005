import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { machinesApi } from '../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  Wrench,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Plus,
  ChevronRight
} from 'lucide-react';

function MachineDetail() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMachine();
  }, [id]);

  const loadMachine = async () => {
    try {
      const response = await machinesApi.getById(id);
      setMachine(response.data.machine);
      setIssues(response.data.issues);
    } catch (err) {
      setError('Macchina non trovata');
    } finally {
      setLoading(false);
    }
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
              {machine.machine_type} {machine.model_name} {machine.size_value && `- ${machine.size_value}`}
            </p>
          </div>
          <Link
            to={`/issues/new?machine_id=${machine.id}&numero_commessa=${machine.numero_commessa}`}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            Nuova Problematica
          </Link>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">{machine.machine_type}</p>
              </div>
              {machine.category && (
                <div>
                  <p className="text-sm text-gray-500">Categoria</p>
                  <p className="font-medium">{machine.category}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Modello</p>
                <p className="font-medium">{machine.model_name}</p>
              </div>
              {machine.size_value && (
                <div>
                  <p className="text-sm text-gray-500">Taglia</p>
                  <p className="font-medium">{machine.size_value}</p>
                </div>
              )}
              {machine.axis_type && (
                <div>
                  <p className="text-sm text-gray-500">Assi</p>
                  <p className="font-medium">{machine.axis_type.replace('_', ' ')}</p>
                </div>
              )}
              {machine.control_type && (
                <div>
                  <p className="text-sm text-gray-500">Controllo</p>
                  <p className="font-medium">{machine.control_type.replace('_', ' ')}</p>
                </div>
              )}
              {machine.serial_number && (
                <div>
                  <p className="text-sm text-gray-500">Numero Seriale</p>
                  <p className="font-medium font-mono">{machine.serial_number}</p>
                </div>
              )}
              {machine.manufacturing_year && (
                <div>
                  <p className="text-sm text-gray-500">Anno Produzione</p>
                  <p className="font-medium">{machine.manufacturing_year}</p>
                </div>
              )}
            </div>
            {machine.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Note</p>
                <p className="text-gray-700">{machine.notes}</p>
              </div>
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
          {machine.customer_name && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-primary-600" />
                Cliente
              </h2>
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
            </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Posizione
            </h2>
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
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary-600" />
              Date Importanti
            </h2>
            <div className="space-y-3 text-sm">
              {machine.installation_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Installazione</span>
                  <span>{format(new Date(machine.installation_date), 'dd MMM yyyy', { locale: it })}</span>
                </div>
              )}
              {machine.warranty_expiry && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Scad. Garanzia</span>
                  <span className={new Date(machine.warranty_expiry) < new Date() ? 'text-red-600' : ''}>
                    {format(new Date(machine.warranty_expiry), 'dd MMM yyyy', { locale: it })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Registrazione</span>
                <span>{format(new Date(machine.created_at), 'dd MMM yyyy', { locale: it })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MachineDetail;
