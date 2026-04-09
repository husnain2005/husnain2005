import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check if the user is already authenticated by calling /api/auth/me.
   * The JWT cookie is sent automatically by the browser (withCredentials: true).
   * No localStorage access needed.
   */
  const checkAuth = async () => {
    // Se non c'è il flag di sessione, l'utente ha aperto un nuovo browser
    // sessionStorage viene svuotato alla chiusura del browser (non ripristinato da Chrome)
    if (!sessionStorage.getItem('session_active')) {
      setUser(null);
      setLoading(false);
      if (typeof window.hideSplash === 'function') {
        window.hideSplash();
      }
      return;
    }
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (err) {
      // Token scaduto o non valido
      setUser(null);
      sessionStorage.removeItem('session_active');
    } finally {
      setLoading(false);
      if (typeof window.hideSplash === 'function') {
        window.hideSplash();
      }
    }
  };

  /**
   * Log in the user. The backend sets an HttpOnly JWT cookie and a CSRF cookie
   * automatically in the response. We only need to store the user data in state.
   */
  const login = async (username, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { username, password });
      const { user: userData } = response.data;

      // Segna la sessione attiva (viene cancellato alla chiusura del browser)
      if (userData) {
        sessionStorage.setItem('session_active', '1');
      }

      setUser(userData);
      return true;
    } catch (err) {
      let message;
      if (!err.response) {
        // Errore di rete: server non ancora raggiungibile (tipico all'avvio del PC)
        message = 'Il server non è ancora raggiungibile. Potrebbe essere in avvio — riprova tra qualche secondo.';
      } else {
        message = err.response?.data?.message || 'Errore durante il login';
      }
      setError(message);
      return false;
    }
  };

  /**
   * Log out the user by calling the backend logout endpoint.
   * The backend clears the HttpOnly JWT cookie and the CSRF cookie.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Even if the API call fails, clear local state
      console.error('Logout API call failed:', err);
    } finally {
      sessionStorage.removeItem('session_active');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTecnico: user?.role === 'tecnico' || user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
