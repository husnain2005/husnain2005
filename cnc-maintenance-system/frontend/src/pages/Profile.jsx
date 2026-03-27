import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { UserCircle, Lock, Check, Eye, EyeOff, ShieldAlert, ShieldCheck, BookOpen } from 'lucide-react';

const ROLES = {
  admin:   { label: 'Amministratore', color: 'bg-purple-100 text-purple-700', icon: ShieldAlert,  iconColor: 'text-purple-600', desc: 'Accesso completo al sistema, gestione utenti' },
  tecnico: { label: 'Tecnico',        color: 'bg-blue-100 text-blue-700',     icon: ShieldCheck,  iconColor: 'text-blue-600',   desc: 'Crea e modifica interventi, macchine, problematiche' },
  lettura: { label: 'Solo Lettura',   color: 'bg-gray-100 text-gray-600',     icon: BookOpen,     iconColor: 'text-gray-500',   desc: 'Accesso in sola lettura a tutti i dati' },
};

function Profile() {
  const { user } = useAuth();
  const [success, setSuccess] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdError('Le password non coincidono');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError('La nuova password deve essere di almeno 8 caratteri');
      return;
    }
    if (pwdForm.newPassword === pwdForm.currentPassword) {
      setPwdError('La nuova password deve essere diversa da quella attuale');
      return;
    }

    setPwdLoading(true);
    try {
      await usersApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      showSuccess('Password modificata con successo');
      setPwdForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Errore durante il cambio password');
    } finally {
      setPwdLoading(false);
    }
  };

  const role = ROLES[user?.role] || ROLES.lettura;
  const RoleIcon = role.icon;
  const initials = (user?.full_name || user?.username || '?').charAt(0).toUpperCase();
  const avatarColor =
    user?.role === 'admin'   ? 'bg-purple-100 text-purple-600' :
    user?.role === 'tecnico' ? 'bg-blue-100 text-blue-600' :
                               'bg-gray-100 text-gray-600';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <UserCircle size={24} /> Il mio Profilo
      </h1>

      {success && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Scheda profilo */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-5 flex items-center gap-2">
          <UserCircle size={18} /> Informazioni Account
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-800">{user?.full_name || user?.username}</p>
            <p className="text-gray-400 text-sm">@{user?.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">User ID</p>
            <p className="font-mono text-sm bg-gray-50 border rounded px-3 py-2 text-gray-700">{user?.user_id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Email</p>
            <p className="text-sm bg-gray-50 border rounded px-3 py-2 text-gray-700">{user?.email}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400 uppercase font-medium mb-2">Ruolo e Permessi</p>
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${
              user?.role === 'admin'   ? 'bg-purple-50 border-purple-200' :
              user?.role === 'tecnico' ? 'bg-blue-50 border-blue-200' :
                                         'bg-gray-50 border-gray-200'
            }`}>
              <RoleIcon size={20} className={`mt-0.5 flex-shrink-0 ${role.iconColor}`} />
              <div>
                <p className={`text-sm font-semibold ${role.iconColor}`}>{role.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cambio password */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-5 flex items-center gap-2">
          <Lock size={18} /> Cambia Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwdError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {pwdError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Attuale <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                placeholder="Inserisci la password attuale"
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
              <button
                type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuova Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPwd ? 'text' : 'password'} required minLength={8}
              value={pwdForm.newPassword}
              onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              placeholder="Minimo 8 caratteri"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conferma Nuova Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPwd ? 'text' : 'password'} required
              value={pwdForm.confirm}
              onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
              placeholder="Ripeti la nuova password"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm ${
                pwdForm.confirm && pwdForm.confirm !== pwdForm.newPassword ? 'border-red-400' : ''
              }`}
            />
            {pwdForm.confirm && pwdForm.confirm !== pwdForm.newPassword && (
              <p className="text-xs text-red-500 mt-1">Le password non coincidono</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit" disabled={pwdLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {pwdLoading ? 'Salvataggio...' : 'Cambia Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;
