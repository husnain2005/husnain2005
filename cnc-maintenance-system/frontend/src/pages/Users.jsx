import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Users as UsersIcon, Plus, Edit, X, Check, UserCircle } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'tecnico'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditUser(user);
      setFormData({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        password: '',
        full_name: user.full_name || '',
        role: user.role
      });
    } else {
      setEditUser(null);
      setFormData({
        user_id: '',
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'tecnico'
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editUser) {
        // Update existing user
        await usersApi.update(editUser.id, {
          full_name: formData.full_name,
          role: formData.role
        });
      } else {
        // Create new user
        await usersApi.create(formData);
      }
      await loadUsers();
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-600',
      tecnico: 'bg-blue-100 text-blue-600',
      lettura: 'bg-gray-100 text-gray-600'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || colors.lettura}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestione Utenti</h1>
          <p className="text-gray-500">Amministrazione utenti del sistema</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Nuovo Utente
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="loader"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-medium">Utente</th>
                <th className="px-6 py-3 font-medium">User ID</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Ruolo</th>
                <th className="px-6 py-3 font-medium">Stato</th>
                <th className="px-6 py-3 font-medium">Ultimo Accesso</th>
                <th className="px-6 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {user.full_name?.charAt(0) || user.username.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{user.user_id}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.is_active ? 'Attivo' : 'Disabilitato'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.last_login
                      ? format(new Date(user.last_login), 'dd/MM/yyyy HH:mm', { locale: it })
                      : 'Mai'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-2 rounded ${
                          user.is_active
                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.is_active ? 'Disabilita' : 'Abilita'}
                      >
                        {user.is_active ? <X size={16} /> : <Check size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {!editUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User ID *
                    </label>
                    <input
                      type="text"
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      required
                      placeholder="es. USR011"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="lettura">Lettura</option>
                  <option value="tecnico">Tecnico</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editUser ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
