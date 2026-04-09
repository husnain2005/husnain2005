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
  Calendar,
  TrendingUp,
  BarChart2,
  Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Colori per i gruppi (cycling)
const GROUP_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700' },
  { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-lime-500', light: 'bg-lime-100', text: 'text-lime-700' },
];

const PRIORITY_CONFIG = {
  critica:  { color: 'bg-red-500',    light: 'bg-red-50',    text: 'text-red-700',    label: 'Critica' },
  alta:     { color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', label: 'Alta' },
  media:    { color: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-700', label: 'Media' },
  bassa:    { color: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700',  label: 'Bassa' },
};

function PercentBar({ percent, colorClass }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${Math.max(percent, 0.5)}%` }}
      />
    </div>
  );
}

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

  const getStatusCount = (status) =>
    parseInt(stats?.statusStats?.find(s => s.status === status)?.count || 0);

  const getTypeCount = (type) =>
    parseInt(stats?.typeStats?.find(t => t.issue_type === type)?.count || 0);

  const totalIssues = parseInt(stats?.totals?.total_issues || 0);

  // Calcola percentuale
  const pct = (count) =>
    totalIssues > 0 ? Math.round((parseInt(count) / totalIssues) * 100) : 0;

  // Trend: valore massimo del mese per scalare le barre
  const maxMonthly = stats?.monthlyTrend?.length
    ? Math.max(...stats.monthlyTrend.map(m => parseInt(m.count)))
    : 1;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Panoramica del sistema di manutenzione CNC</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className="text-xs text-gray-400 mt-1">su {totalIssues} totali</p>
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

      {/* ── Guasti per Gruppo ── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="text-primary-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-800">Guasti per Gruppo</h2>
          <span className="ml-auto text-xs text-gray-400">{totalIssues} problematiche totali</span>
        </div>

        {stats?.groupStats?.length ? (
          <div className="space-y-4">
            {stats.groupStats.map((group, idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
              const count = parseInt(group.count);
              const percent = pct(count);
              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color.bg}`} />
                      <span className="text-sm font-medium text-gray-700">{group.name}</span>
                      {group.code && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${color.light} ${color.text} font-mono`}>
                          {group.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{percent}%</span>
                      <span className="text-sm font-bold text-gray-800 w-6 text-right">{count}</span>
                    </div>
                  </div>
                  <PercentBar percent={percent} colorClass={color.bg} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">Nessun dato disponibile</p>
        )}
      </div>

      {/* ── Stato + Tipo + Priorità ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Stato */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Stato Problematiche</h2>
          <div className="space-y-3">
            {[
              { status: 'aperta',        label: 'Aperte',        color: 'bg-yellow-400' },
              { status: 'in_lavorazione',label: 'In Lavorazione',color: 'bg-blue-400' },
              { status: 'risolta',       label: 'Risolte',       color: 'bg-green-400' },
              { status: 'chiusa',        label: 'Chiuse',        color: 'bg-gray-400' },
            ].map(({ status, label, color }) => {
              const count = getStatusCount(status);
              const percent = pct(count);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{percent}%</span>
                      <span className="text-sm font-bold w-6 text-right">{count}</span>
                    </div>
                  </div>
                  <PercentBar percent={percent} colorClass={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tipo */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Tipo Problematiche</h2>
          <div className="space-y-4">
            {[
              { type: 'ELETTRICO', label: 'Elettriche', icon: Zap, color: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
              { type: 'MECCANICO', label: 'Meccaniche', icon: Cog, color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600' },
            ].map(({ type, label, icon: Icon, color, light, text }) => {
              const count = getTypeCount(type);
              const percent = pct(count);
              return (
                <div key={type} className={`p-4 rounded-lg ${light}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={text} size={18} />
                      <span className={`text-sm font-medium ${text}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{percent}%</span>
                      <span className={`text-xl font-bold ${text}`}>{count}</span>
                    </div>
                  </div>
                  <PercentBar percent={percent} colorClass={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Priorità */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Distribuzione Priorità</h2>
          <div className="space-y-3">
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
              const count = parseInt(stats?.priorityStats?.find(p => p.priority === key)?.count || 0);
              const percent = pct(count);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                      <span className="text-sm text-gray-600">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{percent}%</span>
                      <span className="text-sm font-bold w-6 text-right">{count}</span>
                    </div>
                  </div>
                  <PercentBar percent={percent} colorClass={cfg.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Trend Mensile + Top Macchine ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trend mensile */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="text-primary-600" size={20} />
            <h2 className="text-base font-semibold text-gray-800">Trend Ultimi 12 Mesi</h2>
          </div>
          {stats?.monthlyTrend?.length ? (
            <div className="flex items-end gap-1.5 h-40">
              {stats.monthlyTrend.map((m) => {
                const count = parseInt(m.count);
                const heightPct = maxMonthly > 0 ? (count / maxMonthly) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </span>
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors cursor-default"
                        style={{ height: `${Math.max(heightPct, 3)}%` }}
                        title={`${m.label}: ${count} guasti`}
                      />
                    </div>
                    <span className="text-xs text-gray-400 rotate-[-45deg] origin-top-left translate-y-2 translate-x-1 whitespace-nowrap">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">Nessun dato nel periodo</p>
          )}
        </div>

        {/* Top macchine */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings2 className="text-primary-600" size={20} />
            <h2 className="text-base font-semibold text-gray-800">Top 5 Macchine per Guasti</h2>
          </div>
          {stats?.topMachines?.length ? (
            <div className="space-y-3">
              {stats.topMachines.map((machine, idx) => {
                const count = parseInt(machine.count);
                const maxCount = parseInt(stats.topMachines[0]?.count || 1);
                const widthPct = Math.round((count / maxCount) * 100);
                const medals = ['🥇', '🥈', '🥉', '4°', '5°'];
                return (
                  <div key={`${machine.numero_commessa}-${idx}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm w-6">{medals[idx]}</span>
                        <div>
                          <span className="text-sm font-mono font-semibold text-gray-800">
                            {machine.numero_commessa}
                          </span>
                          {machine.customer_name && machine.customer_name !== '-' && (
                            <span className="text-xs text-gray-400 ml-2">{machine.customer_name}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary-500 transition-all duration-700"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">Nessun dato disponibile</p>
          )}
        </div>
      </div>

      {/* ── Problematiche Recenti ── */}
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

      {/* ── Azioni Rapide ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
