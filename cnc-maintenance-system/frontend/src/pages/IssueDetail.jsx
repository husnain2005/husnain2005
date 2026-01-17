import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issuesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft, Edit, MessageSquare, Paperclip, Upload, X, Send,
  AlertTriangle, Wrench, Clock, User, Calendar
} from 'lucide-react';

function IssueDetail() {
  const { id } = useParams();
  const { user, isTecnico } = useAuth();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadIssue();
  }, [id]);

  const loadIssue = async () => {
    try {
      const response = await issuesApi.getById(id);
      setIssue(response.data.issue);
      setComments(response.data.comments);
      setAttachments(response.data.attachments);
      setEditData(response.data.issue);
    } catch (err) {
      setError('Problematica non trovata');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await issuesApi.addComment(id, newComment);
      setComments([...comments, response.data.comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const response = await issuesApi.uploadAttachments(id, selectedFiles);
      setAttachments([...response.data.attachments, ...attachments]);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await issuesApi.update(id, editData);
      setIssue({ ...issue, ...editData });
      setEditMode(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        <Link to="/issues" className="mt-4 inline-flex items-center text-primary-600">
          <ArrowLeft size={18} className="mr-2" />
          Torna alle problematiche
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/issues" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <ArrowLeft size={18} />
          Torna alle problematiche
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium status-${issue.status}`}>
                {issue.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium type-${issue.issue_type}`}>
                {issue.issue_type}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium priority-${issue.priority}`}>
                {issue.priority}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{issue.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Creato da {issue.created_by_name} il {format(new Date(issue.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
            </p>
          </div>
          {isTecnico && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Edit size={18} />
              {editMode ? 'Annulla' : 'Modifica'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Mode */}
          {editMode ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Modifica Problematica</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Titolo</label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Descrizione</label>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Stato</label>
                    <select
                      value={editData.status || ''}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="aperta">Aperta</option>
                      <option value="in_lavorazione">In Lavorazione</option>
                      <option value="risolta">Risolta</option>
                      <option value="chiusa">Chiusa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Priorità</label>
                    <select
                      value={editData.priority || ''}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="bassa">Bassa</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Critica</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Note Risoluzione</label>
                  <textarea
                    value={editData.resolution_notes || ''}
                    onChange={(e) => setEditData({ ...editData, resolution_notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Descrizione</h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {issue.description || 'Nessuna descrizione'}
                </p>
                {issue.resolution_notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-800 mb-2">Note Risoluzione</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{issue.resolution_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Attachments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Paperclip size={20} />
              Allegati ({attachments.length})
            </h2>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded-lg overflow-hidden hover:border-primary-500"
                  >
                    {att.mime_type?.startsWith('image/') ? (
                      <img
                        src={`/api/attachments/${att.id}?thumbnail=true`}
                        alt={att.original_filename}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                        <Paperclip size={32} className="text-gray-400" />
                      </div>
                    )}
                    <p className="p-2 text-xs truncate">{att.original_filename}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 mb-4">Nessun allegato</p>
            )}

            {isTecnico && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:border-primary-500 hover:bg-primary-50">
                      <Upload size={18} />
                      <span>Seleziona file</span>
                    </div>
                  </label>
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {uploading ? 'Caricamento...' : `Carica (${selectedFiles.length})`}
                    </button>
                  )}
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs flex items-center gap-1">
                        {file.name}
                        <button onClick={() => setSelectedFiles(files => files.filter((_, idx) => idx !== i))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Commenti ({comments.length})
            </h2>

            <div className="space-y-4 mb-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 text-sm font-medium">
                      {comment.user_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.user_name}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mt-1">{comment.comment}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nessun commento</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Aggiungi un commento..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Machine Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wrench size={20} className="text-primary-600" />
              Macchina
            </h2>
            {issue.machine_numero_commessa || issue.numero_commessa ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Numero Commessa</p>
                  <Link
                    to={`/machines/${issue.machine_numero_commessa || issue.numero_commessa}`}
                    className="font-mono text-primary-600 hover:underline"
                  >
                    {issue.machine_numero_commessa || issue.numero_commessa}
                  </Link>
                </div>
                {issue.machine_type && (
                  <div>
                    <p className="text-sm text-gray-500">Tipo / Modello</p>
                    <p>{issue.machine_type} {issue.model_name}</p>
                  </div>
                )}
                {issue.customer_name && (
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p>{issue.customer_name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {issue.machine_type_fallback && <p>Tipo: {issue.machine_type_fallback}</p>}
                {issue.model_fallback && <p>Modello: {issue.model_fallback}</p>}
                {issue.customer_fallback && <p>Cliente: {issue.customer_fallback}</p>}
              </div>
            )}
          </div>

          {/* Issue Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Dettagli
            </h2>
            <div className="space-y-3 text-sm">
              {issue.issue_group_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Gruppo</span>
                  <span>{issue.issue_group_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span>{issue.issue_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stato</span>
                <span className={`px-2 py-0.5 rounded status-${issue.status} text-xs`}>
                  {issue.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priorità</span>
                <span className={`px-2 py-0.5 rounded priority-${issue.priority} text-xs`}>
                  {issue.priority}
                </span>
              </div>
              {issue.assigned_to_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assegnato a</span>
                  <span>{issue.assigned_to_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-primary-600" />
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creato</span>
                <span>{format(new Date(issue.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aggiornato</span>
                <span>{format(new Date(issue.updated_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              {issue.closed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Chiuso</span>
                  <span>{format(new Date(issue.closed_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueDetail;
