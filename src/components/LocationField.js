import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { findLocation, normalizeText, uniqueLocations, ZONES } from '../lib';
import { getLocations } from '../services/advisor';
import './LocationField.css';

const DEFAULTS = ZONES.map((z) => `${z}, Puerto Ordaz`);
const MAX_RESULTS = 6;

// Ubicación del inmueble: buscador con las ubicaciones ya registradas, sin importar tildes ni mayúsculas.
// Si lo escrito equivale a una existente ("las peonias" → "Las Peonías"), al salir del campo se usa esa,
// para que el catálogo no tenga la misma zona escrita de dos formas. También se puede escribir una nueva.
export default function LocationField({ id, value, onChange }) {
  const [used, setUsed] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // opción resaltada con el teclado

  useEffect(() => {
    let alive = true;
    // Si falla, quedan las zonas por defecto: el campo sigue sirviendo para escribir.
    getLocations().then((list) => alive && setUsed(list), () => {});
    return () => {
      alive = false;
    };
  }, []);

  const locations = useMemo(() => uniqueLocations([...used, ...DEFAULTS]), [used]);
  const query = normalizeText(value);
  const matches = locations.filter((l) => normalizeText(l).includes(query)).slice(0, MAX_RESULTS);
  const showList = open && matches.length > 0;

  function choose(text) {
    onChange(text);
    setOpen(false);
    setActive(-1);
  }

  function settle() {
    const same = findLocation(locations, value);
    if (same && same !== value) onChange(same);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!matches.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setOpen(true);
      setActive((i) => (i < 0 ? (step > 0 ? 0 : matches.length - 1) : (i + step + matches.length) % matches.length));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Enter elige o fija la ubicación; no envía el formulario del inmueble
      if (showList && active >= 0) choose(matches[active]);
      else settle();
    } else if (e.key === 'Escape' && showList) {
      e.stopPropagation(); // cierra la lista, no el modal
      setOpen(false);
    }
  }

  return (
    <div className="o-field c-location">
      <label className="o-field__label" htmlFor={id}>Ubicación</label>
      <input
        id={id}
        className="o-field__input"
        placeholder="Alta Vista, Puerto Ordaz"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-activedescendant={showList && active >= 0 ? `${id}-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          settle();
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Ubicaciones registradas" className="c-location__list">
          {matches.map((l, i) => (
            <li
              key={l}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`c-location__option ${i === active ? 'is-active' : ''}`}
              // mousedown + preventDefault: elige sin que el campo pierda el foco antes del clic
              onMouseDown={(e) => {
                e.preventDefault();
                choose(l);
              }}
            >
              <Icon name="pin" size={14} /> {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
