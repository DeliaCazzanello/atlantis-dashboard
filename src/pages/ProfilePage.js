import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AsyncView from '../components/AsyncView';
import Icon from '../components/Icon';
import useAsync from '../hooks/useAsync';
import { initials } from '../lib';
import { changePassword } from '../services/auth';
import { getMyProfile, requestEmailChange, updateMyProfile } from '../services/users';
import './ProfilePage.css';

// Formularios y reglas de "Editar perfil" de atlantis-web, con el diseño del panel.
const PHONE = /^\+?[\d\s()-]{7,20}$/;
// El WhatsApp del asesor se guarda como enlace para abrir el chat directo (wa.me o whatsapp.com).
const WHATSAPP_LINK = /^https:\/\/(wa\.me|(api\.)?whatsapp\.com)\/\S+$/i;
const MIN_PASSWORD = 6; // mínimo por defecto de Supabase Auth

const DATA_FIELDS = [
  { name: 'name', label: 'Nombre completo', type: 'text', autoComplete: 'name', wide: true },
  { name: 'phone', label: 'Teléfono (opcional)', type: 'tel', autoComplete: 'tel', placeholder: '+58 414 000 0000' },
  { name: 'whatsapp', label: 'Enlace de WhatsApp (opcional)', type: 'url', autoComplete: 'off', placeholder: 'https://wa.me/584140000000' },
  { name: 'email', label: 'Correo electrónico', type: 'email', autoComplete: 'email', wide: true },
];

const PASSWORD_FIELDS = [
  { name: 'current', label: 'Contraseña actual', autoComplete: 'current-password', wide: true },
  { name: 'next', label: 'Nueva contraseña', autoComplete: 'new-password', placeholder: 'Mínimo 6 caracteres' },
  { name: 'confirm', label: 'Repite la nueva contraseña', autoComplete: 'new-password' },
];

// Validación en el navegador solo para avisar rápido; la base y Supabase Auth aplican las reglas reales.
function validateData(form) {
  if (!form.name.trim()) return 'Escribe tu nombre.';
  if (form.phone.trim() && !PHONE.test(form.phone.trim())) return 'Escribe un teléfono válido, por ejemplo +58 414 000 0000.';
  if (form.whatsapp.trim() && !WHATSAPP_LINK.test(form.whatsapp.trim())) return 'Escribe un enlace de WhatsApp válido, por ejemplo https://wa.me/584140000000.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Escribe un correo válido.';
  return '';
}

