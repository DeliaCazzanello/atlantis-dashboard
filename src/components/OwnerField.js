import { useEffect, useState } from 'react';
import Icon from './Icon';
import { initials } from '../lib';
import { searchClients } from '../services/clients';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Propietario del inmueble: se busca entre los clientes registrados o se escribe uno nuevo.
// value: { id?, nombre, correo, telefono } o null. Sin id = nuevo; se registra al guardar el inmueble.
export default function OwnerField({ value, onChange }) {
  const [mode, setMode] = useState('search'); // 'search' | 'new'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = aún no se busca
  const [draft, setDraft] = useState({ nombre: '', correo: '', telefono: '' });
  const [error, setError] = useState('');

  // Busca al dejar de escribir; ignora respuestas de búsquedas anteriores.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => {
      searchClients(query).then(
        (list) => active && setResults(list),
        () => active && setResults([]),
      );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Enter en estos campos no debe enviar el formulario del inmueble.
  const noSubmit = (action) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    action?.();
  };

  function applyDraft() {
    if (!draft.nombre.trim()) return setError('Escribe el nombre del propietario.');
    if (!EMAIL.test(draft.correo.trim())) return setError('Escribe un correo válido para el propietario.');
    setError('');
    return onChange({ nombre: draft.nombre.trim(), correo: draft.correo.trim().toLowerCase(), telefono: draft.telefono.trim() });
  }

  if (value) {
    return (
      <div className="c-owner c-owner--selected">
        <span className="o-avatar" aria-hidden="true">{initials(value.nombre)}</span>
        <div className="c-owner__info">
          <p className="o-thumb__title">
            {value.nombre}
            {!value.id && <span className="c-owner__new">Nuevo</span>}
          </p>
          <p className="o-thumb__meta">{value.correo}{value.telefono ? ` · ${value.telefono}` : ''}</p>
        </div>
        <button type="button" className="c-owner__change" onClick={() => onChange(null)}>Cambiar</button>
      </div>
    );
  }

  if (mode === 'new') {
    return (
      <div className="c-owner">
        <div className="c-property-form__grid">
          <div className="o-field c-property-form__wide">
            <label className="o-field__label" htmlFor="owner-nombre">Nombre del propietario</label>
            <input id="owner-nombre" className="o-field__input" autoComplete="off" value={draft.nombre} onKeyDown={noSubmit(applyDraft)} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} />
          </div>
          <div className="o-field">
            <label className="o-field__label" htmlFor="owner-correo">Correo del propietario</label>
            <input id="owner-correo" type="email" className="o-field__input" autoComplete="off" value={draft.correo} onKeyDown={noSubmit(applyDraft)} onChange={(e) => setDraft({ ...draft, correo: e.target.value })} />
          </div>
          <div className="o-field">
            <label className="o-field__label" htmlFor="owner-telefono">Teléfono (opcional)</label>
            <input id="owner-telefono" type="tel" className="o-field__input" autoComplete="off" value={draft.telefono} onKeyDown={noSubmit(applyDraft)} onChange={(e) => setDraft({ ...draft, telefono: e.target.value })} />
          </div>
        </div>
        {error && <p className="o-error" role="alert">{error}</p>}
        <div className="c-owner__actions">
          <button type="button" className="c-owner__link" onClick={() => { setError(''); setMode('search'); }}>
            <Icon name="search" size={14} /> Buscar uno registrado
          </button>
          <button type="button" className="o-btn o-btn--navy c-owner__use" onClick={applyDraft}>Usar este propietario</button>
        </div>
      </div>
    );
  }

  return (
    <div className="c-owner">
      <div className="o-field">
        <label className="o-field__label" htmlFor="owner-buscar">Buscar propietario</label>
        <div className="o-field__control">
          <input
            id="owner-buscar"
            type="search"
            className="o-field__input"
            placeholder="Nombre o correo de un cliente registrado"
            autoComplete="off"
            value={query}
            onKeyDown={noSubmit()}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="o-field__icon"><Icon name="search" size={16} /></span>
        </div>
      </div>

      {results && (
        results.length ? (
          <ul className="c-owner__results" aria-label="Clientes encontrados">
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" className="c-owner__result" onClick={() => onChange(c)}>
                  <span className="o-avatar" aria-hidden="true">{initials(c.nombre)}</span>
                  <span className="c-owner__info">
                    <span className="o-thumb__title">{c.nombre}</span>
                    <span className="o-thumb__meta">{c.correo}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="c-owner__empty">Ningún cliente registrado coincide con "{query.trim()}".</p>
      )}

      <button
        type="button"
        className="c-owner__link"
        onClick={() => {
          // Lo escrito en la búsqueda se aprovecha como nombre o correo del nuevo propietario.
          const text = query.trim();
          setDraft({ ...draft, [text.includes('@') ? 'correo' : 'nombre']: text });
          setMode('new');
        }}
      >
        <Icon name="plus" size={14} /> Registrar nuevo propietario
      </button>
    </div>
  );
}
