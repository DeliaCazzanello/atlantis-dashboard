import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './ActionMenu.css';

// Menú "···" con acciones. Se cierra al elegir, al tocar fuera, con Esc o al desplazar la página.
// La lista va con position: fixed junto al botón para que una tabla con scroll no la recorte, y en un
// portal en <body>: dentro de un padre con transform (la tarjeta al pasar el mouse) el fixed dejaría de ser de la pantalla.
// items: [{ label, icon, onSelect, danger }]; label nombra el elemento para lectores de pantalla.
export default function ActionMenu({ label, items, className = '' }) {
  const [position, setPosition] = useState(null); // null = cerrado
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!position) return undefined;
    const close = () => setPosition(null);
    const onClick = (e) => !ref.current.contains(e.target) && !listRef.current?.contains(e.target) && close();
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);

  function toggle(e) {
    if (position) return setPosition(null);
    const rect = e.currentTarget.getBoundingClientRect();
    // Se abre hacia arriba si no cabe debajo del botón.
    const below = window.innerHeight - rect.bottom > 48 * items.length + 24;
    return setPosition({
      right: window.innerWidth - rect.right,
      ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    });
  }

  return (
    <div className={`c-action-menu ${className}`} ref={ref}>
      <button
        type="button"
        className="c-action-menu__toggle"
        aria-label={`Opciones de ${label}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={toggle}
      >
        <Icon name="dots" size={18} />
      </button>
      {position && createPortal(
        <div className="c-action-menu__list" role="menu" style={position} ref={listRef}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`c-action-menu__item ${item.danger ? 'c-action-menu__item--danger' : ''}`}
              onClick={() => {
                setPosition(null);
                item.onSelect();
              }}
            >
              <Icon name={item.icon} size={15} /> {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
