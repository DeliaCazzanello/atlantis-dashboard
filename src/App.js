import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ClientsPage from './pages/ClientsPage';
import CommissionsPage from './pages/CommissionsPage';
import ProfilePage from './pages/ProfilePage';
import { getCachedUser, getSession, logout, onSignOut, rememberUser } from './services/auth';

// auth.js solo devuelve asesores: para este panel una cuenta de cliente no existe.
// Solo oculta pantallas; los permisos reales los aplica la RLS de Supabase.
export default function App() {
  // undefined = aún verificando la sesión guardada; null = sin sesión.
  const [user, setUser] = useState(() => getCachedUser() ?? undefined);

  useEffect(() => {
    getSession().then(
      setUser,
      // Sin conexión no se expulsa a quien ya tenía sesión: sigue con el usuario guardado.
      () => setUser((current) => current ?? null),
    );
    return onSignOut(() => setUser(null));
  }, []);

  // Tras editar el perfil: la barra superior y el usuario guardado usan el nombre nuevo.
  function handleUserChange(next) {
    rememberUser(next);
    setUser(next);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (user === undefined) return <p className="o-muted c-app__loading" role="status">Verificando sesión…</p>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={handleLogout} />}>
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/inmuebles" element={<PropertiesPage user={user} />} />
        <Route path="/inmuebles/:id" element={<PropertyDetailPage user={user} />} />
        <Route path="/clientes" element={<ClientsPage user={user} />} />
        <Route path="/comisiones" element={<CommissionsPage user={user} />} />
        <Route path="/perfil" element={<ProfilePage user={user} onUserChange={handleUserChange} />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
