import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { emitAuthTokenChanged } from '@/lib/wizard.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    emitAuthTokenChanged();
    setToken(null);
    setUser(null);
  }, []);

  // Store logout in ref so authFetch always has the latest version
  logoutRef.current = logout;

  // Verify token on mount and when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Quick client-side expiry check
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        logout();
        setLoading(false);
        return;
      }
    } catch {
      logout();
      setLoading(false);
      return;
    }

    // Verify with backend
    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Invalid token');
        const data = await res.json();
        if (!cancelled) {
          setUser({ id: data.id, sub: data.username, role: data.role });
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    verify();

    return () => { cancelled = true; };
  }, [token, logout]);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Credenciales inválidas');
    }
    const data = await res.json();
    localStorage.setItem('authToken', data.token);
    emitAuthTokenChanged();
    setToken(data.token);
    // User will be set by the useEffect above after verify
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    const currentToken = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      logoutRef.current();
      throw new Error('Sesión expirada');
    }

    return res;
  }, []);

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    authFetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
