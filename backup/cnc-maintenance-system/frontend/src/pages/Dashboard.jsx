import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { issuesApi } from '../services/api';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  ArrowRight,
  Zap,
  Cog,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await issuesApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = (status) => {
    return stats?.statusStats?.find(s => s.status === status)?.count || 0;
  };

  const getTypeCount = (type) => {
    return stats?.typeStats?.find(t => t.issue_type === type)?.count || 0;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Panoramica del sistema di manutenzione CNC</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Macchine Totali</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats?.totals?.total_machines || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Wrench className="text-primary-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Problematiche Aperte</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats?.totals?.open_issues || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Interventi Programmati</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stats?.totals?.scheduled_interventions || 0}
              </p>
              {stats?.totals?.active_interventions > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  + {stats.totals.active_interventions} in corso
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Clienti</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stats?.totals?.total_customers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Stato Problematiche</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-gray-600">Aperte</span>
              </div>
              <span className="font-semibold">{getStatusCount('aperta')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-gray-600">In Lavorazione</span>
              </div>
              <span className="font-semibold">{getStatusCount('in_lavorazione')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-gray-600">Risolte</span>
              </div>
              <span className="font-semibold">{getStatusCount('risolta')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-600">Chiuse</span>
              </div>
              <span className="font-semibold">{getStatusCount('chiusa')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tipo Problematiche</h2>
          <div className="flex gap-6">
            <div className="flex-1 text-center p-4 bg-purple-50 rounded-lg">
              <Zap className="mx-auto text-purple-600 mb-2" size={32} />
              <p className="text-2xl font-bold text-purple-600">{getTypeCount('ELETTRICO')}</p>
              <p className="text-sm text-gray-600">Elettriche</p>
            </div>
            <div className="flex-1 text-center p-4 bg-amber-50 rounded-lg">
              <Cog className="mx-auto text-amber-600 mb-2" size={32} />
              <p className="text-2xl font-bold text-amber-600">{getTypeCount('MECCANICO')}</p>
              <p className="text-sm text-gray-600">Meccaniche</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Issues */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Problematiche Recenti</h2>
          <Link
            to="/issues"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            Vedi tutte
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Titolo</th>
                <th className="pb-3 font-medium">N. Commessa</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Stato</th>
                <th className="pb-3 font-medium">Priorità</th>
                <th className="pb-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stats?.recentIssues?.map(issue => (
                <tr key={issue.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">
                    <Link
                      to={`/issues/${issue.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {issue.title.length > 40
                        ? issue.title.substring(0, 40) + '...'
                        : issue.title}
                    </Link>
                  </td>
                  <td className="py-3 font-mono text-xs">
                    {issue.numero_commessa || '-'}
                  </td>
                  <td className="py-3">{issue.customer_name || '-'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${issue.status}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${issue.priority}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {format(new Date(issue.created_at), 'dd MMM yyyy', { locale: it })}
                  </td>
                </tr>
              ))}
              {!stats?.recentIssues?.length && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    Nessuna problematica recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/issues/new"
          className="bg-primary-600 text-white p-4 rounded-xl hover:bg-primary-700 transition flex items-center gap-3"
        >
          <AlertTriangle size={24} />
          <span className="font-medium">Nuova Problematica</span>
        </Link>
        <Link
          to="/interventions/new"
          className="bg-white text-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-3"
        >
          <Calendar size={24} className="text-blue-600" />
          <span className="font-medium">Nuovo Intervento</span>
        </Link>
        <Link
          to="/machines"
          className="bg-white text-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-3"
        >
          <Wrench size={24} className="text-primary-600" />
          <span className="font-medium">Cerca Macchina</span>
        </Link>
        <Link
          to="/pdf-import"
          className="bg-white text-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-3"
        >
          <Clock size={24} className="text-primary-600" />
          <span className="font-medium">Importa PDF</span>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
