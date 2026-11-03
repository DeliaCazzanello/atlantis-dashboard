import { useState } from 'react';
import Icon from './Icon';
import './ConfirmDialog.css';

// Contenido de un <Modal size="sm"> para confirmar una acción.
// summary: qué se va a tocar (p. ej. el inmueble con su foto). Sin confirmLabel la acción no está
// permitida: el aviso explica por qué (tono de advertencia) y solo queda "Entendido".
// onConfirm devuelve una promesa; si falla se muestra el error y el diálogo sigue abierto.
export default function ConfirmDialog({ summary, message, confirmLabel, busyLabel, onConfirm, onCancel }) {
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const blocked = !confirmLabel;

  async function confirm() {
    setSending(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.userMessage ?? 'No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.');
      setSending(false);
    }
  }

  return (
    <>
      <div className="c-modal__body c-confirm">
        <div className="c-confirm__summary">{summary}</div>
        <p className={`c-confirm__warning ${blocked ? 'is-blocked' : ''}`}>
          <Icon name="alert" size={18} />
          {message}
        </p>
        {error && <p className="o-error" role="alert">{error}</p>}
      </div>
      <div className="c-modal__foot">
        <button type="button" className="o-btn o-btn--ghost" onClick={onCancel}>{blocked ? 'Entendido' : 'Cancelar'}</button>
        {!blocked && (
          <button type="button" className="o-btn o-btn--danger" onClick={confirm} disabled={sending}>
            {sending ? busyLabel : confirmLabel}
          </button>
        )}
      </div>
    </>
  );
}
