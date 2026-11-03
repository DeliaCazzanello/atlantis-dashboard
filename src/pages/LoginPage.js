import { useState } from 'react';
import { login } from '../services/auth';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      return onLogin(await login(email, password));
    } catch (err) {
      setError(err.userMessage ?? 'No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.');
    }
    setSending(false);
  }

  return (
    <main className="c-login">
      <section className="c-login__brand" style={{ '--login-photo': 'url(/img/house.jpg)' }}>
        <img className="c-login__logo" src="/img/logo.png" alt="Atlantis Bienes Raíces" />
        <div>
          <h1 className="c-login__headline">Tu cartera, tus cierres y tus comisiones en un solo lugar.</h1>
          <p className="c-login__lead">Panel del asesor · Atlantis Bienes Raíces</p>
        </div>
      </section>

      <section className="c-login__panel">
        <form className="c-login__form" onSubmit={handleSubmit} noValidate>
          <div>
            <h2 className="o-title">Iniciar sesión</h2>
            <p className="o-muted">Ingresa con tu cuenta de asesor.</p>
          </div>
          <div className="o-field">
            <label className="o-field__label" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="o-field__input"
              placeholder="correo@atlantis.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="o-field">
            <label className="o-field__label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="o-field__input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="c-login__error" role="alert">{error}</p>}
          <button type="submit" className="o-btn o-btn--lime" disabled={sending}>
            {sending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
