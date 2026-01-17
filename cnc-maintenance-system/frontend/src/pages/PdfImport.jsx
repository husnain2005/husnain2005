import React, { useState, useEffect } from 'react';
import { pdfApi, issuesApi } from '../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Upload, FileText, Check, X, AlertTriangle, Eye, Trash2, Edit, Save
} from 'lucide-react';

function PdfImport() {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [editData, setEditData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [importsRes, groupsRes] = await Promise.all([
        pdfApi.getImports(),
        issuesApi.getGroups()
      ]);
      setImports(importsRes.data.imports);
      setGroups(groupsRes.data.groups);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await pdfApi.upload(file);
      setImports([response.data.import, ...imports]);
      setSelectedImport(response.data.import);
      setEditData(response.data.extracted);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il caricamento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSelectImport = async (imp) => {
    setSelectedImport(imp);
    if (imp.extracted_data) {
      const data = typeof imp.extracted_data === 'string'
        ? JSON.parse(imp.extracted_data)
        : imp.extracted_data;
      setEditData(data);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedImport || !editData) return;

    try {
      await pdfApi.confirmImport(selectedImport.id, editData);
      setImports(imports.map(i =>
        i.id === selectedImport.id ? { ...i, status: 'completed' } : i
      ));
      setSelectedImport(null);
      setEditData(null);
      alert('Problematica creata con successo!');
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la conferma');
    }
  };

  const handleDeleteImport = async (id) => {
    if (!confirm('Eliminare questa importazione?')) return;

    try {
      await pdfApi.deleteImport(id);
      setImports(imports.filter(i => i.id !== id));
      if (selectedImport?.id === id) {
        setSelectedImport(null);
        setEditData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">Completato</span>;
      case 'processed':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">Da revisare</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Import da PDF</h1>
        <p className="text-gray-500">Estrai dati da documenti PDF per creare problematiche</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Carica PDF</h2>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                uploading ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
              }`}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="loader"></div>
                    <p className="text-gray-600">Elaborazione in corso...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Clicca o trascina un PDF</p>
                    <p className="text-xs text-gray-400 mt-1">Max 50MB</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Import List */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Importazioni Recenti</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loader"></div>
              </div>
            ) : imports.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessuna importazione</p>
            ) : (
              <div className="space-y-2">
                {imports.map(imp => (
                  <div
                    key={imp.id}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedImport?.id === imp.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    onClick={() => handleSelectImport(imp)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {imp.original_filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(imp.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-2">
          {selectedImport && editData ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Revisione Dati Estratti</h2>
                <div className="flex items-center gap-2">
                  {selectedImport.status !== 'completed' && (
                    <>
                      <button
                        onClick={handleConfirmImport}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Check size={18} />
                        Conferma e Crea
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteImport(selectedImport.id)}
                    className="flex items-center gap-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Numero Commessa</label>
                  <input
                    type="text"
                    value={editData.numero_commessa || ''}
                    onChange={(e) => setEditData({ ...editData, numero_commessa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="es. COM-2024-001"
                  />
                  {editData.confidence?.numero_commessa && (
                    <p className="text-xs text-gray-400 mt-1">
                      Confidenza: {Math.round(editData.confidence.numero_commessa * 100)}%
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Data</label>
                  <input
                    type="text"
                    value={editData.date || ''}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tipo Macchina</label>
                  <select
                    value={editData.machine_type || ''}
                    onChange={(e) => setEditData({ ...editData, machine_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Seleziona</option>
                    <option value="TORNIO">Tornio</option>
                    <option value="FORATRICE">Foratrice</option>
                    <option value="PICO">PICO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Modello</label>
                  <input
                    type="text"
                    value={editData.model || ''}
                    onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="es. GGTRONIC"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cliente</label>
                  <input
                    type="text"
                    value={editData.customer || ''}
                    onChange={(e) => setEditData({ ...editData, customer: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tipo Problema</label>
                  <select
                    value={editData.issue_type || ''}
                    onChange={(e) => setEditData({ ...editData, issue_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Seleziona</option>
                    <option value="ELETTRICO">Elettrico</option>
                    <option value="MECCANICO">Meccanico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gruppo Macchina</label>
                  <select
                    value={editData.issue_group || ''}
                    onChange={(e) => setEditData({ ...editData, issue_group: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Seleziona</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.code}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Titolo</label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Descrizione</label>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {editData.raw_text && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Testo Estratto (anteprima)</h3>
                  <pre className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg overflow-auto max-h-48">
                    {editData.raw_text}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                Carica un PDF o seleziona un'importazione esistente per visualizzare i dati estratti
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PdfImport;
