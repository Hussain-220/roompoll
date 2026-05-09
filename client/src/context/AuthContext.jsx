import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('roompoll_token');
    const storedUser = localStorage.getItem('roompoll_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data);
    setToken(res.data.token);
    localStorage.setItem('roompoll_token', res.data.token);
    localStorage.setItem('roompoll_user', JSON.stringify(res.data));
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser(res.data);
    setToken(res.data.token);
    localStorage.setItem('roompoll_token', res.data.token);
    localStorage.setItem('roompoll_user', JSON.stringify(res.data));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('roompoll_token');
    localStorage.removeItem('roompoll_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
