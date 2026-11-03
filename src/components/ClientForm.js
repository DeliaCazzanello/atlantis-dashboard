import { useState } from 'react';
import Icon from './Icon';
import './PropertyForm.css'; // mismas secciones y campos que el formulario de inmuebles

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, editing) {
  if (!form.nombre.trim()) return 'Escribe el nombre del cliente.';
  if (!editing && !EMAIL.test(form.correo.trim())) return 'Escribe un correo válido.';
  if (form.telefono && form.telefono.replace(/\D/g, '').length < 7) return 'Revisa el teléfono.';
  return '';
}

// Registrar (sin initial) o editar un cliente (initial = cliente). Va dentro de <Modal>.
// Al editar, el correo no se cambia: es el de su cuenta y solo el cliente puede cambiarlo.
// onSubmit(values) devuelve una promesa; si falla, el formulario muestra el error y sigue abierto.
export default function ClientForm({ initial, submitLabel = 'Registrar cliente', onSubmit, onCancel }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? '',
    correo: initial?.correo ?? '',
    telefono: initial?.telefono ?? '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate(form, editing);
    setError(problem);
    if (problem) return;
    setSending(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.userMessage ?? 'No se pudo guardar el cliente. Revisa tu conexión e intenta de nuevo.');
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="c-modal__body c-property-form">
        <fieldset className="c-property-form__section">
          <legend className="c-property-form__legend"><Icon name="users" size={15} /> Datos del cliente</legend>
          <div className="c-property-form__grid">
            <div className="o-field c-property-form__wide">
              <label className="o-field__label" htmlFor="client-nombre">Nombre completo</label>
              <input id="client-nombre" className="o-field__input" placeholder="Ana Martínez" autoComplete="off" value={form.nombre} onChange={set('nombre')} />
            </div>
            <div className="o-field">
              <label className="o-field__label" htmlFor="client-correo">Correo electrónico</label>
              <input
                id="client-correo"
                type="email"
                className="o-field__input"
                placeholder="cliente@gmail.com"
                autoComplete="off"
                value={form.correo}
                onChange={set('correo')}
                disabled={editing}
              />
            </div>
            <div className="o-field">
              <label className="o-field__label" htmlFor="client-telefono">Teléfono (opcional)</label>
              <input id="client-telefono" type="tel" className="o-field__input" placeholder="+58 414 000 0000" autoComplete="off" value={form.telefono} onChange={set('telefono')} />
            </div>
          </div>
          <p className="c-property-form__hint">
            {editing
              ? 'El correo identifica al cliente en Atlantis y no se cambia desde aquí.'
              : 'Si ya hay un cliente con este correo, solo se agrega a tu cartera. Cuando cree su cuenta en Atlantis con este correo, verá su perfil.'}
          </p>
        </fieldset>

        {error && <p className="o-error" role="alert">{error}</p>}
      </div>

      <div className="c-modal__foot">
        <button type="button" className="o-btn o-btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="o-btn o-btn--lime" disabled={sending}>
          {sending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
