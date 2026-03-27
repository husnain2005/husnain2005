import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Users as UsersIcon, Plus, Edit2, X, Check, Key,
  Eye, EyeOff, Search, ShieldAlert, ShieldCheck, BookOpen
} from 'lucide-react';

const ROLES = {
  admin:   { label: 'Amministratore', color: 'bg-purple-100 text-purple-700', desc: 'Accesso completo al sistema, gestione utenti' },
  tecnico: { label: 'Tecnico',        color: 'bg-blue-100 text-blue-700',     desc: 'Crea e modifica interventi, macchine, problematiche' },
  lettura: { label: 'Solo Lettura',   color: 'bg-gray-100 text-gray-600',     desc: 'Accesso in sola lettura a tutti i dati' },
};

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.lettura;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.color}`}>{r.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'password'
  const [targetUser, setTargetUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    user_id: '', username: '', email: '', password: '', full_name: '', role: 'tecnico'
  });
  const [editForm, setEditForm] = useState({ full_name: '', role: 'tecnico', is_active: true });
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirm: '' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await usersApi.getAll();
      setUsers(res.data.users);
    } catch { } finally { setLoading(false); }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const openCreate = () => {
    setCreateForm({ user_id: '', username: '', email: '', password: '', full_name: '', role: 'tecnico' });
    setShowPwd(false); setError(''); setModal('create');
  };

  const openEdit = (u) => {
    setTargetUser(u);
    setEditForm({ full_name: u.full_name || '', role: u.role, is_active: u.is_active });
    setError(''); setModal('edit');
  };

  const openPassword = (u) => {
    setTargetUser(u);
    setPwdForm({ newPassword: '', confirm: '' });
    setShowPwd(false); setError(''); setModal('password');
  };

  const closeModal = () => { setModal(null); setTargetUser(null); setError(''); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await usersApi.create(createForm);
      showSuccess('Utente creato con successo');
      await loadUsers();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante la creazione');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await usersApi.update(targetUser.id, editForm);
      showSuccess('Utente aggiornato con successo');
      await loadUsers();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
    } finally { setSubmitting(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (pwdForm.newPassword !== pwdForm.confirm) { setError('Le password non coincidono'); return; }
    if (pwdForm.newPassword.length < 8) { setError('La password deve essere di almeno 8 caratteri'); return; }
    setSubmitting(true);
    try {
      await usersApi.resetPassword(targetUser.id, pwdForm.newPassword);
      showSuccess(`Password di ${targetUser.username} resettata con successo`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il reset');
    } finally { setSubmitting(false); }
  };

  const toggleStatus = async (u) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      showSuccess(u.is_active ? `${u.username} disabilitato` : `${u.username} riabilitato`);
      await loadUsers();
    } catch { }
  };

  const filtered = users.filter(u =>
    !search || [u.full_name, u.username, u.email, u.user_id]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UsersIcon size={24} /> Gestione Utenti
          </h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} utenti registrati</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus size={18} /> Nuovo Utente
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Legenda ruoli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(ROLES).map(([key, r]) => (
          <div key={key} className={`rounded-lg p-3 border ${
            key === 'admin'   ? 'border-purple-200 bg-purple-50' :
            key === 'tecnico' ? 'border-blue-200 bg-blue-50' :
                                'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {key === 'admin'   ? <ShieldAlert size={15} className="text-purple-600" /> :
               key === 'tecnico' ? <ShieldCheck size={15} className="text-blue-600" /> :
                                   <BookOpen size={15} className="text-gray-500" />}
              <span className="font-medium text-sm">{r.label}</span>
            </div>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Ricerca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome, username, email, user ID..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
        />
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><div className="loader" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 font-medium">Utente</th>
                  <th className="px-6 py-3 font-medium">User ID</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Ruolo</th>
                  <th className="px-6 py-3 font-medium">Stato</th>
                  <th className="px-6 py-3 font-medium">Ultimo Accesso</th>
                  <th className="px-6 py-3 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          u.role === 'admin'   ? 'bg-purple-100 text-purple-600' :
                          u.role === 'tecnico' ? 'bg-blue-100 text-blue-600' :
                                                 'bg-gray-100 text-gray-600'
                        }`}>
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {u.full_name || u.username}
                            {u.id === me?.id && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Tu</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{u.user_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {u.is_active ? 'Attivo' : 'Disabilitato'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {u.last_login
                        ? format(new Date(u.last_login), 'dd/MM/yy HH:mm', { locale: it })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          title="Modifica ruolo e nome"
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => openPassword(u)}
                          title="Reset password"
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                        >
                          <Key size={15} />
                        </button>
                        {u.id !== me?.id && (
                          <button
                            onClick={() => toggleStatus(u)}
                            title={u.is_active ? 'Disabilita accesso' : 'Riabilita accesso'}
                            className={`p-1.5 rounded ${
                              u.is_active
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.is_active ? <X size={15} /> : <Check size={15} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                      Nessun utente trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Crea Utente ── */}
      {modal === 'create' && (
        <Modal title="Nuovo Utente" onClose={closeModal}>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required
                  value={createForm.user_id}
                  onChange={e => setCreateForm({ ...createForm, user_id: e.target.value })}
                  placeholder="USR011"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="mario.rossi"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Mario Rossi"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email" required
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="mario@azienda.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required minLength={8}
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimo 8 caratteri"
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              >
                <option value="lettura">Solo Lettura</option>
                <option value="tecnico">Tecnico</option>
                <option value="admin">Amministratore</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">{ROLES[createForm.role]?.desc}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Annulla
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
                {submitting ? 'Creazione...' : 'Crea Utente'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Modifica Utente ── */}
      {modal === 'edit' && targetUser && (
        <Modal title={`Modifica: ${targetUser.username}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
              <select
                value={editForm.role}
                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                disabled={targetUser.id === me?.id}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="lettura">Solo Lettura</option>
                <option value="tecnico">Tecnico</option>
                <option value="admin">Amministratore</option>
              </select>
              {targetUser.id === me?.id
                ? <p className="text-xs text-amber-600 mt-1">Non puoi cambiare il tuo stesso ruolo</p>
                : <p className="text-xs text-gray-400 mt-1">{ROLES[editForm.role]?.desc}</p>
              }
            </div>
            {targetUser.id !== me?.id && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account attivo</p>
                  <p className="text-xs text-gray-400">
                    {editForm.is_active ? 'L\'utente può accedere al sistema' : 'L\'utente non può accedere'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    editForm.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Annulla
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm">
                {submitting ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Reset Password ── */}
      {modal === 'password' && targetUser && (
        <Modal title={`Reset Password: ${targetUser.username}`} onClose={closeModal}>
          <form onSubmit={handleResetPassword} className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
            )}
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
              Stai resettando la password di <strong>{targetUser.full_name || targetUser.username}</strong>.
              L'utente dovrà usare la nuova password al prossimo accesso.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuova Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required minLength={8}
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  placeholder="Minimo 8 caratteri"
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conferma Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPwd ? 'text' : 'password'} required
                value={pwdForm.confirm}
                onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                placeholder="Ripeti la password"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Annulla
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm">
                {submitting ? 'Reset...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Users;
