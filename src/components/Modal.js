import { useEffect, useRef } from 'react';
import Icon from './Icon';
import './Modal.css';

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';

// Ventana modal accesible: cierra con Esc, con la ✕ o tocando fuera; bloquea el scroll del fondo;
// lleva el foco al primer campo y al cerrar lo devuelve al botón que la abrió.
// El contenido usa .c-modal__body (con scroll) y .c-modal__foot (acciones fijas abajo).
// size: 'md' (formularios) | 'sm' (confirmaciones).
export default function Modal({ title, subtitle, icon, size = 'md', onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // El primer elemento es la ✕; se enfoca el primer campo del contenido.
    const focusables = panel.current.querySelectorAll(FOCUSABLE);
    (focusables[1] ?? focusables[0])?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="c-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`c-modal__panel c-modal__panel--${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="c-modal__head">
          {icon && <span className="c-modal__icon"><Icon name={icon} size={20} /></span>}
          <div className="c-modal__heading">
            <h2 id="modal-title" className="c-modal__title">{title}</h2>
            {subtitle && <p className="c-modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="c-modal__close" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
