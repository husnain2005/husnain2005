import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interventionsApi } from '../services/api';
import {
  ArrowLeft, Calendar, Clock, User, Wrench, MapPin, Building2,
  FileText, Package, Plus, Trash2, Edit2, CheckCircle, AlertTriangle,
  Upload, Download, Phone, Mail, Save, X
} from 'lucide-react';

const statusColors = {
  programmato: 'bg-blue-100 text-blue-700 border-blue-200',
  in_corso: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completato: 'bg-green-100 text-green-700 border-green-200',
  annullato: 'bg-gray-100 text-gray-700 border-gray-200'
};

const statusLabels = {
  programmato: 'Programmato',
  in_corso: 'In Corso',
  completato: 'Completato',
  annullato: 'Annullato'
};

function InterventionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intervention, setIntervention] = useState(null);
  const [days, setDays] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Form states
  const [showAddDay, setShowAddDay] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const [newDay, setNewDay] = useState({ work_date: '', start_time: '', end_time: '', hours_worked: '', work_description: '' });
  const [newMaterial, setNewMaterial] = useState({ material_name: '', part_number: '', quantity: 1, unit: 'pz', unit_cost: '', notes: '' });
  const [newReport, setNewReport] = useState({ report_date: '', activities_performed: '', problems_encountered: '', solutions_applied: '', pending_tasks: '' });

  useEffect(() => {
    loadIntervention();
  }, [id]);

  const loadIntervention = async () => {
    setLoading(true);
    try {
      const response = await interventionsApi.getById(id);
      setIntervention(response.data.intervention);
      setDays(response.data.days || []);
      setMaterials(response.data.materials || []);
      setDocuments(response.data.documents || []);
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to load intervention:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const handleAddDay = async (e) => {
    e.preventDefault();
    try {
      await interventionsApi.addDay(id, newDay);
      setShowAddDay(false);
      setNewDay({ work_date: '', start_time: '', end_time: '', hours_worked: '', work_description: '' });
      loadIntervention();
    } catch (error) {
      console.error('Failed to add day:', error);
      alert(error.response?.data?.message || 'Errore durante l\'aggiunta');
    }
  };

  const handleDeleteDay = async (dayId) => {
    if (!confirm('Eliminare questa giornata?')) return;
    try {
      await interventionsApi.deleteDay(id, dayId);
      loadIntervention();
    } catch (error) {
      console.error('Failed to delete day:', error);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await interventionsApi.addMaterial(id, newMaterial);
      setShowAddMaterial(false);
      setNewMaterial({ material_name: '', part_number: '', quantity: 1, unit: 'pz', unit_cost: '', notes: '' });
      loadIntervention();
    } catch (error) {
      console.error('Failed to add material:', error);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Eliminare questo materiale?')) return;
    try {
      await interventionsApi.deleteMaterial(id, materialId);
      loadIntervention();
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    try {
      await interventionsApi.addReport(id, newReport);
      setShowAddReport(false);
      setNewReport({ report_date: '', activities_performed: '', problems_encountered: '', solutions_applied: '', pending_tasks: '' });
      loadIntervention();
    } catch (error) {
      console.error('Failed to add report:', error);
    }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await interventionsApi.uploadDocument(id, file);
      loadIntervention();
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert(error.response?.data?.message || 'Errore durante il caricamento');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Eliminare questo documento?')) return;
    try {
      await interventionsApi.deleteDocument(id, docId);
      loadIntervention();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleCompleteIntervention = async () => {
    if (!confirm('Vuoi segnare questo intervento come completato?')) return;
    try {
      await interventionsApi.complete(id, { actual_end_date: new Date().toISOString().split('T')[0] });
      loadIntervention();
    } catch (error) {
      console.error('Failed to complete intervention:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="p-6 text-center text-gray-500">
        Intervento non trovato
      </div>
    );
  }

  const totalHours = days.reduce((sum, d) => sum + (parseFloat(d.hours_worked) || 0), 0);
  const totalMaterialsCost = materials.reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={18} />
          Indietro
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">
                Intervento #{intervention.id}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[intervention.status]}`}>
                {statusLabels[intervention.status]}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              Programmato per {formatDate(intervention.scheduled_date)}
              {intervention.scheduled_end_date && ` - ${formatDate(intervention.scheduled_end_date)}`}
            </p>
          </div>

          <div className="flex gap-2">
            {intervention.status !== 'completato' && (
              <button
                onClick={handleCompleteIntervention}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle size={18} />
                Completa
              </button>
            )}
            <Link
              to={`/interventions/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit2 size={18} />
              Modifica
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-6">
          {['details', 'days', 'materials', 'documents', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'details' && 'Dettagli'}
              {tab === 'days' && `Giornate (${days.length})`}
              {tab === 'materials' && `Materiali (${materials.length})`}
              {tab === 'documents' && `Documenti (${documents.length})`}
              {tab === 'reports' && `Report (${reports.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Machine Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wrench size={20} className="text-primary-600" />
              Macchina
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">N. Commessa</span>
                <Link to={`/machines/${intervention.machine_id}`} className="font-mono text-primary-600 hover:underline">
                  {intervention.numero_commessa}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span>{intervention.machine_type} - {intervention.model_name}</span>
              </div>
              {intervention.size_value && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Taglia</span>
                  <span>{intervention.size_value}</span>
                </div>
              )}
              {intervention.serial_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Seriale</span>
                  <span>{intervention.serial_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary-600" />
              Cliente
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="font-medium">{intervention.customer_name}</span>
              </div>
              {intervention.customer_address && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Indirizzo</span>
                  <span className="text-right">{intervention.customer_address}, {intervention.customer_city}</span>
                </div>
              )}
              {intervention.customer_phone && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Telefono</span>
                  <a href={`tel:${intervention.customer_phone}`} className="flex items-center gap-1 text-primary-600">
                    <Phone size={14} />
                    {intervention.customer_phone}
                  </a>
                </div>
              )}
              {intervention.customer_email && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Email</span>
                  <a href={`mailto:${intervention.customer_email}`} className="flex items-center gap-1 text-primary-600">
                    <Mail size={14} />
                    {intervention.customer_email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-primary-600" />
              Assegnazione
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Tecnico Responsabile</span>
                <span className="font-medium">{intervention.assigned_to_name || 'Non assegnato'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Creato da</span>
                <span>{intervention.created_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data Creazione</span>
                <span>{formatDate(intervention.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-primary-600" />
              Riepilogo
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Giornate Lavorate</span>
                <span className="font-medium">{days.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ore Totali</span>
                <span className="font-medium">{totalHours.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Materiali Usati</span>
                <span className="font-medium">{materials.length}</span>
              </div>
              {totalMaterialsCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo Materiali</span>
                  <span className="font-medium">€ {totalMaterialsCost.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Problem & Description */}
          {(intervention.problem_description || intervention.description) && (
            <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Descrizione Problema</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {intervention.problem_description || intervention.description}
              </p>
            </div>
          )}

          {/* Resolution */}
          {intervention.resolution_summary && (
            <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                Risoluzione
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{intervention.resolution_summary}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'days' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Giornate di Lavoro</h2>
            <button
              onClick={() => setShowAddDay(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={18} />
              Aggiungi Giornata
            </button>
          </div>

          {showAddDay && (
            <form onSubmit={handleAddDay} className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="date"
                  required
                  value={newDay.work_date}
                  onChange={(e) => setNewDay({ ...newDay, work_date: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="time"
                  value={newDay.start_time}
                  onChange={(e) => setNewDay({ ...newDay, start_time: e.target.value })}
                  placeholder="Ora inizio"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="time"
                  value={newDay.end_time}
                  onChange={(e) => setNewDay({ ...newDay, end_time: e.target.value })}
                  placeholder="Ora fine"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  step="0.5"
                  value={newDay.hours_worked}
                  onChange={(e) => setNewDay({ ...newDay, hours_worked: e.target.value })}
                  placeholder="Ore lavorate"
                  className="px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">
                    <Save size={18} />
                  </button>
                  <button type="button" onClick={() => setShowAddDay(false)} className="px-4 py-2 bg-gray-300 rounded-lg">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <textarea
                value={newDay.work_description}
                onChange={(e) => setNewDay({ ...newDay, work_description: e.target.value })}
                placeholder="Descrizione lavori eseguiti..."
                rows={2}
                className="w-full mt-3 px-3 py-2 border rounded-lg"
              />
            </form>
          )}

          {days.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessuna giornata registrata
            </div>
          ) : (
            <div className="divide-y">
              {days.map(day => (
                <div key={day.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{formatDate(day.work_date)}</div>
                      <div className="text-sm text-gray-500">
                        {day.start_time && day.end_time && `${day.start_time} - ${day.end_time} | `}
                        {day.hours_worked && `${day.hours_worked} ore`}
                      </div>
                      {day.work_description && (
                        <p className="mt-2 text-sm text-gray-700">{day.work_description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDay(day.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Materiali Utilizzati</h2>
            <button
              onClick={() => setShowAddMaterial(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={18} />
              Aggiungi Materiale
            </button>
          </div>

          {showAddMaterial && (
            <form onSubmit={handleAddMaterial} className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <input
                  type="text"
                  required
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
                  placeholder="Nome materiale *"
                  className="md:col-span-2 px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  value={newMaterial.part_number}
                  onChange={(e) => setNewMaterial({ ...newMaterial, part_number: e.target.value })}
                  placeholder="Codice articolo"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                  placeholder="Qtà"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newMaterial.unit_cost}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })}
                  placeholder="€ Unitario"
                  className="px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">
                    <Save size={18} />
                  </button>
                  <button type="button" onClick={() => setShowAddMaterial(false)} className="px-4 py-2 bg-gray-300 rounded-lg">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </form>
          )}

          {materials.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              Nessun materiale registrato
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-3">Materiale</th>
                  <th className="px-4 py-3">Codice</th>
                  <th className="px-4 py-3 text-center">Qtà</th>
                  <th className="px-4 py-3 text-right">€ Unit.</th>
                  <th className="px-4 py-3 text-right">€ Tot.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {materials.map(material => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{material.material_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{material.part_number || '-'}</td>
                    <td className="px-4 py-3 text-center">{material.quantity} {material.unit}</td>
                    <td className="px-4 py-3 text-right">{material.unit_cost ? `€ ${material.unit_cost}` : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{material.total_cost ? `€ ${material.total_cost}` : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteMaterial(material.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalMaterialsCost > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-medium">Totale</td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">€ {totalMaterialsCost.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Documenti</h2>
            <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
              <Upload size={18} />
              Carica Documento
              <input
                type="file"
                onChange={handleUploadDocument}
                className="hidden"
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              Nessun documento caricato
            </div>
          ) : (
            <div className="divide-y">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText size={24} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{doc.original_filename}</div>
                      <div className="text-sm text-gray-500">
                        {doc.uploaded_by_name} • {formatDate(doc.created_at)}
                        {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/uploads/${doc.file_path}`}
                      target="_blank"
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Report Giornalieri</h2>
            <button
              onClick={() => setShowAddReport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={18} />
              Nuovo Report
            </button>
          </div>

          {showAddReport && (
            <form onSubmit={handleAddReport} className="p-4 bg-gray-50 border-b space-y-4">
              <input
                type="date"
                required
                value={newReport.report_date}
                onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={newReport.activities_performed}
                onChange={(e) => setNewReport({ ...newReport, activities_performed: e.target.value })}
                placeholder="Attività svolte..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={newReport.problems_encountered}
                onChange={(e) => setNewReport({ ...newReport, problems_encountered: e.target.value })}
                placeholder="Problemi riscontrati..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={newReport.solutions_applied}
                onChange={(e) => setNewReport({ ...newReport, solutions_applied: e.target.value })}
                placeholder="Soluzioni applicate..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <textarea
                value={newReport.pending_tasks}
                onChange={(e) => setNewReport({ ...newReport, pending_tasks: e.target.value })}
                placeholder="Attività in sospeso..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddReport(false)} className="px-4 py-2 border rounded-lg">
                  Annulla
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">
                  Salva Report
                </button>
              </div>
            </form>
          )}

          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessun report registrato
            </div>
          ) : (
            <div className="divide-y">
              {reports.map(report => (
                <div key={report.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-medium text-primary-600">{formatDate(report.report_date)}</div>
                    <div className="text-sm text-gray-500">{report.created_by_name}</div>
                  </div>
                  {report.activities_performed && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">Attività Svolte</div>
                      <p className="text-sm">{report.activities_performed}</p>
                    </div>
                  )}
                  {report.problems_encountered && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">Problemi</div>
                      <p className="text-sm">{report.problems_encountered}</p>
                    </div>
                  )}
                  {report.solutions_applied && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">Soluzioni</div>
                      <p className="text-sm">{report.solutions_applied}</p>
                    </div>
                  )}
                  {report.pending_tasks && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase">In Sospeso</div>
                      <p className="text-sm">{report.pending_tasks}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InterventionDetail;
