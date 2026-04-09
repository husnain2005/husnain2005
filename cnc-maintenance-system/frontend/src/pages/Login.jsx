import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react';

// Polling dello stato del backend tramite /api/csrf-token (già proxiato, no auth richiesta).
// Ritorna true se il backend è raggiungibile, false altrimenti.
async function checkBackendHealth() {
  try {
    const res = await fetch('/api/csrf-token', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function Login() {
  const { login, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stato del server: 'checking' | 'ready' | 'starting'
  const [serverStatus, setServerStatus] = useState('checking');
  const pollInterval = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const healthy = await checkBackendHealth();
      if (cancelled) return;

      if (healthy) {
        setServerStatus('ready');
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      } else {
        setServerStatus('starting');
      }
    };

    // Controllo immediato al mount
    poll();

    // Se non pronto, ricontrolla ogni 3 secondi
    pollInterval.current = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (serverStatus !== 'ready') return;
    setLoading(true);

    const success = await login(username, password);
    if (success) {
      navigate('/');
    }

    setLoading(false);
  };

  const isFormDisabled = loading || serverStatus !== 'ready';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 overflow-hidden bg-primary-100">
            <img src="/icons/logo.webp" alt="GIANA" className="w-full h-full object-cover"
              onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="font-size:2rem;font-weight:900;color:#3b82f6">G</span>'; }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Gestionale Macchine</h1>
          <p className="text-primary-600 font-bold text-lg">GIANA</p>
          <p className="text-gray-500 mt-1 text-sm">Sistema di gestione manutenzioni</p>
        </div>

        {/* Banner stato server */}
        {serverStatus === 'checking' && (
          <div className="mb-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Verifica connessione al server…</span>
          </div>
        )}
        {serverStatus === 'starting' && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Server in avvio, attendere… Il login sarà disponibile a breve.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username o User ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isFormDisabled}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="es. admin o USR001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isFormDisabled}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="loader border-white border-t-transparent"></div>
                <span>Accesso in corso...</span>
              </>
            ) : serverStatus !== 'ready' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Attendere il server…</span>
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <p className="mt-1">
            <strong>admin</strong> / password123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
