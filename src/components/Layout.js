import { Link, NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon';
import { initials } from '../lib';
import './Layout.css';

const NAV = [
  { label: 'Dashboard', to: '/dashboard', icon: 'grid' },
  { label: 'Mis inmuebles', to: '/inmuebles', icon: 'home' },
  { label: 'Mis clientes', to: '/clientes', icon: 'users' },
  { label: 'Comisiones', to: '/comisiones', icon: 'coins' },
];

export default function Layout({ user, onLogout }) {
  return (
    <div className="c-shell">
      <aside className="c-sidebar">
        <img className="c-sidebar__logo" src="/img/logo.png" alt="Atlantis Bienes Raíces" />
        <nav className="c-sidebar__nav" aria-label="Principal">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="c-sidebar__link">
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="c-sidebar__logout" onClick={onLogout}>
          <Icon name="logout" size={18} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className="c-shell__main">
        <header className="c-topbar">
          <p className="c-topbar__hello">Hola, <strong>{user.name.split(' ')[0]}</strong> 👋</p>
          <Link className="c-topbar__user" to="/perfil" aria-label={`Editar perfil de ${user.name}`}>
            <span className="c-topbar__avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="c-topbar__meta">
              <strong>{user.name}</strong>
              <span>Asesor inmobiliario</span>
            </span>
            <Icon name="edit" size={14} />
          </Link>
        </header>
        <main className="c-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
