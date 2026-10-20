import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, CreditCard, UserRound, Users, Shapes, LogOut, Menu, X, Globe, ShieldCheck } from 'lucide-react';
import Brand from '../components/Brand';
import { initials, Notice } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../services/api';
const menus = {
  aluno: [{ path: '/app', label: 'Visão geral', icon: LayoutDashboard }, { path: '/app/treinos', label: 'Meus treinos', icon: Dumbbell }, { path: '/app/plano', label: 'Meu plano', icon: CreditCard }],
  professor: [{ path: '/app', label: 'Visão geral', icon: LayoutDashboard }, { path: '/app/alunos', label: 'Meus alunos', icon: Users }],
  gerente: [{ path: '/app', label: 'Visão geral', icon: LayoutDashboard }, { path: '/app/usuarios', label: 'Usuários', icon: Users }, { path: '/app/planos', label: 'Planos', icon: CreditCard }, { path: '/app/modalidades', label: 'Modalidades', icon: Shapes }],
};
export default function Dashboard() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [loggingOut, setLoggingOut] = useState(false); const location = useLocation();
  const links = [...menus[user.role], { path: '/app/perfil', label: 'Meu perfil', icon: UserRound }];
  const title = links.find(l => l.path === location.pathname)?.label || 'Minha área';
  async function signOut() { setLoggingOut(true); try { await logout(); } catch (e) { setError(e.message); } finally { setLoggingOut(false); } }
  return <div className="dashboard-layout"><a className="skip-link" href="#dashboard-main">Pular para o conteúdo</a>{open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar navegação" />}<aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><Link to="/" className="brand-link"><Brand light compact /></Link><button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button></div><span className="sidebar-section">ÁREA DO {user.role.toUpperCase()}</span><nav className="dashboard-nav" aria-label="Navegação da conta">{links.map(({ path, label, icon: Icon }) => <NavLink key={path} end={path === '/app'} to={path} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={20} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><div className="sidebar-motto">SEU RITMO.<br /><span>SUA FORÇA.</span></div><Link to="/" className="sidebar-site"><Globe size={18} /> Voltar ao site</Link><button disabled={loggingOut} onClick={signOut} className="sidebar-logout"><LogOut size={18} />{loggingOut ? 'Saindo...' : 'Sair da conta'}</button></div></aside><div className="dashboard-body"><header className="dashboard-topbar"><div><button className="icon-button dashboard-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button><span className="breadcrumb">SerFit <span>/</span> {title}</span></div><Link to="/app/perfil" className="topbar-user"><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.role}</small></span></Link></header>{isDemo && <div className="dashboard-demo"><ShieldCheck size={16} /><span>Modo demonstração · Os dados e alterações são locais a esta sessão.</span></div>}<main id="dashboard-main" className="dashboard-main"><Notice error>{error}</Notice><Outlet /></main><footer className="dashboard-footer">SerFit · Movimento que transforma.</footer></div></div>;
}
