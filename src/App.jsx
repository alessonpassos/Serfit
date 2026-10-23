import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loading } from './components/Ui';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AgentTools from './components/AgentTools';
import { StudentOverview, StudentWorkouts, Membership, Profile } from './pages/Student';
import { TeacherOverview, TeacherStudents } from './pages/Teacher';
import { AdminOverview, AdminUsers, AdminCatalog } from './pages/Admin';
function Guard({ roles, children }) { const { user, loading } = useAuth(); if (loading) return <Loading />; if (!user) return <Navigate to="/entrar" replace />; if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />; return children; }
function Overview() { const { user } = useAuth(); return user.role === 'gerente' ? <AdminOverview /> : user.role === 'professor' ? <TeacherOverview /> : <StudentOverview />; }
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]); return null; }
export default function App() { return <><ScrollToTop /><AgentTools /><Routes><Route path="/" element={<Home />} /><Route path="/entrar" element={<Auth />} /><Route path="/cadastro" element={<Auth signup />} /><Route path="/app" element={<Guard><Dashboard /></Guard>}><Route index element={<Overview />} /><Route path="treinos" element={<Guard roles={['aluno']}><StudentWorkouts /></Guard>} /><Route path="plano" element={<Guard roles={['aluno']}><Membership /></Guard>} /><Route path="alunos" element={<Guard roles={['professor']}><TeacherStudents /></Guard>} /><Route path="usuarios" element={<Guard roles={['gerente']}><AdminUsers /></Guard>} /><Route path="planos" element={<Guard roles={['gerente']}><AdminCatalog type="plans" /></Guard>} /><Route path="modalidades" element={<Guard roles={['gerente']}><AdminCatalog type="modalities" /></Guard>} /><Route path="perfil" element={<Profile />} /><Route path="*" element={<Navigate to="/app" replace />} /></Route><Route path="*" element={<main className="not-found"><span>404</span><h1>Esse caminho ainda não existe.</h1><p>O próximo passo começa na SerFit.</p><Link className="button button-green" to="/">Voltar ao início</Link></main>} /></Routes></>; }
