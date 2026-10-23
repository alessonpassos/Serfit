import { createContext, useContext, useEffect, useState } from 'react';
import { request } from '../services/api';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; request('/auth/me').then(u => { if (active) setUser(u); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); const expire = () => setUser(null); window.addEventListener('serfit-session-expired', expire); return () => { active = false; window.removeEventListener('serfit-session-expired', expire); }; }, []);
  const login = async body => { const u = await request('/auth/login', 'POST', body); setUser(u); return u; };
  const register = async body => { const u = await request('/auth/register', 'POST', body); setUser(u); return u; };
  const logout = async () => { await request('/auth/logout', 'POST'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