function validatePassword(form) {
  if (!form.current) return 'Escribe tu contraseña actual.';
  if (form.next.length < MIN_PASSWORD) return `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (form.next !== form.confirm) return 'Las contraseñas nuevas no coinciden.';
  if (form.next === form.current) return 'La nueva contraseña debe ser distinta de la actual.';
  return '';
}

function Fields({ prefix, fields, form, setForm, type }) {
  return (
    <div className="c-profile__grid">
      {fields.map((f) => (
        <div key={f.name} className={`o-field ${f.wide ? 'c-profile__wide' : ''}`}>
          <label className="o-field__label" htmlFor={`${prefix}-${f.name}`}>{f.label}</label>
          <input
            id={`${prefix}-${f.name}`}
            type={type ?? f.type}
            autoComplete={f.autoComplete}
            className="o-field__input"
            placeholder={f.placeholder}
            value={form[f.name]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

// Envía un formulario: valida, guarda y muestra el error si falla. onDone recibe el mensaje de éxito.
function useSubmit(validate, save, onDone) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(e, form) {
    e.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      onDone(await save(form));
    } catch (err) {
      setError(err.userMessage ?? 'No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.');
    }
    setSaving(false);
  }
  return { error, saving, submit };
}

function ProfileForms({ user, profile, onUserChange }) {
  const [current, setCurrent] = useState(profile); // datos guardados: la tarjeta de resumen los muestra
  const [data, setData] = useState({
    name: profile.name,
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    email: profile.email,
  });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [notice, setNotice] = useState('');

  const dataSubmit = useSubmit(validateData, async (form) => {
    // Primero el correo: si ya está en uso, no se guarda nada a medias.
    const emailChanged = form.email.trim().toLowerCase() !== current.email.toLowerCase();
    if (emailChanged) await requestEmailChange(form.email);
    const updated = await updateMyProfile(user.id, form);
    setCurrent(updated);
    onUserChange({ ...user, name: updated.name });
    // Con "Secure email change" (activo por defecto en Supabase) llega un enlace a cada correo.
    return emailChanged
      ? `Tus datos se guardaron. Para cambiar tu correo a ${form.email.trim()}, confirma el enlace que te enviamos a esa dirección y el que llegó a tu correo actual.`
      : 'Tus datos se guardaron.';
  }, setNotice);

  const passwordSubmit = useSubmit(validatePassword, async (form) => {
    // El correo con el que se inicia sesión es el guardado, no el que se esté editando arriba.
    await changePassword(current.email, form.current, form.next);
    setPassword({ current: '', next: '', confirm: '' });
    return 'Tu contraseña se cambió.';
  }, setNotice);

  return (
    <>
      {notice && <p className="o-notice" role="status">{notice}</p>}
      <div className="c-profile">
        <aside className="o-card o-kpi--hero c-profile__summary">
          <span className="c-profile__avatar" aria-hidden="true">{initials(current.name)}</span>
          <h2 className="c-profile__name">{current.name}</h2>
          <p className="c-profile__role">Asesor inmobiliario</p>
          <ul className="c-profile__contact">
            <li><Icon name="mail" size={15} /> {current.email}</li>
            {current.phone && <li><Icon name="phone" size={15} /> {current.phone}</li>}
            {current.whatsapp && (
              <li>
                <Icon name="whatsapp" size={15} />
                <a href={current.whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
              </li>
            )}
          </ul>
        </aside>

        <div className="c-profile__forms">
          <form className="o-card" onSubmit={(e) => dataSubmit.submit(e, data)} noValidate aria-labelledby="profile-data-title">
            <div className="o-card__head">
              <h2 id="profile-data-title" className="o-card__title c-profile__title"><Icon name="users" size={17} /> Datos personales</h2>
            </div>
            <Fields prefix="profile" fields={DATA_FIELDS} form={data} setForm={setData} />
            <p className="c-profile__hint">
              Si cambias tu correo te enviaremos un enlace de confirmación al actual y otro al nuevo. El cambio se aplica
              cuando confirmes ambos; mientras tanto sigues entrando con el actual.
            </p>
            {dataSubmit.error && <p className="o-error" role="alert">{dataSubmit.error}</p>}
            <div className="c-profile__actions">
              <button type="submit" className="o-btn o-btn--lime" disabled={dataSubmit.saving}>
                {dataSubmit.saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <form className="o-card" onSubmit={(e) => passwordSubmit.submit(e, password)} noValidate aria-labelledby="profile-password-title">
            <div className="o-card__head">
              <h2 id="profile-password-title" className="o-card__title c-profile__title"><Icon name="lock" size={17} /> Seguridad</h2>
            </div>
            <Fields prefix="password" fields={PASSWORD_FIELDS} form={password} setForm={setPassword} type="password" />
            {passwordSubmit.error && <p className="o-error" role="alert">{passwordSubmit.error}</p>}
            <div className="c-profile__actions">
              <button type="submit" className="o-btn o-btn--navy" disabled={passwordSubmit.saving}>
                {passwordSubmit.saving ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage({ user, onUserChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAsync(() => getMyProfile(user.id), [user.id]);

  // Vuelve a la pantalla anterior; si se entró directo por la URL, al dashboard.
  const goBack = () => (location.key === 'default' ? navigate('/dashboard') : navigate(-1));

  return (
    <>
      <div className="o-page-head">
        <div>
          <button type="button" className="c-back" onClick={goBack}>
            <Icon name="arrowLeft" size={16} /> Volver
          </button>
          <p className="o-eyebrow">Cuenta</p>
          <h1 className="o-title">Editar perfil</h1>
        </div>
      </div>
      <AsyncView state={profile}>
        {(p) => <ProfileForms user={user} profile={p} onUserChange={onUserChange} />}
      </AsyncView>
    </>
  );
}
