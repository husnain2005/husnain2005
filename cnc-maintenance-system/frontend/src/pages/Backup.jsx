import React, { useState, useEffect, useCallback } from 'react';
import { backupApi } from '../services/api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  DatabaseBackup, Download, Trash2, Plus, Settings,
  Clock, Calendar, RefreshCw, CheckCircle, AlertCircle,
  HardDrive, ToggleLeft, ToggleRight, ChevronDown,
  Upload, RotateCcw, ShieldAlert, X, FileArchive
} from 'lucide-react';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const FREQUENCY_LABELS = {
  daily: 'Ogni giorno',
  weekly: 'Ogni settimana',
  monthly: 'Ogni mese',
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
];

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [flash, setFlash] = useState(null); // { type: 'success'|'error', msg }

  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);

  // Restore state
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [restoreResult, setRestoreResult] = useState(null); // { success, log, backup_date, error }

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const loadBackups = useCallback(async () => {
    try {
      const res = await backupApi.list();
      setBackups(res.data);
    } catch {
      showFlash('error', 'Errore nel caricamento della lista backup');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await backupApi.getSettings();
      setSettings(res.data);
      setLocalSettings(res.data);
    } catch {
      showFlash('error', 'Errore nel caricamento delle impostazioni');
    }
  }, []);

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, [loadBackups, loadSettings]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await backupApi.create();
      showFlash('success', `Backup creato: ${res.data.filename}`);
      loadBackups();
    } catch {
      showFlash('error', 'Errore durante la creazione del backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename) => {
    setDownloadingFile(filename);
    try {
      const res = await backupApi.download(filename);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showFlash('error', 'Errore durante il download');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Eliminare il backup "${filename}"?`)) return;
    setDeletingFile(filename);
    try {
      await backupApi.delete(filename);
      showFlash('success', 'Backup eliminato');
      setBackups((prev) => prev.filter((b) => b.filename !== filename));
    } catch {
      showFlash('error', 'Errore durante l\'eliminazione');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await backupApi.updateSettings(localSettings);
      setSettings(res.data.settings);
      showFlash('success', 'Impostazioni salvate');
    } catch {
      showFlash('error', 'Errore nel salvataggio delle impostazioni');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateLocal = (key, value) =>
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

  const settingsChanged =
    localSettings && settings &&
    JSON.stringify(localSettings) !== JSON.stringify(settings);

  const handleRestoreFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRestoreFile(file);
      setRestoreResult(null);
    }
    e.target.value = '';
  };

  const handleRestoreConfirm = async () => {
    setShowRestoreConfirm(false);
    setRestoring(true);
    setUploadProgress(0);
    setRestoreResult(null);
    try {
      const res = await backupApi.restore(restoreFile, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      setRestoreResult({ success: true, log: res.data.log, backup_date: res.data.backup_date });
      setRestoreFile(null);
      showFlash('success', 'Ripristino completato con successo');
      loadBackups();
    } catch (e) {
      const msg = e.response?.data?.error || 'Errore durante il ripristino';
      setRestoreResult({ success: false, error: msg });
      showFlash('error', msg);
    } finally {
      setRestoring(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DatabaseBackup size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backup</h1>
            <p className="text-sm text-gray-500">
              Esporta tutti i dati del sistema in un file ZIP
            </p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
        >
          {creating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {creating ? 'Creazione...' : 'Crea Backup'}
        </button>
      </div>

      {/* Flash */}
      {flash && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            flash.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {flash.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {flash.msg}
        </div>
      )}

      {/* Auto-backup settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-800">Backup Automatico</span>
            {settings && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  settings.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {settings.enabled ? 'Attivo' : 'Disattivato'}
              </span>
            )}
          </div>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {settingsOpen && localSettings && (
          <div className="border-t border-gray-100 px-5 py-5 space-y-5">
            {/* Abilita/disabilita */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Abilita backup automatico</p>
                <p className="text-xs text-gray-500">
                  Il sistema creerà backup in autonomia secondo la pianificazione
                </p>
              </div>
              <button
                onClick={() => updateLocal('enabled', !localSettings.enabled)}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                {localSettings.enabled ? (
                  <ToggleRight size={36} />
                ) : (
                  <ToggleLeft size={36} className="text-gray-400" />
                )}
              </button>
            </div>

            {localSettings.enabled && (
              <>
                {/* Frequenza */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequenza
                    </label>
                    <select
                      value={localSettings.frequency}
                      onChange={(e) => updateLocal('frequency', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Ogni giorno</option>
                      <option value="weekly">Ogni settimana</option>
                      <option value="monthly">Ogni mese</option>
                    </select>
                  </div>

                  {/* Orario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orario
                    </label>
                    <input
                      type="time"
                      value={localSettings.time}
                      onChange={(e) => updateLocal('time', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Giorno della settimana (solo weekly) */}
                  {localSettings.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giorno della settimana
                      </label>
                      <select
                        value={localSettings.day_of_week}
                        onChange={(e) => updateLocal('day_of_week', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Giorno del mese (solo monthly) */}
                  {localSettings.frequency === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giorno del mese
                      </label>
                      <select
                        value={localSettings.day_of_month}
                        onChange={(e) => updateLocal('day_of_month', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quanti backup conservare */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Backup da conservare
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={localSettings.keep_last}
                      onChange={(e) => updateLocal('keep_last', parseInt(e.target.value) || 10)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      I backup più vecchi verranno eliminati automaticamente
                    </p>
                  </div>
                </div>

                {/* Riepilogo schedule */}
                <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
                  <Clock size={15} />
                  <span>
                    Backup {FREQUENCY_LABELS[localSettings.frequency].toLowerCase()} alle{' '}
                    <strong>{localSettings.time}</strong>
                    {localSettings.frequency === 'weekly' && (
                      <> ogni <strong>{DAYS_OF_WEEK.find(d => d.value === localSettings.day_of_week)?.label}</strong></>
                    )}
                    {localSettings.frequency === 'monthly' && (
                      <> il giorno <strong>{localSettings.day_of_month}</strong> del mese</>
                    )}
                    {' '}— conserva gli ultimi <strong>{localSettings.keep_last}</strong>
                  </span>
                </div>
              </>
            )}

            {/* Salva */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !settingsChanged}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {savingSettings ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {savingSettings ? 'Salvataggio...' : 'Salva impostazioni'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal conferma restore */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50 rounded-t-xl">
              <ShieldAlert size={22} className="text-red-600 shrink-0" />
              <h2 className="text-lg font-bold text-red-700">Conferma Ripristino</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                Stai per sovrascrivere <strong>TUTTI i dati attuali</strong> con il backup:
              </p>
              <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
                <FileArchive size={16} className="text-gray-400" />
                <span className="truncate font-mono">{restoreFile?.name}</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 space-y-1">
                <p className="font-semibold">⚠ Questa operazione è irreversibile:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Tutti i dati correnti verranno cancellati</li>
                  <li>Macchine, clienti, problematiche, interventi, utenti — tutto</li>
                  <li>Tutti i file allegati verranno sostituiti</li>
                  <li>La sessione corrente potrebbe scadere</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                Si consiglia di creare un backup dei dati attuali prima di procedere.
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Ripristina ora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sezione Ripristino */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <RotateCcw size={18} className="text-orange-500" />
          <span className="font-semibold text-gray-800">Ripristina da Backup</span>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Upload area */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              restoreFile ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {restoreFile ? (
              <div className="space-y-2">
                <FileArchive size={28} className="mx-auto text-orange-500" />
                <p className="text-sm font-medium text-gray-800 truncate">{restoreFile.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(restoreFile.size)}</p>
                <button
                  onClick={() => setRestoreFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                >
                  <X size={12} /> Rimuovi
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Trascina un file <strong>.zip</strong> o{' '}
                  <span className="text-blue-600 underline">sfoglia</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Solo file backup generati da questo sistema</p>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={handleRestoreFileSelect}
                />
              </label>
            )}
          </div>

          {/* Barra progresso upload */}
          {restoring && uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Upload in corso...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stato ripristino in corso */}
          {restoring && (uploadProgress === 0 || uploadProgress === 100) && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-4 py-3 rounded-lg">
              <RefreshCw size={16} className="animate-spin shrink-0" />
              Ripristino in corso — non chiudere questa pagina...
            </div>
          )}

          {/* Log risultato */}
          {restoreResult && (
            <div className={`rounded-lg border overflow-hidden ${
              restoreResult.success ? 'border-green-200' : 'border-red-200'
            }`}>
              <div className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
                restoreResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {restoreResult.success
                  ? <><CheckCircle size={15} /> Ripristino completato</>
                  : <><AlertCircle size={15} /> Ripristino fallito</>
                }
              </div>
              {restoreResult.success && restoreResult.log?.length > 0 && (
                <ul className="px-4 py-3 space-y-0.5 max-h-48 overflow-y-auto">
                  {restoreResult.log.map((line, i) => (
                    <li key={i} className="text-xs text-gray-600 font-mono">{line}</li>
                  ))}
                </ul>
              )}
              {!restoreResult.success && (
                <p className="px-4 py-3 text-xs text-red-600">{restoreResult.error}</p>
              )}
            </div>
          )}

          {/* Pulsante avvia ripristino */}
          <button
            onClick={() => setShowRestoreConfirm(true)}
            disabled={!restoreFile || restoring}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            <RotateCcw size={15} />
            Avvia Ripristino
          </button>
        </div>
      </div>

      {/* Lista backup */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-800">Backup Salvati</span>
            {!loadingList && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {backups.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setLoadingList(true); loadBackups(); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title="Aggiorna lista"
          >
            <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingList ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            Caricamento...
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <DatabaseBackup size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessun backup disponibile</p>
            <p className="text-xs mt-1">Clicca "Crea Backup" per iniziare</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {backups.map((b) => (
              <li
                key={b.filename}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-gray-100 rounded-lg shrink-0">
                    <HardDrive size={16} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {b.filename}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {format(parseISO(b.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </span>
                      <span>{formatBytes(b.size)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleDownload(b.filename)}
                    disabled={downloadingFile === b.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-60 transition-colors"
                  >
                    {downloadingFile === b.filename ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    Scarica
                  </button>
                  <button
                    onClick={() => handleDelete(b.filename)}
                    disabled={deletingFile === b.filename}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-60 transition-colors"
                    title="Elimina backup"
                  >
                    {deletingFile === b.filename ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
